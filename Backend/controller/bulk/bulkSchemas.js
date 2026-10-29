/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Bulk operation schemas — extracted from bulkController.js so validation
// rules sit next to nothing but themselves and are trivially unit-testable.
const Joi = require("joi");
const { TICKET_STATUSES } = require("../validation/TicketValidation");

const OBJECT_ID = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const ID_LIST = Joi.array().items(OBJECT_ID).min(1).max(100).required();

const bulkStatusSchema = Joi.object({
  ids: ID_LIST,
  status: Joi.string().valid(...TICKET_STATUSES).required(),
});

const bulkAssignSchema = Joi.object({
  ids: ID_LIST,
  assignedTo: OBJECT_ID.required(),
});

const bulkDeleteSchema = Joi.object({
  ids: ID_LIST,
});

module.exports = { bulkStatusSchema, bulkAssignSchema, bulkDeleteSchema };
