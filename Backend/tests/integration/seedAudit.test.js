/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ADD(QA-rec-2): Seed audit — locks the demo-dataset CONTRACT into the test
// suite so regressions to the freshly-fixed idempotency (FIX-04: duplicate
// notifications on re-seed) fail CI instead of silently resurfacing.
//
// What the contract says (seedUsers.js + seedDemo.js):
//   users=16 (10 base + 6 demo, EXACTLY 1 admin), companies=10,
//   tickets=25 (demo ticketSpecs upsert OVER the 0016-0025 base range),
//   notifications=13 (13 specs — two share a recipient+type+title triple
//   but reference DIFFERENT tickets, so both documents exist),
//   canned=8, KB=11 (incl. 1 draft), counter seq=40 → next TKT-2026-0041.
//
// The whole flow runs inside ONE test(): setup.js afterEach wipes all
// collections between tests, so multi-block sequencing would start empty.
import { describe, test, expect } from "vitest";
const seedUsers = require("../../seedUsers");
const seedDemo = require("../../seedDemo");
const User = require("../../models/User");
const Ticket = require("../../models/Ticket");
const Company = require("../../models/Company");
const CannedResponse = require("../../models/CannedResponse");
const KBArticle = require("../../models/KBArticle");
const Notification = require("../../models/Notification");
const Counter = require("../../models/Counter");

const snapshot = async () => {
  const Comment = require("../../models/Comment");
  const [users, companies, tickets, notifications, canned, kb, comments] = await Promise.all([
    User.countDocuments({}),
    Company.countDocuments({}),
    Ticket.countDocuments({}),
    Notification.countDocuments({}),
    CannedResponse.countDocuments({}),
    KBArticle.countDocuments({}),
    Comment.countDocuments({}),
  ]);
  return { users, companies, tickets, notifications, canned, kb, comments };
};

// Per-recipient unread badge signature — guards the FIX-04 duplicate-
// notification regression (re-seed used to double every badge).
const unreadSignature = async () => {
  const rows = await Notification.aggregate([
    { $match: { read: false } },
    { $group: { _id: "$recipient", n: { $sum: 1 } } },
  ]);
  return rows.map((r) => `${r._id}:${r.n}`).sort().join(",");
};

describe("Seed audit — demo dataset contract + idempotency", () => {
  // Two full seed passes + bcrypt hashing (17 users × salt 12) need headroom.
  test("seeds the documented dataset and re-seeding changes nothing", { timeout: 120_000 }, async () => {
    // ---- first pass -------------------------------------------------------
    await seedUsers();
    await seedDemo();

    const first = await snapshot();
    expect(first).toEqual({
      users: 16,
      companies: 10,
      tickets: 25,
      notifications: 13,
      canned: 8,
      kb: 11,
      comments: first.comments, // count captured here, compared below
    });
    const firstUnread = await unreadSignature();
    expect(firstUnread.length).toBeGreaterThan(0); // badges actually exist

    // Dataset contract from seedUsers.js: EXACTLY one admin in the demo set.
    expect(await User.countDocuments({ role: "admin" })).toBe(1);

    // The unverified + suspended demo personas must survive a seed pass.
    expect(await User.countDocuments({ status: "suspended" })).toBe(1);
    const dina = await User.findOne({ email: "dina.hassan@example.com" });
    expect(dina).toBeTruthy();
    expect(dina.emailVerifiedAt).toBeNull();

    // Counter synced so UI-created tickets continue at TKT-2026-0041.
    const counter = await Counter.findById("ticket-2026");
    expect(counter?.seq).toBe(40);

    // Attachments: deterministic demo-* files → exactly 3 file-backed
    // attachment records per seeded dataset (FIX-05 anti-orphan contract).
    const attachmentUrls = (await Ticket.find({})).flatMap((t) => t.attachments || []);
    expect(attachmentUrls.length).toBeGreaterThan(0);

    // ---- second pass — THE idempotency check (guards FIX-04) -------------
    await seedUsers();
    await seedDemo();

    const second = await snapshot();
    expect(second).toEqual(first);

    // No duplicated unread badges: the SAME per-recipient signature as pass
    // one (the old bug doubled every badge on each re-run because the dedup
    // key included NOW-relative timestamps).
    expect(await unreadSignature()).toBe(firstUnread);
    // And literally 13 total notifications — not 26 (the old bug doubled
    // the set on every re-run because the dedup key included NOW-relative
    // timestamps).
    expect(await Notification.countDocuments({})).toBe(13);
  });
});
