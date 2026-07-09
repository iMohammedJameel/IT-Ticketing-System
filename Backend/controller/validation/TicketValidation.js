const Joi = require("joi");

const TICKET_STATUSES = ["open", "in-progress", "resolved", "closed"];
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];
const TICKET_CATEGORIES = ["hardware", "software", "network", "access", "other"];

const createTicketSchema = Joi.object({
  product: Joi.string().required().min(2).max(100).trim(),
  // employee and startDate are optional in the schema — the controller sets them
  // from the authenticated user. Requiring them here would force the client to
  // send dummy values that the server would override anyway.
  employee: Joi.string().min(2).max(100).trim().default(""),
  company: Joi.string().required().min(2).max(100).trim(),
  category: Joi.string().valid(...TICKET_CATEGORIES).default("other"),
  priority: Joi.string().valid(...TICKET_PRIORITIES).default("medium"),
  startDate: Joi.date().default(() => new Date()),
  endDate: Joi.date().allow(null).default(null),
  description: Joi.string().required().min(5).max(5000).trim(),
});

// Partial update — only the fields the user wants to change.
// NOTE: `priority` is intentionally absent — use PATCH /tickets/:id/priority
// instead, which also recomputes the SLA deadline. Allowing priority here
// would let admins change it without updating SLA, leaving a stale deadline.
const updateTicketSchema = Joi.object({
  product: Joi.string().min(2).max(100).trim(),
  employee: Joi.string().min(2).max(100).trim(),
  company: Joi.string().min(2).max(100).trim(),
  category: Joi.string().valid(...TICKET_CATEGORIES),
  description: Joi.string().min(5).max(5000).trim(),
  endDate: Joi.date().allow(null),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...TICKET_STATUSES).required(),
  adminNote: Joi.string().allow("").max(2000).trim(),
});

const updatePrioritySchema = Joi.object({
  priority: Joi.string().valid(...TICKET_PRIORITIES).required(),
});

const assignSchema = Joi.object({
  assignedTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({ "string.pattern.base": "assignedTo must be a valid user id" }),
});

// Query filters used by GET /tickets — strict enum validation prevents NoSQL injection
const ticketQuerySchema = Joi.object({
  status: Joi.string().valid(...TICKET_STATUSES),
  priority: Joi.string().valid(...TICKET_PRIORITIES),
  category: Joi.string().valid(...TICKET_CATEGORIES),
  company: Joi.string().max(100),
  assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  search: Joi.string().max(200),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid("createdAt", "updatedAt", "priority", "status").default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});

const commentSchema = Joi.object({
  text: Joi.string().required().min(1).max(2000).trim(),
  isInternal: Joi.boolean().default(false),
});

module.exports = {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignSchema,
  ticketQuerySchema,
  commentSchema,
};
