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
// destructive bulk-delete stays admin-only.
router.post("/tickets/bulk/status", authMiddleware, allowedTo("admin", "agent"), bulkStatus);
router.post("/tickets/bulk/assign", authMiddleware, allowedTo("admin", "agent"), bulkAssign);
router.post("/tickets/bulk/delete", authMiddleware, allowedTo("admin"), bulkDelete);

// CSV export — ADD(QA-rec-3): opened to agents as well. Agents already see
// every ticket in the queue UI, so a CSV of the same rows exposes nothing
// new; the export is read-only and formula-injection-sanitized (utils/csv).
// Destructive bulk-delete REMAINS admin-only.
router.get("/tickets/export/csv", authMiddleware, allowedTo("admin", "agent"), exportCsv);

// Activity feed
router.get("/activity", authMiddleware, getActivityFeed);

module.exports = router;
