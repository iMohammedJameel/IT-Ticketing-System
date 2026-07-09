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

// Admin-only bulk operations
router.post("/tickets/bulk/status", authMiddleware, allowedTo("admin"), bulkStatus);
router.post("/tickets/bulk/assign", authMiddleware, allowedTo("admin"), bulkAssign);
router.post("/tickets/bulk/delete", authMiddleware, allowedTo("admin"), bulkDelete);

// CSV export
router.get("/tickets/export/csv", authMiddleware, allowedTo("admin"), exportCsv);

// Activity feed
router.get("/activity", authMiddleware, getActivityFeed);

module.exports = router;
