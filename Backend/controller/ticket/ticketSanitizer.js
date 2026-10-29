/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket sanitizer — strips staff-only fields before a ticket leaves the API.
// Extracted from ticketController.js (single responsibility).
const { isStaff } = require("../../utils/roles");

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

module.exports = { publicTicket, sanitizeTickets };
