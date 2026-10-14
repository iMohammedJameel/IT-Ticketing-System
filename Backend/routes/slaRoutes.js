/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const sla = require("../controller/slaPolicyController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Staff — read effective policies (needed to show SLA targets in the UI)
router.get("/sla-policies", authMiddleware, allowedTo("admin", "agent"), sla.list);

// Admin — tune per-priority targets / reset to defaults
router.put("/sla-policies/:priority", authMiddleware, allowedTo("admin"), sla.update);
router.post("/sla-policies/reset", authMiddleware, allowedTo("admin"), sla.reset);

module.exports = router;
