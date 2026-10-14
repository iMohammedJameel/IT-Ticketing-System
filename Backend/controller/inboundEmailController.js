/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Inbound email → ticket webhook.
//
// Lets customers create tickets by sending an email (works with SendGrid
// Inbound Parse, Mailgun Routes, Cloudflare Email Workers — anything that can
// POST a form/JSON to a URL).
//
// AUTHENTICATION (required): providers differ in signing schemes, so we use a
// simple, deployment-safe shared secret:
//   - Header:  x-inbound-secret: <INBOUND_EMAIL_SECRET>     (preferred)
//   - Query:   ?secret=<INBOUND_EMAIL_SECRET>                (fallback)
// The endpoint 404s when INBOUND_EMAIL_SECRET is not configured, so it is
// unreachable by accident. Put it behind HTTPS at your mail provider.
//
// Payload fields accepted (any of the common names):
//   from / sender / email / envelope  → sender address
//   subject                           → ticket product/title
//   text / body-plain / plain         → ticket description
//   html / body-html                  → fallback description (tags stripped)
//
// Behaviour:
//   - Unknown sender emails are auto-provisioned as `role: "user"` accounts
//     (random password, pre-verified) — turning this into a customer portal.
//   - Company is derived from the email domain, creating the Company record
//     on first sight (keeps B2B reporting intact).
const crypto = require("crypto");
const User = require("../models/User");
const Company = require("../models/Company");
const Ticket = require("../models/Ticket");
const { AppError } = require("../middleware/errorMiddleware");
const slaPolicyService = require("../services/slaPolicyService");
const notificationService = require("../services/notificationService");
const env = require("../config/env");
const logger = require("../utils/logger");

const extractEmail = (raw) => {
  if (!raw) return null;
  const s = String(raw);
  // "Name <user@host>" → user@host, or bare user@host
  const angled = s.match(/[^\s<]+@[^\s>]+/);
  return angled ? angled[0].toLowerCase() : null;
};

const stripHtml = (html) =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const titleCaseDomain = (domain) =>
  domain
    .split(/[.-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
    .slice(0, 100);

// POST /inbound/email
const receiveEmail = async (req, res, next) => {
  try {
    // 1. Endpoint must be explicitly enabled
    if (!env.inboundEmailSecret) throw new AppError("Not found", 404);
    const provided = req.get("x-inbound-secret") || req.query.secret;
    // timing-safe compare (pad to equal length)
    const a = crypto.createHash("sha256").update(String(provided || "")).digest();
    const b = crypto.createHash("sha256").update(env.inboundEmailSecret).digest();
    if (!provided || !crypto.timingSafeEqual(a, b)) {
      throw new AppError("Invalid inbound secret", 403);
    }

    // 2. Parse the sender (accept JSON bodies and urlencoded/multipart form fields)
    const body = req.body || {};
    const rawFrom = body.from || body.sender || body.email || body.envelope || "";
    const fromEmail = extractEmail(typeof rawFrom === "string" ? rawFrom : JSON.stringify(rawFrom));
    if (!fromEmail || !fromEmail.includes("@")) throw new AppError("Missing sender", 400);

    const subject = String(body.subject || "(No subject)").trim().slice(0, 100);
    const description = String(
      body.text || body["body-plain"] || body.plain || stripHtml(body.html || body["body-html"] || "")
    )
      .trim()
      .slice(0, 5000);
    if (!description) throw new AppError("Empty email body", 400);

    // 3. Find or auto-provision the sender account
    let user = await User.findOne({ email: fromEmail });
    if (!user) {
      const name = fromEmail
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 50) || "Email Customer";
      user = await User.create({
        name,
        email: fromEmail,
        password: crypto.randomBytes(24).toString("hex"), // unguessable; customer resets via "forgot password" if they ever log in
        emailVerifiedAt: new Date(),
        role: "user",
      });
      logger.info("Inbound email: auto-provisioned customer", { email: fromEmail });
    }

    // 4. Resolve company from the email domain (create on first sight)
    const domain = fromEmail.split("@")[1] || "";
    let company;
    if (domain) {
      company = await Company.findOne({ name: { $regex: `^${titleCaseDomain(domain).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      if (!company) {
        company = await Company.create({ name: titleCaseDomain(domain), notes: "Auto-created from inbound email domain" });
      }
    }

    // 5. Create the ticket
    const year = new Date().getFullYear();
    const Counter = require("../models/Counter");
    const counter = await Counter.findByIdAndUpdate(
      `ticket-${year}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const ticketNumber = `TKT-${year}-${String(counter.seq).padStart(4, "0")}`;

    const ticket = await Ticket.create({
      ticketNumber,
      product: subject,
      description,
      employee: user.name,
      company: company ? company.name : "External",
      companyId: company ? company._id : null,
      category: "other",
      priority: "medium",
      user: user._id,
      startDate: new Date(),
      slaDueDate: await slaPolicyService.computeSlaDueDate("medium"),
      tags: ["email"],
      source: "email",
      history: [{ action: "created", by: user._id, field: "status", newValue: "open", note: "created via inbound email" }],
    });

    // 6. Notify staff (admins + agents)
    try {
      const staff = await User.find({ role: { $in: ["admin", "agent"] }, status: "active" }).select("_id");
      await Promise.all(
        staff.map((s) =>
          notificationService.create({
            recipientId: s._id,
            senderId: user._id,
            type: "ticket_created",
            title: `New email ticket: ${ticket.ticketNumber}`,
            message: `${user.name} <${fromEmail}>: ${subject.slice(0, 80)}`,
            ticketId: ticket._id,
          })
        )
      );
    } catch (e) {
      logger.error("Inbound email staff notification failed", { err: e.message });
    }

    logger.info("Inbound email: ticket created", { ticketNumber, from: fromEmail });
    res.status(201).json({ success: true, data: { ticketNumber: ticket.ticketNumber } });
  } catch (err) {
    next(err);
  }
};

module.exports = { receiveEmail };
