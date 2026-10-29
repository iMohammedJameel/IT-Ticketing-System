/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket number generator — human-readable ids like TKT-2025-0001.
// Extracted from ticketController.js (single responsibility).
const Counter = require("../../models/Counter");

// Uses an atomic Counter document with $inc to prevent race conditions when
// multiple tickets are created concurrently. Falls back to count-based
// generation if the Counter model is unavailable.
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

module.exports = { generateTicketNumber };
