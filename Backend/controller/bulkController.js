// Bulk operations + CSV export — admin only.
// Bulk writes now push audit-history entries (so the audit trail is preserved),
// update SLA fields when status changes, notify recipients, and cascade-delete
// related comments / notifications / on-disk attachment files on bulk delete.
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const Ticket = require("../models/Ticket");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { AppError } = require("../middleware/errorMiddleware");
const { TICKET_STATUSES, TICKET_PRIORITIES } = require("./validation/TicketValidation");
const notificationService = require("../services/notificationService");
const Joi = require("joi");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// ---------------------------------------------------------------------
// Bulk status update — accepts array of ticket ids and a status.
// For each matched ticket we push an audit-history entry and apply SLA-side
// effects (resolvedBy, endDate, slaBreached on resolve; reset on reopen),
// mirroring the single-ticket updateTicketStatus logic.
// ---------------------------------------------------------------------
const bulkStatusSchema = Joi.object({
  ids: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
  status: Joi.string().valid(...TICKET_STATUSES).required(),
});

const bulkStatus = async (req, res, next) => {
  try {
    const { error, value } = bulkStatusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

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
          .catch((e) => console.error("bulk notif failed:", e.message));
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
const bulkAssignSchema = Joi.object({
  ids: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
  assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

const bulkAssign = async (req, res, next) => {
  try {
    const { error, value } = bulkAssignSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const target = await User.findById(value.assignedTo);
    if (!target) throw new AppError("Target user not found", 404);
    if (target.role !== "admin") throw new AppError("Can only assign to admin users", 400);
    if (target.status !== "active") throw new AppError("Target user is suspended", 400);

    const tickets = await Ticket.find({ _id: { $in: value.ids } });
    let modified = 0;
    for (const ticket of tickets) {
      const oldAssignee = ticket.assignedTo;
      if (String(oldAssignee || "") === String(value.assignedTo)) continue;
      ticket.assignedTo = value.assignedTo;
      if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
      ticket.history.push({
        action: "assigned",
        field: "assignedTo",
        oldValue: oldAssignee,
        newValue: value.assignedTo,
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
const bulkDeleteSchema = Joi.object({
  ids: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
});

const bulkDelete = async (req, res, next) => {
  try {
    const { error, value } = bulkDeleteSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

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

// ---------------------------------------------------------------------
// CSV export — returns CSV text for tickets matching filter.
// Adds a UTF-8 BOM so Excel detects the encoding, includes \r in the
// escaping regex for Windows line endings, and caps at 1000 rows.
// ---------------------------------------------------------------------
const escapeCsv = (val) => {
  if (val === null || val === undefined) return "";
  const s = String(val).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};

const exportCsv = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.company) filter.company = req.query.company;

    const tickets = await Ticket.find(filter)
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .limit(1000);

    const headers = [
      "TicketNumber", "Status", "Priority", "Category", "Product", "Company",
      "Employee", "RequesterEmail", "AssignedTo", "CreatedAt", "ResolvedAt", "SLABreached",
    ];
    const rows = tickets.map((t) => [
      t.ticketNumber,
      t.status,
      t.priority,
      t.category,
      t.product,
      t.company,
      t.employee,
      t.user?.email || "",
      t.assignedTo?.email || "",
      t.createdAt?.toISOString() || "",
      t.endDate?.toISOString() || "",
      t.slaBreached ? "yes" : "no",
    ].map(escapeCsv).join(","));

    // BOM (Byte Order Mark) — \uFEFF — so Excel opens UTF-8 correctly
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tickets-${Date.now()}.csv"`);
    res.status(200).send(bom + [headers.join(","), ...rows].join("\r\n"));
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Activity feed — recent activity across the system (admin) or per-user.
// ---------------------------------------------------------------------
const getActivityFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const filter = req.userRole === "admin" ? {} : { user: req.user };
    const tickets = await Ticket.find(filter)
      .populate("user", "name email profileImage")
      .populate("assignedTo", "name email")
      .populate("history.by", "name email")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("ticketNumber product status history user assignedTo updatedAt");

    const activities = [];
    tickets.forEach((t) => {
      (t.history || []).slice(-5).forEach((h) => {
        activities.push({
          ticketId: t._id,
          ticketNumber: t.ticketNumber,
          product: t.product,
          status: t.status,
          action: h.action,
          field: h.field,
          oldValue: h.oldValue,
          newValue: h.newValue,
          note: h.note,
          by: h.by,
          at: h.createdAt,
        });
      });
    });

    activities.sort((a, b) => new Date(b.at) - new Date(a.at));
    res.status(200).json({ success: true, data: { activities: activities.slice(0, limit) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { bulkStatus, bulkAssign, bulkDelete, exportCsv, getActivityFeed };
