/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Request context middleware — request-id stamping and the attribution layer.
// Extracted from app.js so the entry file only wires things together.
const crypto = require("crypto");
const ATTRIBUTION = require("../config/attribution");

// Every request gets an x-request-id header (and req.id), which the
// structured logger and error responses can reference. Essential for
// correlating a user complaint to a specific log line.
const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
};

// Attribution layer (see LICENSE + NOTICE) — stamped on EVERY API response.
// Visible to anyone inspecting network traffic in browser devtools.
const attributionHeaders = (req, res, next) => {
  res.setHeader("x-authored-by", ATTRIBUTION.author);
  res.setHeader("x-app-source", ATTRIBUTION.url);
  res.setHeader("x-app-signature", ATTRIBUTION.signature);
  next();
};

module.exports = { requestId, attributionHeaders };
