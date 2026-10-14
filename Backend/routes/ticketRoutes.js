/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();

const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  rateCsat,
  getDashboardStats,
} = require("../controller/ticketController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Staff-only (admin + agent)
router.get("/tickets/stats", authMiddleware, allowedTo("admin", "agent"), getDashboardStats);

// Authenticated
router.post("/tickets", authMiddleware, createTicket);
router.get("/tickets", authMiddleware, getTickets);
router.get("/tickets/:id", authMiddleware, getTicketById);

// CSAT — requester-only (enforced in the controller; needs just authentication)
router.post("/tickets/:id/csat", authMiddleware, rateCsat);

// Staff-only ticket mutations (agents work tickets; admins keep them too)
router.put("/tickets/:id", authMiddleware, allowedTo("admin", "agent"), updateTicket);
router.patch("/tickets/:id/status", authMiddleware, allowedTo("admin", "agent"), updateTicketStatus);
router.patch("/tickets/:id/priority", authMiddleware, allowedTo("admin", "agent"), updateTicketPriority);
router.patch("/tickets/:id/assign", authMiddleware, allowedTo("admin", "agent"), assignTicket);

module.exports = router;
