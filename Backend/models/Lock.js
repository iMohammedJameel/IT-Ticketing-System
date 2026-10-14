/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Distributed lock — MongoDB-backed mutex used by background jobs (SLA
// monitor) so that when the backend runs with multiple replicas, only ONE
// instance performs the periodic scan. Without this, every replica fired its
// own setInterval and users received duplicate SLA notifications.
//
// The lock is a plain document whose `expiresAt` is updated atomically via
// findOneAndUpdate — no transaction needed. Locks self-expire, so a crashed
// holder never deadlocks the cluster.
const mongoose = require("mongoose");

const lockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // lock name, e.g. "sla-monitor"
    owner: { type: String, required: true }, // hostname:pid of the holder
    expiresAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

const Lock = mongoose.models.Lock || mongoose.model("Lock", lockSchema);
module.exports = Lock;
