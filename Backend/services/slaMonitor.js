/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// SLA monitor — periodic job that scans tickets approaching or breaching SLA.
// Runs every hour. Uses targeted $set updates (not full-document save) so
// concurrent edits to the same ticket aren't clobbered. The "breaching soon"
// notification is deduped via the slaSoonNotifiedAt field on each ticket,
// so the same ticket only fires one warning per 24h window.
//
// MULTI-REPLICA SAFE: when the backend runs with >1 replica, every instance
// used to fire its own setInterval → users got N× duplicate notifications.
// Each tick now acquires a MongoDB distributed lock (services/lockService)
// valid for exactly one interval — only the winner runs the scan.
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const notificationService = require("./notificationService");
const lockService = require("./lockService");
const logger = require("../utils/logger");

const SLA_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SOON_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours before deadline
// Don't fire "breaching soon" more than once per 24h per ticket
const SOON_DEDUP_MS = 24 * 60 * 60 * 1000;

const LOCK_NAME = "sla-monitor";

let intervalId = null;
let initialTimeoutId = null;

// ---------------------------------------------------------------------
// Escalation recipient — the ticket's assignee when there is one; otherwise
// ALL active admins. Previously unassigned tickets silently breached with
// zero notifications: the `if (t.assignedTo)` guards meant nobody was told,
// and triage (the unassigned queue) is exactly where tickets rot the longest.
// Admins are the safety net — they own re-assignment.
// ---------------------------------------------------------------------
const activeAdminIds = async () => {
  const admins = await User.find({ role: "admin", status: "active" }).select("_id");
  return admins.map((a) => a._id);
};

const notifySla = async (ticket, type, title, message) => {
  const recipients = ticket.assignedTo ? [ticket.assignedTo._id] : await activeAdminIds();
  await Promise.all(
    recipients.map((recipientId) =>
      notificationService.create({
        recipientId,
        type,
        title,
        message,
        ticketId: ticket._id,
        sendEmail: true,
      })
    )
  );
};

const checkSla = async () => {
  try {
    // Acquire the distributed lock — skip this tick if another replica won it
    const gotLock = await lockService.acquire(LOCK_NAME, SLA_CHECK_INTERVAL_MS);
    if (!gotLock) {
      logger.debug("SLA check skipped — another replica holds the lock");
      return;
    }

    const now = new Date();
    const soonDate = new Date(now.getTime() + SOON_THRESHOLD_MS);

    // -----------------------------------------------------------------
    // 1. Mark breached tickets (still open/in-progress, past due date).
    //    Targeted $set update — does NOT clobber concurrent edits.
    //    Only update tickets where slaBreached is currently false so we
    //    don't fire duplicate notifications on every check.
    // -----------------------------------------------------------------
    const breached = await Ticket.find({
      slaDueDate: { $lt: now },
      slaBreached: false,
      status: { $in: ["open", "in-progress"] },
    }).populate("assignedTo user", "_id name email");

    for (const t of breached) {
      // Atomic targeted update — avoids clobbering concurrent edits
      await Ticket.updateOne(
        { _id: t._id, slaBreached: false },
        { $set: { slaBreached: true } }
      );
      await notifySla(
        t,
        "sla_breached",
        `SLA breached: ${t.ticketNumber}`,
        t.assignedTo
          ? `Ticket "${t.product}" has passed its SLA deadline`
          : `UNASSIGNED ticket "${t.product}" has passed its SLA deadline — needs triage`
      );
    }

    // -----------------------------------------------------------------
    // 2. Notify soon-to-breach (within 2 hours). Dedupe via
    //    slaSoonNotifiedAt so each ticket only fires once per 24h.
    // -----------------------------------------------------------------
    const soon = await Ticket.find({
      slaDueDate: { $gte: now, $lt: soonDate },
      slaBreached: false,
      status: { $in: ["open", "in-progress"] },
      $or: [
        { slaSoonNotifiedAt: null },
        { slaSoonNotifiedAt: { $lt: new Date(now.getTime() - SOON_DEDUP_MS) } },
      ],
    }).populate("assignedTo user", "_id name email");

    for (const t of soon) {
      // Mark as notified atomically
      await Ticket.updateOne(
        { _id: t._id },
        { $set: { slaSoonNotifiedAt: now } }
      );
      await notifySla(
        t,
        "sla_breaching",
        `SLA breaching soon: ${t.ticketNumber}`,
        t.assignedTo
          ? `Ticket "${t.product}" will breach SLA in less than 2 hours`
          : `UNASSIGNED ticket "${t.product}" will breach SLA in less than 2 hours — needs triage`
      );
    }

    if (breached.length || soon.length) {
      logger.info("SLA check complete", { breached: breached.length, soon: soon.length });
    }
  } catch (err) {
    logger.error("SLA monitor error", { err: err.message });
  }
};

const startSlaMonitor = () => {
  if (intervalId) return;
  // Run once on start (after a short delay so the server can boot first), then on interval
  initialTimeoutId = setTimeout(checkSla, 5000);
  intervalId = setInterval(checkSla, SLA_CHECK_INTERVAL_MS);
  logger.info("SLA monitor started", { interval: "1h", locking: "distributed" });
};

const stopSlaMonitor = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (initialTimeoutId) {
    clearTimeout(initialTimeoutId);
    initialTimeoutId = null;
  }
};

module.exports = { startSlaMonitor, stopSlaMonitor, checkSla };
