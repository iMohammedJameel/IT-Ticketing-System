/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  deleteMyNotification,
} = require("../controller/notificationController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/notifications", authMiddleware, getMyNotifications);
router.patch("/notifications/:id/read", authMiddleware, markNotificationRead);
router.post("/notifications/mark-all-read", authMiddleware, markAllRead);
router.delete("/notifications/:id", authMiddleware, deleteMyNotification);

module.exports = router;
