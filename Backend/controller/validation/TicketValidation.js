/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const Joi = require("joi");

const TICKET_STATUSES = ["open", "in-progress", "resolved", "closed"];
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];
const TICKET_CATEGORIES = ["hardware", "software", "network", "access", "other"];

const createTicketSchema = Joi.object({
  product: Joi.string().required().min(2).max(100).trim(),
  // Optional short title shown in lists (description is the long-form body)
  subject: Joi.string().allow("").max(140).trim().default(""),
  // employee and startDate are optional in the schema — the controller sets them
  // from the authenticated user. Requiring them here would force the client to
  // send dummy values that the server would override anyway.
  employee: Joi.string().min(2).max(100).trim().default(""),
  company: Joi.string().required().min(2).max(100).trim(),
  // Optional link into the company directory — when present the server
  // validates it exists and syncs the denormalized `company` name.
  companyId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null),
  category: Joi.string().valid(...TICKET_CATEGORIES).default("other"),
  priority: Joi.string().valid(...TICKET_PRIORITIES).default("medium"),
  startDate: Joi.date().default(() => new Date()),
  endDate: Joi.date().allow(null).default(null),
  description: Joi.string().required().min(5).max(5000).trim(),
  // Free-form labels (lowercased, deduped, max 10)
  tags: Joi.array().items(Joi.string().min(2).max(30).trim().lowercase()).max(10).default([]),
});

// Partial update — only the fields the user wants to change.
// NOTE: `priority` is intentionally absent — use PATCH /tickets/:id/priority
// instead, which also recomputes the SLA deadline. Allowing priority here
// would let admins change it without updating SLA, leaving a stale deadline.
// NOTE: `employee` is ALSO absent — it's a denormalized snapshot of the
// requester's name, not an editable field (source of truth = User record).
const updateTicketSchema = Joi.object({
  product: Joi.string().min(2).max(100).trim(),
  subject: Joi.string().allow("").max(140).trim(),
  company: Joi.string().min(2).max(100).trim(),
  companyId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null),
  category: Joi.string().valid(...TICKET_CATEGORIES),
  description: Joi.string().min(5).max(5000).trim(),
  endDate: Joi.date().allow(null),
  tags: Joi.array().items(Joi.string().min(2).max(30).trim().lowercase()).max(10),
  adminNote: Joi.string().allow("").max(2000).trim(),
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
  companyId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  team: Joi.string().max(50).trim(),
  tag: Joi.string().min(2).max(30).trim().lowercase(),
  // "me" resolves server-side to the authenticated user (agent queue)
  assignedTo: Joi.string().pattern(/^(me|[0-9a-fA-F]{24})$/),
  // unassigned=true → tickets with no assignee (agent queue triage)
  unassigned: Joi.boolean(),
  // slaAtRisk=true → active tickets due within 4h (or already breached)
  slaAtRisk: Joi.boolean(),
  // ADD(QA-rec-4): date range on createdAt. "from" inclusive, "to" EXCLUSIVE
  // (client sends to = selected day + 1 so the whole day is covered).
  // ISO-8601 date string ("2026-10-29" or full timestamp).
  from: Joi.date().iso().max("now"),
  to: Joi.date().iso(),
  search: Joi.string().max(200),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid("createdAt", "updatedAt", "priority", "status").default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});

// CSAT — the requester rates a resolved/closed ticket, once
const csatSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow("").max(1000).trim(),
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
  csatSchema,
  commentSchema,
};
