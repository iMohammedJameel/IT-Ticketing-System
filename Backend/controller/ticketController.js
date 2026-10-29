/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket controller — public entry point (re-exports).
//
// The implementation was split into focused modules under ./ticket/
// (single responsibility, unit-testable in isolation):
//   ticket/ticketNumber.js             — TKT-YYYY-NNNN sequence generator
//   ticket/ticketSanitizer.js          — staff-only field stripping
//   ticket/ticketQuery.js              — filter + index-backed search builder
//   ticket/ticketNotifications.js      — post-response fan-out helpers
//   ticket/ticketCrudController.js     — create / list / get / update
//   ticket/ticketLifecycleController.js— status / priority / assign / csat
//
// The export surface below is UNCHANGED, so routes/ticketRoutes.js and the
// test-suite keep working without a single edit.
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
} = require("./ticket/ticketCrudController");
const {
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  rateCsat,
} = require("./ticket/ticketLifecycleController");

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  rateCsat,
  // getDashboardStats moved to controller/dashboardController.js
};
