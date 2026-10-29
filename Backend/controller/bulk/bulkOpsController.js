/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Bulk mutation handlers — status, assign, delete (admin only).
// Split out of bulkController.js; read-only exports (CSV/activity feed) live
// in exportController.js.
//
// Bulk writes push audit-history entries (so the audit trail is preserved),
// update SLA fields when status changes, notify recipients, and
// cascade-delete related comments / notifications / on-disk attachment files
// on bulk delete.
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const Ticket = require("../../models/Ticket");
const Comment = require("../../models/Comment");
const Notification = require("../../models/Notification");
const User = require("../../models/User");
const { AppError } = require("../../middleware/errorMiddleware");
const { validateOrThrow } = require("../../utils/validation");
const notificationService = require("../../services/notificationService");
const logger = require("../../utils/logger");
const { isStaff } = require("../../utils/roles");

const { bulkStatusSchema, bulkAssignSchema, bulkDeleteSchema } = require("./bulkSchemas");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// ---------------------------------------------------------------------
// Bulk status update — accepts array of ticket ids and a status.
// For each matched ticket we push an audit-history entry and apply SLA-side
// effects (resolvedBy, endDate, slaBreached on resolve; reset on reopen),
// mirroring the single-ticket updateTicketStatus logic.
// ---------------------------------------------------------------------
const bulkStatus = async (req, res, next) => {
  try {
    const value = validateOrThrow(bulkStatusSchema, req.body);

    const now = new Date();
    const tickets = await Ticket.find({ _id: { $in: value.ids } });
    let modified = 0;
    const notifiedUserIds = new Set();

    for (const ticket of tickets) {
      if (ticket.status === value.status) continue;

      const oldStatus = ticket.status;
      ticket.status = value.status;

      if (!ticket.firstResponseAt && value.status !== "open") {
        ticket.firstResponseAt = now;
      }

      if (value.status === "resolved") {
        ticket.resolvedBy = req.user;
        ticket.endDate = now;
        if (ticket.slaDueDate && now > ticket.slaDueDate) ticket.slaBreached = true;
      } else if (value.status === "open" && oldStatus !== "open") {
        // Reopening — reset resolution/SLA breach fields
        ticket.resolvedBy = null;
        ticket.endDate = null;
        ticket.slaBreached = false;
      }

      const action = value.status === "open" && oldStatus !== "open" ? "reopened" : "status_changed";
      ticket.history.push({
        action,
        field: "status",
        oldValue: oldStatus,
        newValue: value.status,
        by: req.user,
        note: "bulk update",
      });

      await ticket.save();
      modified++;

      // Notify the ticket creator (dedupe so we don't spam the same user across many of their tickets)
      const creatorId = String(ticket.user);
      if (String(ticket.user) !== String(req.user) && !notifiedUserIds.has(creatorId)) {
        notifiedUserIds.add(creatorId);
        notificationService
          .create({
            recipientId: ticket.user,
            senderId: req.user,
            type: "ticket_status_changed",
            title: `${modified} of your tickets → ${value.status}`,
            message: `Bulk status update by admin`,
            ticketId: ticket._id,
            sendEmail: true,
          })
          .catch((e) => logger.warn("Bulk notification failed", { err: e.message }));
      }
    }

    res.status(200).json({
      success: true,
      data: { message: `${modified} tickets updated`, modifiedCount: modified },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Bulk assign — assigns all tickets to a single admin.
// Pushes an audit entry per ticket and notifies the new assignee.
// ---------------------------------------------------------------------
const bulkAssign = async (req, res, next) => {
  try {
    const value = validateOrThrow(bulkAssignSchema, req.body);

    const target = await User.findById(value.assignedTo);
    if (!target) throw new AppError("Target user not found", 404);
    if (!isStaff(target.role)) throw new AppError("Can only assign to admin or agent users", 400);
    if (target.status !== "active") throw new AppError("Target user is suspended", 400);

    const tickets = await Ticket.find({ _id: { $in: value.ids } });
    let modified = 0;
    for (const ticket of tickets) {
      const oldAssignee = ticket.assignedTo;
      if (String(oldAssignee || "") === String(value.assignedTo)) continue;
      ticket.assignedTo = value.assignedTo;
      ticket.team = target.team || "";
      if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
      // Name snapshots (not raw ObjectIds) keep the audit log human-readable
      let oldAssigneeName = null;
      if (oldAssignee) {
        const oldUser = await User.findById(oldAssignee).select("name");
        oldAssigneeName = oldUser ? oldUser.name : String(oldAssignee);
      }
      ticket.history.push({
        action: "assigned",
        field: "assignedTo",
        oldValue: oldAssigneeName,
        newValue: target.name,
        by: req.user,
        note: "bulk assign",
      });
      await ticket.save();
      modified++;
    }

    // Notify the assignee (single notification listing the count)
    if (modified > 0) {
      await notificationService.create({
        recipientId: value.assignedTo,
        senderId: req.user,
        type: "ticket_assigned",
        title: `${modified} tickets assigned to you`,
        message: `Bulk assignment by ${req.userObj?.name || "admin"}`,
      });
    }

    res.status(200).json({
      success: true,
      data: { message: `${modified} tickets assigned`, modifiedCount: modified },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Bulk delete — cascades to Comments, Notifications, and on-disk attachment files.
// Without this cascade, comments become orphaned documents referencing a
// non-existent ticket, and the uploaded files stay on disk forever.
// ---------------------------------------------------------------------
const bulkDelete = async (req, res, next) => {
  try {
    const value = validateOrThrow(bulkDeleteSchema, req.body);

    // Load tickets first so we can clean up attachments on disk
    const tickets = await Ticket.find({ _id: { $in: value.ids } }).select("attachments");

    // Delete on-disk attachment files (best-effort — never block on fs errors)
    await Promise.all(
      tickets.flatMap((t) =>
        (t.attachments || []).map((a) => {
          const filename = path.basename(a.url || "");
          if (!filename) return Promise.resolve();
          return fsp.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
        })
      )
    );

    // Cascade: delete tickets, their comments, and any notifications referencing them
    const [ticketResult, commentResult, notifResult] = await Promise.all([
      Ticket.deleteMany({ _id: { $in: value.ids } }),
      Comment.deleteMany({ ticket: { $in: value.ids } }),
      Notification.deleteMany({ ticket: { $in: value.ids } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        message: `${ticketResult.deletedCount} tickets deleted`,
        deletedCount: ticketResult.deletedCount,
        cascaded: {
          comments: commentResult.deletedCount,
          notifications: notifResult.deletedCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { bulkStatus, bulkAssign, bulkDelete };
