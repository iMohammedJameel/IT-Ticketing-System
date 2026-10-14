/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const {
  bulkStatus,
  bulkAssign,
  bulkDelete,
  exportCsv,
  getActivityFeed,
} = require("../controller/bulkController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Bulk operations — status/assign open to staff (agents work tickets too),
// destructive bulk-delete and CSV export stay admin-only.
router.post("/tickets/bulk/status", authMiddleware, allowedTo("admin", "agent"), bulkStatus);
router.post("/tickets/bulk/assign", authMiddleware, allowedTo("admin", "agent"), bulkAssign);
router.post("/tickets/bulk/delete", authMiddleware, allowedTo("admin"), bulkDelete);

// CSV export
router.get("/tickets/export/csv", authMiddleware, allowedTo("admin"), exportCsv);

// Activity feed
router.get("/activity", authMiddleware, getActivityFeed);

module.exports = router;
