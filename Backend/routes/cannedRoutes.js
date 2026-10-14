/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const canned = require("../controller/cannedResponseController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Staff — read + usage counter (agents insert these into comments)
router.get("/canned-responses", authMiddleware, allowedTo("admin", "agent"), canned.list);
router.post("/canned-responses/:id/use", authMiddleware, allowedTo("admin", "agent"), canned.markUsed);

// Admin — CRUD
router.post("/canned-responses", authMiddleware, allowedTo("admin"), canned.create);
router.put("/canned-responses/:id", authMiddleware, allowedTo("admin"), canned.update);
router.delete("/canned-responses/:id", authMiddleware, allowedTo("admin"), canned.remove);

module.exports = router;
