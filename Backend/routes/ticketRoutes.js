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
  getDashboardStats,
} = require("../controller/ticketController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Admin-only
router.get("/tickets/stats", authMiddleware, allowedTo("admin"), getDashboardStats);

// Authenticated
router.post("/tickets", authMiddleware, createTicket);
router.get("/tickets", authMiddleware, getTickets);
router.get("/tickets/:id", authMiddleware, getTicketById);

// Admin-only ticket mutations
router.put("/tickets/:id", authMiddleware, allowedTo("admin"), updateTicket);
router.patch("/tickets/:id/status", authMiddleware, allowedTo("admin"), updateTicketStatus);
router.patch("/tickets/:id/priority", authMiddleware, allowedTo("admin"), updateTicketPriority);
router.patch("/tickets/:id/assign", authMiddleware, allowedTo("admin"), assignTicket);

module.exports = router;
