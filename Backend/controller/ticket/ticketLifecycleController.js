/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket lifecycle handlers — status transitions, priority, assignment, CSAT.
// Split out of ticketController.js; CRUD lives in ticketCrudController.js.
const Ticket = require("../../models/Ticket");
const User = require("../../models/User");
const {
  updateStatusSchema,
  updatePrioritySchema,
  assignSchema,
  csatSchema,
} = require("../validation/TicketValidation");
const { AppError } = require("../../middleware/errorMiddleware");
const slaPolicyService = require("../../services/slaPolicyService");
const { isStaff } = require("../../utils/roles");
const { validateOrThrow } = require("../../utils/validation");

const { publicTicket } = require("./ticketSanitizer");
const { notifyCreatorOfStatusChange, notifyAssignment } = require("./ticketNotifications");

const computeSlaDueDate = (priority, fromDate) =>
  slaPolicyService.computeSlaDueDate(priority, fromDate);

// Re-fetch with populated refs so the response carries names/emails
// (the in-memory doc only holds ObjectIds after save).
const fetchPopulatedTicket = (id) =>
  Ticket.findById(id)
    .populate("user", "name email profileImage")
    .populate("assignedTo", "name email profileImage")
    .populate("resolvedBy", "name email")
    .populate("history.by", "name email");

// ---------------------------------------------------------------------
// Update status — uses schema validation, records audit entry, sets SLA fields
// ---------------------------------------------------------------------
const updateTicketStatus = async (req, res, next) => {
  try {
    const value = validateOrThrow(updateStatusSchema, req.body);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const oldStatus = ticket.status;
    if (oldStatus === value.status) {
      throw new AppError(`Ticket is already ${value.status}`, 400);
    }

    ticket.status = value.status;
    if (value.adminNote !== undefined) ticket.adminNote = value.adminNote;

    // First response tracking for SLA
    if (!ticket.firstResponseAt && value.status !== "open") {
      ticket.firstResponseAt = new Date();
    }

    if (value.status === "resolved") {
      ticket.resolvedBy = req.user;
      ticket.endDate = new Date();
      // Mark SLA breached if resolved past due date
      if (ticket.slaDueDate && new Date() > ticket.slaDueDate) {
        ticket.slaBreached = true;
      }
    }

    if (value.status === "open" && oldStatus !== "open") {
      // Reopening a ticket — reset resolution + SLA breach fields and
      // recompute the SLA deadline so the support team has a fresh window.
      ticket.resolvedBy = null;
      ticket.endDate = null;
      ticket.slaBreached = false;
      ticket.slaDueDate = await computeSlaDueDate(ticket.priority);
      ticket.history.push({ action: "reopened", by: req.user, oldValue: oldStatus, newValue: "open" });
    } else {
      ticket.history.push({
        action: "status_changed",
        field: "status",
        oldValue: oldStatus,
        newValue: value.status,
        by: req.user,
        note: value.adminNote || "",
      });
    }

    await ticket.save();

    // Respond FIRST, then fan out notifications (same pattern as createTicket).
    // notificationService.create awaits the email send — with a slow/hanging
    // SMTP server that latency was added to every status-change API response.
    res.status(200).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });

    await notifyCreatorOfStatusChange(ticket, { id: req.user }, value.status);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update priority — admin only
// ---------------------------------------------------------------------
const updateTicketPriority = async (req, res, next) => {
  try {
    const value = validateOrThrow(updatePrioritySchema, req.body);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const oldPriority = ticket.priority;
    if (oldPriority === value.priority) {
      throw new AppError(`Priority is already ${value.priority}`, 400);
    }

    ticket.priority = value.priority;
    ticket.slaDueDate = await computeSlaDueDate(value.priority);
    ticket.history.push({
      action: "priority_changed",
      field: "priority",
      oldValue: oldPriority,
      newValue: value.priority,
      by: req.user,
    });
    await ticket.save();

    res.status(200).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Assign ticket — validates target user exists & is staff (admin OR agent).
// Previously only admins could be assigned, which forced every company to
// make all support staff full admins (way too much power: user management,
// deletions, exports…). Agents now take tickets without admin rights.
// ---------------------------------------------------------------------
const assignTicket = async (req, res, next) => {
  try {
    const value = validateOrThrow(assignSchema, req.body);

    const target = await User.findById(value.assignedTo);
    if (!target) throw new AppError("Target user not found", 404);
    if (!isStaff(target.role)) throw new AppError("Can only assign to admin or agent users", 400);
    if (target.status !== "active") throw new AppError("Target user is suspended", 400);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const oldAssignee = ticket.assignedTo;
    ticket.assignedTo = value.assignedTo;
    // Route to the assignee's team (denormalized for filtering/reporting)
    ticket.team = target.team || "";
    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();

    // Audit values are NAME snapshots (not raw ObjectIds) so the history log
    // reads "assigned to Laila Agent" instead of an unreadable 24-char hex id.
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
    });
    await ticket.save();

    // Re-fetch with populated refs so the response carries names/emails
    // (the in-memory doc only holds ObjectIds after save).
    const populated = await fetchPopulatedTicket(ticket._id);

    // Respond FIRST, then fan out notifications (same pattern as createTicket
    // and updateTicketStatus — notificationService awaits SMTP, and a slow mail
    // server must never add latency to the API response).
    res.status(200).json({ success: true, data: { ticket: publicTicket(populated, req.userRole) } });

    await notifyAssignment(ticket, { id: req.user });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// CSAT — the REQUESTER rates a resolved/closed ticket (once).
// Closes the loop on customer satisfaction: dashboard reports the average.
// ---------------------------------------------------------------------
const rateCsat = async (req, res, next) => {
  try {
    const value = validateOrThrow(csatSchema, req.body);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    // Only the ticket creator can rate THEIR ticket
    if (String(ticket.user) !== String(req.user)) {
      throw new AppError("Only the ticket requester can rate this ticket", 403);
    }
    // Only resolved/closed tickets are rateable
    if (!["resolved", "closed"].includes(ticket.status)) {
      throw new AppError("Ticket must be resolved or closed before rating", 400);
    }
    // One rating per ticket
    if (ticket.csat && ticket.csat.rating) {
      throw new AppError("This ticket has already been rated", 409);
    }

    ticket.csat = {
      rating: value.rating,
      comment: value.comment || "",
      ratedAt: new Date(),
    };
    ticket.history.push({
      action: "csat_rated",
      field: "csat",
      newValue: value.rating,
      by: req.user,
    });
    await ticket.save();

    res.status(200).json({ success: true, data: { csat: ticket.csat } });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateTicketStatus, updateTicketPriority, assignTicket, rateCsat };
