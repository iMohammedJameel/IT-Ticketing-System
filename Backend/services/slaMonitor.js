// SLA monitor — periodic job that scans tickets approaching or breaching SLA.
// Runs every hour. Uses targeted $set updates (not full-document save) so
// concurrent edits to the same ticket aren't clobbered. The "breaching soon"
// notification is deduped via the slaSoonNotifiedAt field on each ticket,
// so the same ticket only fires one warning per 24h window.
const Ticket = require("../models/Ticket");
const notificationService = require("./notificationService");

const SLA_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SOON_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours before deadline
// Don't fire "breaching soon" more than once per 24h per ticket
const SOON_DEDUP_MS = 24 * 60 * 60 * 1000;

let intervalId = null;
let initialTimeoutId = null;

const checkSla = async () => {
  try {
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
      if (t.assignedTo) {
        await notificationService.create({
          recipientId: t.assignedTo._id,
          type: "sla_breached",
          title: `SLA breached: ${t.ticketNumber}`,
          message: `Ticket "${t.product}" has passed its SLA deadline`,
          ticketId: t._id,
          sendEmail: true,
        });
      }
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
      if (t.assignedTo) {
        await notificationService.create({
          recipientId: t.assignedTo._id,
          type: "sla_breaching",
          title: `SLA breaching soon: ${t.ticketNumber}`,
          message: `Ticket "${t.product}" will breach SLA in less than 2 hours`,
          ticketId: t._id,
          sendEmail: true,
        });
      }
    }

    if (breached.length || soon.length) {
      console.log(`⏰ SLA check: ${breached.length} breached, ${soon.length} breaching soon`);
    }
  } catch (err) {
    console.error("SLA monitor error:", err.message);
  }
};

const startSlaMonitor = () => {
  if (intervalId) return;
  // Run once on start (after a short delay so the server can boot first), then on interval
  initialTimeoutId = setTimeout(checkSla, 5000);
  intervalId = setInterval(checkSla, SLA_CHECK_INTERVAL_MS);
  console.log("⏰ SLA monitor started (runs every hour)");
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
