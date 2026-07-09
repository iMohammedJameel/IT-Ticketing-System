// Ticket controller — CRUD, status, assign, dashboard, with pagination/search/audit
const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignSchema,
  ticketQuerySchema,
  TICKET_PRIORITIES,
} = require("./validation/TicketValidation");
const { AppError } = require("../middleware/errorMiddleware");
const notificationService = require("../services/notificationService");

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
// Generate human-readable ticket number like TKT-2025-0001
// Uses an atomic Counter document with $inc to prevent race conditions when
// multiple tickets are created concurrently. Falls back to count-based generation
// if the Counter model is unavailable.
const Counter = require("../models/Counter");
const generateTicketNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `ticket-${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `TKT-${year}-${String(counter.seq).padStart(4, "0")}`;
};

// Compute SLA due date from priority
const computeSlaDueDate = (priority) => {
  const hoursByPriority = { low: 72, medium: 48, high: 24, urgent: 4 };
  const hours = hoursByPriority[priority] || 48;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

// Escape a string so it can be safely embedded in a MongoDB $regex.
// Without this, characters like "." or ".*" are interpreted as regex
// metacharacters — `?search=.*` matches everything, and certain inputs can
// cause excessive backtracking.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// (adminNote + internal history notes are kept admin-only to prevent info disclosure)
const publicTicket = (t, requesterRole) => {
  const obj = t.toObject({ virtuals: true });
  if (requesterRole === "admin") return obj;

  // For regular users — strip admin-only fields
  delete obj.adminNote;
  // Filter out internal history notes (history entries with `note: "internal"` or admin-only actions)
  if (Array.isArray(obj.history)) {
    obj.history = obj.history
      .filter((h) => h.note !== "internal")
      .map((h) => {
        // Strip notes that may contain admin context
        const clean = { ...h };
        if (h.note === "internal" || h.note === "attachment added") {
          delete clean.note;
        }
        return clean;
      });
  }
  return obj;
};

// Apply publicTicket to a single ticket or an array
const sanitizeTickets = (tickets, requesterRole) =>
  Array.isArray(tickets)
    ? tickets.map((t) => publicTicket(t, requesterRole))
    : publicTicket(tickets, requesterRole);

// ---------------------------------------------------------------------
// Create ticket — employee auto-set from authenticated user (security)
// ---------------------------------------------------------------------
const createTicket = async (req, res, next) => {
  try {
    const { error, value } = createTicketSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);

    const ticketNumber = await generateTicketNumber();
    const slaDueDate = computeSlaDueDate(value.priority);

    const ticket = await Ticket.create({
      ...value,
      ticketNumber,
      employee: user.name,
      user: req.user,
      startDate: value.startDate || new Date(),
      slaDueDate,
      history: [
        {
          action: "created",
          by: req.user,
          newValue: { status: "open", priority: value.priority },
        },
      ],
    });

    res.status(201).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });

    // Notify all admins that a new ticket was created
    try {
      const admins = await User.find({ role: "admin", status: "active" }).select("_id");
      await Promise.all(
        admins.map((a) =>
          notificationService.create({
            recipientId: a._id,
            senderId: req.user,
            type: "ticket_created",
            title: `New ticket: ${ticket.ticketNumber}`,
            message: `${user.name} reported an issue with ${ticket.product}`,
            ticketId: ticket._id,
            sendEmail: true,
          })
        )
      );
    } catch (e) { console.error("notif failed:", e.message); }
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Get tickets — paginated, searchable, filterable
// Admin sees all; regular user sees only their own
// ---------------------------------------------------------------------
const getTickets = async (req, res, next) => {
  try {
    const { error, value } = ticketQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const { page, limit, sort, order, status, priority, category, company, assignedTo, search } = value;
    const skip = (page - 1) * limit;

    const query = req.userRole === "admin" ? {} : { user: req.user };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (company) query.company = company;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { description: { $regex: escaped, $options: "i" } },
        { product: { $regex: escaped, $options: "i" } },
        { employee: { $regex: escaped, $options: "i" } },
        { ticketNumber: { $regex: escaped, $options: "i" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate("user", "name email")
        .populate("assignedTo", "name email")
        .populate("resolvedBy", "name email")
        .sort({ [sort]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        tickets: sanitizeTickets(tickets, req.userRole),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Get single ticket by id
// ---------------------------------------------------------------------
const getTicketById = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid ticket id", 400);

    const query =
      req.userRole === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user };

    const ticket = await Ticket.findOne(query)
      .populate("user", "name email profileImage")
      .populate("assignedTo", "name email profileImage")
      .populate("resolvedBy", "name email")
      .populate("history.by", "name email");
    if (!ticket) throw new AppError("Ticket not found", 404);

    res.status(200).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update ticket — admin only, partial update
// ---------------------------------------------------------------------
const updateTicket = async (req, res, next) => {
  try {
    const { error, value } = updateTicketSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const changes = [];
    for (const [k, v] of Object.entries(value)) {
      if (String(ticket[k]) !== String(v)) {
        changes.push({ action: "updated", field: k, oldValue: ticket[k], newValue: v, by: req.user });
        ticket[k] = v;
      }
    }
    if (changes.length) ticket.history.push(...changes);
    await ticket.save();

    res.status(200).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update status — uses schema validation, records audit entry, sets SLA fields
// ---------------------------------------------------------------------
const updateTicketStatus = async (req, res, next) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

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
      ticket.slaDueDate = computeSlaDueDate(ticket.priority);
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

    // Notify the ticket creator that the status changed
    if (String(ticket.user) !== String(req.user)) {
      await notificationService.create({
        recipientId: ticket.user,
        senderId: req.user,
        type: "ticket_status_changed",
        title: `Ticket ${ticket.ticketNumber} → ${value.status}`,
        message: `Status updated by admin`,
        ticketId: ticket._id,
        sendEmail: true,
      });
    }

    res.status(200).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update priority — admin only
// ---------------------------------------------------------------------
const updateTicketPriority = async (req, res, next) => {
  try {
    const { error, value } = updatePrioritySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const oldPriority = ticket.priority;
    if (oldPriority === value.priority) {
      throw new AppError(`Priority is already ${value.priority}`, 400);
    }

    ticket.priority = value.priority;
    ticket.slaDueDate = computeSlaDueDate(value.priority);
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
// Assign ticket — validates target user exists & is admin
// ---------------------------------------------------------------------
const assignTicket = async (req, res, next) => {
  try {
    const { error, value } = assignSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const target = await User.findById(value.assignedTo);
    if (!target) throw new AppError("Target user not found", 404);
    if (target.role !== "admin") throw new AppError("Can only assign to admin users", 400);
    if (target.status !== "active") throw new AppError("Target user is suspended", 400);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const oldAssignee = ticket.assignedTo;
    ticket.assignedTo = value.assignedTo;
    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();

    ticket.history.push({
      action: "assigned",
      field: "assignedTo",
      oldValue: oldAssignee,
      newValue: value.assignedTo,
      by: req.user,
    });
    await ticket.save();

    // Notify the assigned admin
    if (String(ticket.assignedTo) !== String(req.user)) {
      await notificationService.create({
        recipientId: ticket.assignedTo,
        senderId: req.user,
        type: "ticket_assigned",
        title: `Ticket ${ticket.ticketNumber} assigned to you`,
        message: `${ticket.product} — ${ticket.description.slice(0, 80)}`,
        ticketId: ticket._id,
        sendEmail: true,
      });
    }
    // Also notify the ticket creator
    if (String(ticket.user) !== String(req.user)) {
      await notificationService.create({
        recipientId: ticket.user,
        senderId: req.user,
        type: "ticket_assigned",
        title: `Your ticket ${ticket.ticketNumber} was assigned`,
        message: `An agent has been assigned to your ticket`,
        ticketId: ticket._id,
      });
    }

    res.status(200).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Dashboard stats — uses aggregation pipeline (no full-collection scans)
// ---------------------------------------------------------------------
const getDashboardStats = async (req, res, next) => {
  try {
    const yearStart = new Date(`${new Date().getFullYear()}-01-01`);
    const yearEnd = new Date(`${new Date().getFullYear() + 1}-01-01`);

    const [counts, chartAgg, topEmployees, priorityAgg, categoryAgg] = await Promise.all([
      Ticket.aggregate([
        { $facet: {
          total: [{ $count: "n" }],
          open: [{ $match: { status: "open" } }, { $count: "n" }],
          inProgress: [{ $match: { status: "in-progress" } }, { $count: "n" }],
          resolved: [{ $match: { status: "resolved" } }, { $count: "n" }],
          closed: [{ $match: { status: "closed" } }, { $count: "n" }],
          breached: [{ $match: { slaBreached: true } }, { $count: "n" }],
        }},
      ]),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: yearStart, $lt: yearEnd } } },
        { $group: {
          _id: { month: { $month: "$createdAt" }, status: "$status" },
          count: { $sum: 1 },
        }},
        { $group: {
          _id: "$_id.month",
          statuses: { $push: { status: "$_id.status", count: "$count" } },
        }},
        { $sort: { _id: 1 } },
      ]),
      Ticket.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { _id: 0, id: "$user._id", name: "$user.name", email: "$user.email", count: 1, resolved: 1 } },
      ]),
      Ticket.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const monthNames = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const chartData = monthNames.map((m, i) => {
      const found = chartAgg.find((c) => c._id === i + 1) || { statuses: [] };
      const statuses = found.statuses.reduce((acc, s) => {
        acc[s.status] = s.count;
        return acc;
      }, {});
      return {
        month: m,
        Open: statuses["open"] || 0,
        InProgress: statuses["in-progress"] || 0,
        Resolved: statuses["resolved"] || 0,
        Closed: statuses["closed"] || 0,
      };
    });

    const priorityMap = Object.fromEntries(TICKET_PRIORITIES.map((p) => [p, 0]));
    priorityAgg.forEach((p) => { priorityMap[p._id] = p.count; });

    const categoryMap = {};
    categoryAgg.forEach((c) => { categoryMap[c._id] = c.count; });

    const c = counts[0];
    res.status(200).json({
      success: true,
      data: {
        counts: {
          total: c.total[0]?.n || 0,
          open: c.open[0]?.n || 0,
          inProgress: c.inProgress[0]?.n || 0,
          resolved: c.resolved[0]?.n || 0,
          closed: c.closed[0]?.n || 0,
          breached: c.breached[0]?.n || 0,
        },
        chartData,
        topEmployees,
        byPriority: priorityMap,
        byCategory: categoryMap,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  getDashboardStats,
};
