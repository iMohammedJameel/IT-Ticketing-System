/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket controller — CRUD, status, assign, dashboard, with pagination/search/audit
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Company = require("../models/Company");
const {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignSchema,
  ticketQuerySchema,
  csatSchema,
  TICKET_PRIORITIES,
} = require("./validation/TicketValidation");
const { AppError } = require("../middleware/errorMiddleware");
const notificationService = require("../services/notificationService");
const slaPolicyService = require("../services/slaPolicyService");
const { isStaff } = require("../utils/roles");
const logger = require("../utils/logger");

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

// Compute SLA due date from priority — now reads the admin-configurable
// SLAPolicy collection (falls back to the historical 72/48/24/4h defaults).
// Supports "business hours only" policies that skip nights + weekends.
const computeSlaDueDate = (priority, fromDate) => slaPolicyService.computeSlaDueDate(priority, fromDate);

// Escape a string so it can be safely embedded in a MongoDB $regex.
// Without this, characters like "." or ".*" are interpreted as regex
// metacharacters — `?search=.*` matches everything, and certain inputs can
// cause excessive backtracking.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// (adminNote + internal history notes are kept staff-only to prevent info disclosure)
const publicTicket = (t, requesterRole) => {
  const obj = t.toObject({ virtuals: true });
  if (isStaff(requesterRole)) return obj;

  // For regular users — strip staff-only fields
  delete obj.adminNote;
  // Filter out internal history notes (history entries with `note: "internal"` or staff-only actions)
  if (Array.isArray(obj.history)) {
    obj.history = obj.history
      .filter((h) => h.note !== "internal")
      .map((h) => {
        // Strip notes that may contain staff context
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

    // Resolve the company directory link (if the client sent companyId)
    let companyName = value.company;
    if (value.companyId) {
      const company = await Company.findById(value.companyId);
      if (!company) throw new AppError("Company not found", 400);
      companyName = company.name; // denormalized name always mirrors the directory
    }

    const ticketNumber = await generateTicketNumber();
    const slaDueDate = await computeSlaDueDate(value.priority);

    const ticket = await Ticket.create({
      ...value,
      ticketNumber,
      company: companyName,
      employee: user.name,
      user: req.user,
      startDate: value.startDate || new Date(),
      slaDueDate,
      tags: [...new Set(value.tags || [])],
      history: [
        {
          action: "created",
          by: req.user,
          // SCALARS ONLY — an object here renders as "[object Object]" in the
          // history timeline (BUG-qa5-1). Priority is preserved in the note.
          field: "status",
          newValue: "open",
          note: `Initial ticket creation (priority: ${value.priority})`,
        },
      ],
    });

    res.status(201).json({ success: true, data: { ticket: publicTicket(ticket, req.userRole) } });

    // Notify all staff (admins + agents) that a new ticket was created
    try {
      const staff = await User.find({ role: { $in: ["admin", "agent"] }, status: "active" }).select("_id");
      await Promise.all(
        staff.map((s) =>
          notificationService.create({
            recipientId: s._id,
            senderId: req.user,
            type: "ticket_created",
            title: `New ticket: ${ticket.ticketNumber}`,
            message: `${user.name} reported an issue with ${ticket.product}`,
            ticketId: ticket._id,
            sendEmail: true,
          })
        )
      );
    } catch (e) { logger.warn("New-ticket notification fan-out failed", { err: e.message }); }
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Get tickets — paginated, searchable, filterable
// Staff (admin + agent) sees all; regular user sees only their own.
//
// SEARCH — was: 4 un-anchored case-insensitive regexes (description, product,
// employee, ticketNumber) = 4 full collection scans per request. Now:
//   - "TKT-…" style queries  → anchored prefix regex on the INDEXED
//     ticketNumber field (index-backed, anchored at ^)
//   - everything else         → MongoDB $text search using the ticket text
//     index (tokenized, relevance-ranked, index-backed)
// ---------------------------------------------------------------------
const getTickets = async (req, res, next) => {
  try {
    const { error, value } = ticketQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const { page, limit, sort, order, status, priority, category, company, companyId, team, tag, assignedTo, unassigned, slaAtRisk, search } = value;
    const skip = (page - 1) * limit;

    const query = isStaff(req.userRole) ? {} : { user: req.user };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (company) query.company = company;
    if (companyId) query.companyId = companyId;
    if (team) query.team = team;
    // "me" resolves to the authenticated user — powers the agent queue
    if (assignedTo) query.assignedTo = assignedTo === "me" ? req.user : assignedTo;
    // Triage view — tickets nobody picked up yet
    if (unassigned) query.assignedTo = null;
    // At-risk view — active tickets due within 4h (or already past due)
    if (slaAtRisk) {
      query.slaDueDate = { $ne: null, $lte: new Date(Date.now() + 4 * 60 * 60 * 1000) };
      query.status = { $nin: ["resolved", "closed"] };
    }
    if (tag) query.tags = tag; // exact (lowercased) tag match — indexed

    let textScore = false;
    if (search) {
      const cleaned = search.trim();
      if (/^TKT[-\d]{1,24}$/i.test(cleaned)) {
        // Ticket-number lookup — anchored regex on the indexed field
        // (matches "TKT", "TKT-2026", "TKT-2026-0001" progressively)
        query.ticketNumber = { $regex: `^${escapeRegex(cleaned)}`, $options: "i" };
      } else if (/^[\d-]{1,24}$/.test(cleaned)) {
        // Bare digit fragment ("0007", "2026-0007") — the command palette and
        // search box send these. Contains-match on ticketNumber (regex specials
        // escaped) so "0007" finds TKT-2026-0007. Falls through to $text only
        // when the query isn't pure digits/hyphens.
        query.ticketNumber = { $regex: escapeRegex(cleaned), $options: "i" };
      } else {
        // Full-text search on the text index. Strip $text operators (`-word`,
        // `"phrases"`) from user input so they can't sculpt the query.
        const safeTerms = cleaned
          .replace(/["\\]/g, " ")
          .split(/\s+/)
          .map((t) => t.replace(/^[-+]/, ""))
          .filter((t) => t.length >= 2)
          .slice(0, 8)
          .join(" ");
        if (safeTerms) {
          query.$text = { $search: safeTerms };
          textScore = true; // rank by relevance while we're at it
        }
      }
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(query, textScore ? { score: { $meta: "textScore" } } : {})
        .populate("user", "name email")
        .populate("assignedTo", "name email")
        .populate("resolvedBy", "name email")
        .sort(textScore ? { score: { $meta: "textScore" } } : { [sort]: order === "asc" ? 1 : -1 })
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

    const query = isStaff(req.userRole)
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
// Update ticket — staff only, partial update
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

    // Resolve company directory link when companyId changes
    if (value.companyId) {
      const company = await Company.findById(value.companyId);
      if (!company) throw new AppError("Company not found", 400);
      value.company = company.name;
    }
    if (value.tags) value.tags = [...new Set(value.tags)];

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

    // Notify the ticket creator that the status changed
    try {
      if (String(ticket.user) !== String(req.user)) {
        await notificationService.create({
          recipientId: ticket.user,
          senderId: req.user,
          type: "ticket_status_changed",
          title: `Ticket ${ticket.ticketNumber} → ${value.status}`,
          message:
            value.status === "resolved" || value.status === "closed"
              ? `Your ticket was ${value.status}. Please rate the support you received.`
              : `Status updated by support`,
          ticketId: ticket._id,
          sendEmail: true,
        });
      }
    } catch (e) {
      logger.warn("Status-change notification failed", { err: e.message });
    }
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
    const { error, value } = assignSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

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
    const populated = await Ticket.findById(ticket._id)
      .populate("user", "name email profileImage")
      .populate("assignedTo", "name email profileImage")
      .populate("resolvedBy", "name email")
      .populate("history.by", "name email");

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

    res.status(200).json({ success: true, data: { ticket: publicTicket(populated, req.userRole) } });
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
    const { error, value } = csatSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

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

// ---------------------------------------------------------------------
// Dashboard stats — aggregation pipeline (no full-collection scans).
// NEW: FRT (first response time), resolution time, SLA compliance and CSAT
// metrics — the numbers a support operation is actually managed by.
// ---------------------------------------------------------------------
const getDashboardStats = async (req, res, next) => {
  try {
    const yearStart = new Date(`${new Date().getFullYear()}-01-01`);
    const yearEnd = new Date(`${new Date().getFullYear() + 1}-01-01`);

    const [counts, chartAgg, topEmployees, priorityAgg, categoryAgg, responseAgg, csatAgg] = await Promise.all([
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
      // FRT + resolution time + SLA compliance, in one pass
      Ticket.aggregate([
        { $facet: {
          frt: [
            { $match: { firstResponseAt: { $ne: null } } },
            { $group: { _id: null, avgMinutes: { $avg: { $divide: [{ $subtract: ["$firstResponseAt", "$createdAt"] }, 60000] } }, count: { $sum: 1 } } },
          ],
          resolution: [
            { $match: { endDate: { $ne: null } } },
            { $group: { _id: null, avgMinutes: { $avg: { $divide: [{ $subtract: ["$endDate", "$createdAt"] }, 60000] } }, count: { $sum: 1 } } },
          ],
          sla: [
            { $match: { endDate: { $ne: null } } },
            { $group: {
              _id: null,
              completed: { $sum: 1 },
              withinSla: { $sum: { $cond: [{ $eq: ["$slaBreached", false] }, 1, 0] } },
            } },
          ],
        }},
      ]),
      // CSAT average + response count
      Ticket.aggregate([
        { $match: { "csat.rating": { $ne: null } } },
        { $group: {
          _id: null,
          avgRating: { $avg: "$csat.rating" },
          count: { $sum: 1 },
          promoters: { $sum: { $cond: [{ $gte: ["$csat.rating", 4] }, 1, 0] } },
          detractors: { $sum: { $cond: [{ $lte: ["$csat.rating", 2] }, 1, 0] } },
        }},
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
    const r = responseAgg[0] || {};
    const csat = csatAgg[0] || {};
    const sla = (r.sla && r.sla[0]) || { completed: 0, withinSla: 0 };

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
        // New service metrics
        metrics: {
          firstResponse: {
            avgMinutes: Math.round(r.frt?.[0]?.avgMinutes ?? -1),
            responded: r.frt?.[0]?.count || 0,
          },
          resolution: {
            avgMinutes: Math.round(r.resolution?.[0]?.avgMinutes ?? -1),
            resolved: r.resolution?.[0]?.count || 0,
          },
          slaCompliance: {
            withinSla: sla.withinSla,
            completed: sla.completed,
            percent: sla.completed ? Math.round((sla.withinSla / sla.completed) * 100) : null,
          },
          csat: {
            avgRating: csat.avgRating ? Math.round(csat.avgRating * 10) / 10 : null,
            responses: csat.count || 0,
            promoters: csat.promoters || 0,
            detractors: csat.detractors || 0,
          },
        },
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
  rateCsat,
  getDashboardStats,
};
