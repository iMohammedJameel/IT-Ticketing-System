/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket CRUD handlers — create, list (paginated/search), get-by-id, update.
// Split out of ticketController.js; status/priority/assign/csat live in
// ticketLifecycleController.js.
const Ticket = require("../../models/Ticket");
const User = require("../../models/User");
const Company = require("../../models/Company");
const {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
} = require("../validation/TicketValidation");
const { AppError } = require("../../middleware/errorMiddleware");
const slaPolicyService = require("../../services/slaPolicyService");
const { isStaff } = require("../../utils/roles");
const { validateOrThrow } = require("../../utils/validation");

const { generateTicketNumber } = require("./ticketNumber");
const { publicTicket, sanitizeTickets } = require("./ticketSanitizer");
const { buildTicketQuery } = require("./ticketQuery");
const { notifyStaffOfNewTicket } = require("./ticketNotifications");

const computeSlaDueDate = (priority, fromDate) =>
  slaPolicyService.computeSlaDueDate(priority, fromDate);

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// ---------------------------------------------------------------------
// Create ticket — employee auto-set from authenticated user (security)
// ---------------------------------------------------------------------
const createTicket = async (req, res, next) => {
  try {
    const value = validateOrThrow(createTicketSchema, req.body);

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

    // Notify all staff AFTER the response — never add SMTP latency to the API
    await notifyStaffOfNewTicket(ticket, { id: req.user, name: user.name });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Get tickets — paginated, searchable, filterable.
// Staff (admin + agent) sees all; regular user sees only their own.
// Query construction lives in ticketQuery.js (index-backed search).
// ---------------------------------------------------------------------
const getTickets = async (req, res, next) => {
  try {
    const value = validateOrThrow(ticketQuerySchema, req.query);
    const { page, limit, sort, order } = value;
    const skip = (page - 1) * limit;

    const { query, textScore } = buildTicketQuery(value, { user: req.user, userRole: req.userRole });

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
    if (!req.params.id.match(OBJECT_ID_RE)) throw new AppError("Invalid ticket id", 400);

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
    const value = validateOrThrow(updateTicketSchema, req.body);

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

module.exports = { createTicket, getTickets, getTicketById, updateTicket };
