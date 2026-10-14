/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Distributed lock service — atomic MongoDB mutex.
//
// `acquire` uses a single findOneAndUpdate:
//   - If no lock document exists  → upsert creates it with our owner (we win)
//   - If it exists but expired    → we overwrite the owner/expiry (we win)
//   - If it exists and is fresh   → filter matches nothing; the upsert then
//     hits the unique _id index and throws 11000 (we lose — someone else won)
// This is race-free without transactions.
const os = require("os");
const Lock = require("../models/Lock");

const OWNER = `${os.hostname()}:${process.pid}`;

/**
 * Try to acquire a lock. Returns true if this process now holds it.
 * @param {string} name     lock name (e.g. "sla-monitor")
 * @param {number} ttlMs    how long the holder may keep it before it self-expires
 */
const acquire = async (name, ttlMs) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  try {
    const res = await Lock.findOneAndUpdate(
      { _id: name, $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }] },
      { $set: { owner: OWNER, expiresAt } },
      { new: true, upsert: true }
    );
    return !!res;
  } catch (err) {
    // Duplicate key → another instance holds a fresh lock
    if (err.code === 11000 || err.code === 11001) return false;
    throw err;
  }
};

/** Release a lock (only if we hold it). */
const release = async (name) => {
  await Lock.deleteOne({ _id: name, owner: OWNER }).catch(() => {});
};

module.exports = { acquire, release, OWNER };
