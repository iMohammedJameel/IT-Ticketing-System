/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// SLA Policy — configurable per-priority deadlines (replaces the old
// hardcoded 72/48/24/4h table). Admins can tune hours per priority and opt a
// priority into "business hours only" counting (e.g. 8 business hours instead
// of 8 wall-clock hours).
const mongoose = require("mongoose");

const SLA_PRIORITIES = ["low", "medium", "high", "urgent"];

const slaPolicySchema = new mongoose.Schema(
  {
    priority: {
      type: String,
      enum: SLA_PRIORITIES,
      required: true,
      unique: true,
      index: true,
    },
    // Resolution target in hours (fractions allowed — 0.5 = 30 minutes)
    hours: {
      type: Number,
      required: true,
      min: 0.25,
      max: 720, // 30 days
    },
    // If true, `hours` counts only working time (work window + work days from
    // env), so overnight/weekend time doesn't consume the SLA budget.
    businessHoursOnly: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
      maxlength: 300,
      trim: true,
    },
  },
  { timestamps: true }
);

const SLAPolicy = mongoose.models.SLAPolicy || mongoose.model("SLAPolicy", slaPolicySchema);

module.exports = SLAPolicy;
module.exports.SLA_PRIORITIES = SLA_PRIORITIES;
