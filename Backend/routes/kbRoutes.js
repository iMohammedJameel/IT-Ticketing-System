/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const kb = require("../controller/kbController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Public — published articles (read-only for unauthenticated users)
router.get("/kb", kb.listPublished);
router.get("/kb/:id", kb.getPublished);
// Voting requires login + is deduped per user (see kbController.vote)
router.post("/kb/:id/vote", authMiddleware, kb.vote);

// Admin — full CRUD
router.get("/admin/kb", authMiddleware, allowedTo("admin"), kb.listAll);
router.post("/admin/kb", authMiddleware, allowedTo("admin"), kb.create);
router.put("/admin/kb/:id", authMiddleware, allowedTo("admin"), kb.update);
router.delete("/admin/kb/:id", authMiddleware, allowedTo("admin"), kb.remove);

module.exports = router;
