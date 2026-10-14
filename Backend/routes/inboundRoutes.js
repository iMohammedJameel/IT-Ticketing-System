/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const { receiveEmail } = require("../controller/inboundEmailController");
const rateLimit = require("express-rate-limit");

// Dedicated limiter — email bursts are legitimate, but a runaway mail loop
// must not eat the global budget. 30 requests / minute / IP.
const inboundLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Inbound email rate limit exceeded" } },
});

// POST /inbound/email — email → ticket webhook (SendGrid Inbound Parse,
// Mailgun Routes, Cloudflare Email Workers…). Authenticated by shared secret
// (x-inbound-secret header or ?secret=) — see controller for details.
// Endpoint 404s when INBOUND_EMAIL_SECRET is not configured.
router.post("/inbound/email", inboundLimiter, receiveEmail);

module.exports = router;
