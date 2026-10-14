/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const company = require("../controller/companyController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Staff — company directory (agents need it for the ticket form / filters)
router.get("/companies", authMiddleware, allowedTo("admin", "agent"), company.list);
router.get("/companies/:id", authMiddleware, allowedTo("admin", "agent"), company.getOne);

// Admin — mutations
router.post("/companies", authMiddleware, allowedTo("admin"), company.create);
router.put("/companies/:id", authMiddleware, allowedTo("admin"), company.update);
router.delete("/companies/:id", authMiddleware, allowedTo("admin"), company.remove);

module.exports = router;
