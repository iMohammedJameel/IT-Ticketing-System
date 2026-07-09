const express = require("express");
const router = express.Router();
const kb = require("../controller/kbController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Public — published articles (read-only for unauthenticated users)
router.get("/kb", kb.listPublished);
router.get("/kb/:id", kb.getPublished);
router.post("/kb/:id/vote", kb.vote);

// Admin — full CRUD
router.get("/admin/kb", authMiddleware, allowedTo("admin"), kb.listAll);
router.post("/admin/kb", authMiddleware, allowedTo("admin"), kb.create);
router.put("/admin/kb/:id", authMiddleware, allowedTo("admin"), kb.update);
router.delete("/admin/kb/:id", authMiddleware, allowedTo("admin"), kb.remove);

module.exports = router;
