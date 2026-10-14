/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Counter model — atomic sequence generator for human-readable ticket numbers.
// Each year gets its own counter document so the per-year sequence resets correctly.
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. "ticket-2026"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
module.exports = Counter;
