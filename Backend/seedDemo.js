/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ============================================================================
// Demo Data Seeder — builds a RICH, REALISTIC dataset that exercises EVERY
// feature of the app. Runs AFTER seedUsers.js (which creates the base users,
// companies, canned responses, KB starters and tickets 0016-0025).
//
//   node seedDemo.js
//
// Coverage map (what this seed enables you to test):
//   • Users: admin/agent/user roles, suspended login block, unverified email
//     banner/gate, job details (jobTitle/department/phone), notification prefs
//   • Companies: active + inactive (Costa), phones/notes
//   • Tickets (25): every status x priority combo, all 5 categories, all 7
//     products, assigned + unassigned (agent queue), team routing
//     (Network/Hardware/Software), email-sourced ticket, Arabic + English
//     content, Arabic tags, adminNote (staff-only), rich audit history
//     (incl. a REOPENED ticket), spread over 10 days (dashboard charts)
//   • SLA states: healthy / breaching-soon (3 tickets) / breached (2 tickets)
//   • CSAT: ratings 5,5,4,4,4,3,3,2 + resolved-unrated + closed-unrated
//   • Comments: public conversations, agent INTERNAL notes, an EDITED comment
//   • Attachments: real files on disk (PNG screenshots + error log .txt)
//     streamed through the authenticated endpoint (image preview + download)
//   • KB: 6 new articles (AR+EN, draft included) + view/helpful stats on all
//   • Canned responses: +4 (AR + EN)
//   • Notifications: unread badges for every role, read + unread mix
//   • Counter synced so UI-created tickets continue at TKT-2026-0041+
//
// Idempotent: safe to re-run — tickets are upserted by number, comments for
// demo tickets are rebuilt, notifications/tickets/companies are skip-if-exists.
// ============================================================================

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const User = require("./models/User");
const Ticket = require("./models/Ticket");
const Company = require("./models/Company");
const CannedResponse = require("./models/CannedResponse");
const KBArticle = require("./models/KBArticle");
const Comment = require("./models/Comment");
const Notification = require("./models/Notification");
const Counter = require("./models/Counter");
const { slugify } = require("./controller/kbController");
const slaPolicyService = require("./services/slaPolicyService");
const env = require("./config/env");
// Demo DATA lives in ./seed/demoData.js (split out for maintainability —
// this file was 817 lines of specs + logic mixed together). Specs only
// describe WHAT to seed; all upsert/idempotency logic stays here.
const {
  DEMO_PASSWORD, NOW, M,
  newUsers, userEnrichment,
  newCompanies, companyEnrichment,
  newCannedResponses,
  newKbArticles, kbStatsEnrichment,
  ticketSpecs, notificationSpecs,
  TXT_ATTACHMENT_CONTENT,
} = require("./seed/demoData");

function makeGradientPng() {
  // Build a real 160x120 PNG (zlib, no external deps)
  const zlib = require("zlib");
  // IMG_H (not H) — the outer scope already has H = "one hour" for SLA math;
  // shadowing it here made the two H's dangerously easy to confuse.
  const W = 160, IMG_H = 120;
  const raw = Buffer.alloc(IMG_H * (1 + W * 3)); // filter byte + RGB per pixel
  let p = 0;
  for (let y = 0; y < IMG_H; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      raw[p++] = Math.round(40 + (x / W) * 160); // R gradient
      raw[p++] = Math.round(60 + (y / IMG_H) * 120); // G gradient
      raw[p++] = 200;                             // B
    }
  }
  const crc32 = (buf) => {
    let c, table = [];
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(IMG_H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function seedDemo() {
  if (env.isProd && process.env.SEED_FORCE !== "true") {
    console.error("❌ Refusing to seed in production. Set SEED_FORCE=true to override.");
    process.exit(1);
  }
  // FIX(QA-rec-5b / seed-audit): same host-friendly pattern as seedUsers —
  // reuse a pre-existing mongoose connection (test harness / embedder) and
  // only connect/disconnect when we run standalone via `node seedDemo.js`.
  const wasConnected = mongoose.connection.readyState === 1;
  if (!wasConnected) {
    await mongoose.connect(env.dbUrl);
    console.log("✅ Connected to MongoDB (demo seed)");
  }

  // ---- resolve base users ------------------------------------------------
  // FIX(QA-rec-5): was 11 sequential findOne round-trips (one per email) —
  // the classic N+1. One $in query now; the loop below just picks the hits.
  const BASE_EMAILS = [
    "admin@jameel-it.com", "agent.laila@example.com", "agent.karim@example.com",
    "omar.khaled@example.com", "sara.mohamed@example.com", "mohamed.elseify@example.com",
    "mostafa.majed@example.com", "ahmed.hassan@example.com", "andrew.ehab@example.com",
    "mo.jameel.official@gmail.com", "admin@example.com",
  ];
  const U = {}; // email → user
  for (const u of await User.find({ email: { $in: BASE_EMAILS } })) U[u.email] = u;
  const admin = U["admin@jameel-it.com"] || U["admin@example.com"];
  if (!admin) throw new Error("Base admin missing — run `node seedUsers.js` first");

  // ---- new users (idempotent) --------------------------------------------
  // FIX(QA-rec-5): same N+1 pattern — one $in lookup for the whole batch,
  // then create only the missing ones.
  const byName = {}; // name → user (for ticket specs)
  Object.values(U).forEach((u) => (byName[u.name] = u));
  const existingNew = {};
  for (const u of await User.find({ email: { $in: newUsers.map((nu) => nu.email) } })) {
    existingNew[u.email] = u;
  }
  for (const nu of newUsers) {
    let u = existingNew[nu.email];
    if (!u) {
      const hash = await bcrypt.hash(DEMO_PASSWORD, env.bcryptSaltRounds);
      const { unverified, suspended, ...rest } = nu;
      u = await User.create({
        ...rest, password: hash,
        emailVerifiedAt: unverified ? null : new Date(),
        status: suspended ? "suspended" : "active",
      });
      console.log(`✓ demo user: ${u.name} (${u.role}${suspended ? ", suspended" : ""}${unverified ? ", unverified" : ""})`);
    }
    U[nu.email] = u;
    byName[u.name] = u;
  }
  // enrich existing users (partial $set, keeps everything else)
  for (const [email, patch] of Object.entries(userEnrichment)) {
    if (U[email]) await User.updateOne({ _id: U[email]._id }, { $set: patch });
  }
  console.log(`✓ user profiles enriched (${Object.keys(userEnrichment).length})`);

  // ---- companies (new + enrichment) --------------------------------------
  const companyIdByName = {};
  for (const c of await Company.find({})) companyIdByName[c.name] = c._id;
  for (const c of newCompanies) {
    if (!companyIdByName[c.name]) {
      const created = await Company.create(c);
      companyIdByName[c.name] = created._id;
      console.log(`✓ demo company: ${c.name}${c.active === false ? " (inactive)" : ""}`);
    }
  }
  for (const [name, patch] of Object.entries(companyEnrichment)) {
    if (companyIdByName[name]) await Company.updateOne({ _id: companyIdByName[name] }, { $set: patch });
  }

  // ---- canned responses ----------------------------------------------------
  for (const cr of newCannedResponses) {
    if (!(await CannedResponse.findOne({ title: cr.title }))) {
      await CannedResponse.create({ ...cr, createdBy: admin._id });
      console.log(`✓ demo canned response: ${cr.title}`);
    }
  }

  // ---- KB articles ---------------------------------------------------------
  for (const kb of newKbArticles) {
    const slug = slugify(kb.title);
    if (!(await KBArticle.findOne({ slug }))) {
      const author = kb.authorKey === "nour" ? U["nour.sabry@example.com"]._id : admin._id;
      await KBArticle.create({
        title: kb.title, slug, excerpt: kb.excerpt, content: kb.content,
        category: kb.category, tags: kb.tags, author, published: kb.published,
        viewCount: kb.viewCount, helpfulCount: kb.helpfulCount, notHelpfulCount: kb.notHelpfulCount,
      });
      console.log(`✓ demo KB: ${kb.title}${kb.published ? "" : " (DRAFT)"}`);
    }
  }
  for (const [title, stats] of Object.entries(kbStatsEnrichment)) {
    await KBArticle.updateOne({ slug: slugify(title) }, { $set: stats });
  }
  console.log("✓ KB stats back-filled on starter articles");

  // ---- attachment template files (write ONCE per run, shared) -------------
  // FIX(QA-seed-n4): files used to be named crypto.randomUUID() on EVERY
  // run — each re-seed orphaned the previous run's files in uploads/ and
  // the directory grew without bound. Deterministic names are now overwritten
  // in place (real user uploads still use random UUIDs, so there is no
  // collision risk).
  // FIX(QA-td6): the deterministic names used the "demo-*" prefix, which the
  // download endpoint's UUID whitelist REJECTS ("Invalid filename" 400) — so
  // seeded attachments could never actually be fetched. A deterministic UUID
  // (sha1 of the logical name, formatted as a UUID) keeps re-seeds idempotent
  // AND passes the endpoint's whitelist. Legacy demo-* files are unlinked.
  const UPLOAD_DIR = require("./services/storageService").UPLOAD_DIR;
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const stableUuid = (logical) => {
    const h = crypto.createHash("sha1").update(`jmlit-demo:${logical}`).digest("hex");
    return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join("-");
  };
  try {
    for (const old of fs.readdirSync(UPLOAD_DIR)) {
      if (old.startsWith("demo-")) fs.unlinkSync(path.join(UPLOAD_DIR, old));
    }
  } catch { /* best-effort cleanup of pre-QA-td6 files */ }
  const fileStore = {}; // logical name → {storedName, mimetype, size}
  for (const logical of ["error-screenshot.png", "receipt-sample.png"]) {
    const storedName = `${stableUuid(logical)}.png`;
    const buf = makeGradientPng();
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buf);
    fileStore[logical] = { storedName, mimetype: "image/png", size: buf.length };
  }
  const txtBuf = Buffer.from(TXT_ATTACHMENT_CONTENT, "utf8");
  const txtStored = `${stableUuid("pos-error-log.txt")}.txt`;
  fs.writeFileSync(path.join(UPLOAD_DIR, txtStored), txtBuf);
  fileStore["pos-error-log.txt"] = { storedName: txtStored, mimetype: "text/plain", size: txtBuf.length };

  // ---- tickets (upsert by number) ------------------------------------------
  const ticketsByNum = {};
  for (const spec of ticketSpecs) {
    const creator = byName[spec.employee] || admin;
    const assignee = spec.assignee ? U[spec.assignee] : null;
    const createdAt = new Date(NOW - spec.createdAgo);
    const slaDueDate = await slaPolicyService.computeSlaDueDate(spec.priority, createdAt);

    // history (resolve actors, absolute timestamps, sort ascending)
    const history = spec.history.map(([action, byRole, offsetMin, extra]) => {
      const by = byRole === "user" ? creator : byRole === "agent" ? (assignee || admin) : admin;
      return {
        action, by: by._id, createdAt: new Date(createdAt.getTime() + offsetMin * M),
        ...(extra || {}),
      };
    }).sort((a, b) => a.createdAt - b.createdAt);

    // attachments
    const attachments = (spec.attachments || []).map((logical) => {
      const f = fileStore[logical];
      return { url: `REPLACED_BELOW/${f.storedName}`, filename: logical, mimetype: f.mimetype, size: f.size, uploadedAt: createdAt };
    });

    // csat
    let csat = { rating: null, comment: "", ratedAt: null };
    let resolvedBy = null, endDate = null;
    if (spec.status === "resolved" || spec.status === "closed") {
      resolvedBy = assignee ? assignee._id : null;
      endDate = new Date(createdAt.getTime() + (spec.closeMin || spec.resolveMin) * M);
    }
    if (spec.csat && typeof spec.csat === "object") {
      csat = { rating: spec.csat.rating, comment: spec.csat.comment, ratedAt: new Date(createdAt.getTime() + spec.csat.afterMin * M) };
    }

    const team = assignee ? assignee.team || "" : "";
    const lastAt = history.length ? history[history.length - 1].createdAt : createdAt;

    const doc = {
      product: spec.product, subject: spec.subject, employee: spec.employee,
      company: spec.company, companyId: companyIdByName[spec.company] || null,
      category: spec.category, priority: spec.priority, status: spec.status,
      user: creator._id, assignedTo: assignee ? assignee._id : null, team,
      source: spec.source || "web", tags: spec.tags || [spec.category],
      startDate: createdAt, endDate, description: spec.description,
      adminNote: spec.adminNote || "", csat, resolvedBy,
      firstResponseAt: spec.firstResponseMin ? new Date(createdAt.getTime() + spec.firstResponseMin * M) : null,
      slaDueDate, slaBreached: !!spec.slaBreached,
      history, attachments,
      createdAt, updatedAt: lastAt,
    };

    let t = await Ticket.findOne({ ticketNumber: spec.num });
    if (t) {
      // Native driver update — mongoose 9 marks createdAt/updatedAt immutable
      // in updates, silently STRIPPING them from $set even with
      // {timestamps:false}, which would poison FRT metrics (negative diffs).
      await Ticket.collection.updateOne({ _id: t._id }, { $set: doc });
    } else {
      t = await Ticket.create({ ticketNumber: spec.num, ...doc });
    }
    // fix attachment URLs now that we know the ticket id
    const fixedAttachments = attachments.map((a) => ({ ...a, url: `/api/tickets/${t._id}/attachments/${a.url.split("/").pop()}` }));
    if (fixedAttachments.length) await Ticket.collection.updateOne({ _id: t._id }, { $set: { attachments: fixedAttachments } });
    ticketsByNum[spec.num] = { ticket: t, spec, creator, assignee, createdAt, ticketId: t._id };
  }
  console.log(`✓ tickets upserted: ${Object.keys(ticketsByNum).length} (TKT-2026-0016 → ${ticketSpecs[ticketSpecs.length - 1].num})`);

  // ---- comments (rebuild for demo tickets — idempotent) ---------------------
  let nComments = 0, nInternal = 0, nEdited = 0;
  for (const { spec, creator, assignee, createdAt, ticketId } of Object.values(ticketsByNum)) {
    // FIX(QA-seed-n1): was `await Ticket.findOne(...)` per ticket — a
    // redundant round-trip because the upsert above already gave us `t`.
    await Comment.deleteMany({ ticket: ticketId });
    for (const c of spec.comments || []) {
      const by = c.by === "user" ? creator : c.by === "agent" ? (assignee || admin) : admin;
      const cAt = new Date(createdAt.getTime() + c.afterMin * M);
      await Comment.create({
        ticket: ticketId, user: by._id, text: c.text, isInternal: !!c.internal,
        editedAt: c.editedAfterMin ? new Date(cAt.getTime() + c.editedAfterMin * M) : null,
        createdAt: cAt, updatedAt: cAt,
      });
      nComments++; if (c.internal) nInternal++; if (c.editedAfterMin) nEdited++;
    }
  }
  console.log(`✓ comments: ${nComments} total (${nInternal} internal notes, ${nEdited} edited)`);

  // ---- notifications (idempotent) ------------------------------------------
  // FIX(QA-seed-n2): dedup used to key on the EXACT createdAt timestamp
  // (NOW - agoMs). Since NOW changes every run, a re-run NEVER matched the
  // previous run's notifications and happily created a full duplicate set —
  // unread badges doubled on every re-seed. Dedup now uses the stable
  // recipient+type+title triple; timestamps are still refreshed per run so
  // relative times stay realistic.
  let nNotifs = 0;
  // FIX(QA-rec-5): dedup was a findOne PER spec (12 sequential round-trips).
  // One $or batch fetches every existing notification in a single query;
  // the loop then only decides update-vs-create per spec.
  const notifSpecs = notificationSpecs.filter((ns) => U[ns.to]);
  const existingNotifs = notifSpecs.length
    ? await Notification.find({
        $or: notifSpecs.map((ns) => ({
          recipient: U[ns.to]._id, type: ns.type, title: ns.title,
        })),
      })
    : [];
  const notifKey = (r, type, title) => `${r}|${type}|${title}`;
  const existingBy = new Map(
    existingNotifs.map((n) => [notifKey(String(n.recipient), n.type, n.title), n])
  );
  for (const ns of notifSpecs) {
    const recipient = U[ns.to];
    const exists = existingBy.get(notifKey(String(recipient._id), ns.type, ns.title));
    if (exists) {
      // keep "now"-relative timestamps fresh on re-runs
      await Notification.updateOne({ _id: exists._id }, { $set: { createdAt: new Date(NOW - ns.agoMs), read: !!ns.read } });
      continue;
    }
    const sender = ns.from ? U[ns.from] : null;
    const ticket = ns.ticketNum ? ticketsByNum[ns.ticketNum].ticket : null;
    await Notification.create({
      recipient: recipient._id, sender: sender ? sender._id : null, type: ns.type,
      title: ns.title, message: ns.message, ticket: ticket ? ticket._id : null,
      read: !!ns.read, readAt: ns.read ? new Date(NOW - ns.agoMs + 3600e3) : null,
      createdAt: new Date(NOW - ns.agoMs),
    });
    nNotifs++;
  }
  console.log(`✓ notifications: ${nNotifs} new (badges: admin 3, laila 2, karim 2, nour 1, tarek 1, omar 2)`);

  // ---- counter sync — UI-created tickets continue at TKT-2026-0041 -----------
  // FIX(QA-rec-e2e): never move the counter BACKWARDS. A hard reset to 40
  // collided with UI-created tickets from a previous run (E11000 duplicate
  // key on TKT-2026-0041 on the next create). seq = max(40, highest ticket
  // number actually in the DB).
  // FIX(QA-seed-n3): { new: true } is deprecated on findOneAndUpdate in
  // mongoose 9 → use returnDocument: 'after' (we don't even need the doc,
  // but keep the option semantics identical).
  const highest = await Ticket.find({}).sort({ ticketNumber: -1 }).limit(1).select("ticketNumber");
  const highestNum = parseInt((highest[0]?.ticketNumber || "TKT-2026-0000").split("-").pop(), 10) || 0;
  const nextSeq = Math.max(40, highestNum);
  await Counter.findByIdAndUpdate("ticket-2026", { $set: { seq: nextSeq } }, { upsert: true, returnDocument: "after" });
  console.log(`✓ ticket counter synced (next ticket = TKT-2026-${String(nextSeq + 1).padStart(4, "0")})`);

  // ---- summary ---------------------------------------------------------------
  const [nT, nU, nKb, nCanned, nComp] = await Promise.all([
    Ticket.countDocuments({}), User.countDocuments({}), KBArticle.countDocuments({}),
    CannedResponse.countDocuments({}), Company.countDocuments({}),
  ]);
  const byStatus = await Ticket.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const byPriority = await Ticket.aggregate([{ $group: { _id: "$priority", n: { $sum: 1 } } }]);
  const rated = await Ticket.countDocuments({ "csat.rating": { $gte: 1 } });
  console.log("\n✅ DEMO SEED COMPLETE");
  console.log(`   Tickets: ${nT}  | Users: ${nU}  | KB: ${nKb} (incl. 1 draft)  | Canned: ${nCanned}  | Companies: ${nComp}`);
  console.log(`   By status: ${byStatus.map((s) => `${s._id}=${s.n}`).join(", ")}`);
  console.log(`   By priority: ${byPriority.map((s) => `${s._id}=${s.n}`).join(", ")}`);
  console.log(`   CSAT-rated: ${rated} tickets | SLA breached: 2 | breaching-soon: 3`);
  console.log("\n📋 Demo logins (password Demo@1234 unless noted):");
  console.log("   admin@jameel-it.com / password123        (admin — 3 unread notifications)");
  console.log("   agent.laila@example.com / Demo@1234          (agent — Network team)");
  console.log("   agent.karim@example.com / Demo@1234          (agent — Hardware team)");
  console.log("   nour.sabry@example.com / Demo@1234           (agent — Software team)");
  console.log("   tarek.mostafa@example.com / Demo@1234        (agent — Network team)");
  console.log("   omar.khaled@example.com / Demo@1234          (user — 4 tickets, 2 rated, 2 unread)");
  console.log("   mona.adel@example.com / Demo@1234            (user — 4 tickets incl. reopened)");
  console.log("   dina.hassan@example.com / Demo@1234          (user — UNVERIFIED email)");
  console.log("   samir.suspended@example.com / Demo@1234      (user — SUSPENDED, login blocked)");
  if (!wasConnected) await mongoose.disconnect();
}

if (require.main === module) {
  seedDemo().catch((err) => {
    console.error("❌ Demo seed failed:", err.message);
    process.exit(1);
  });
}
module.exports = seedDemo;
