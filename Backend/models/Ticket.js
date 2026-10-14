/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket schema — extended with priority, category, ticketNumber, SLA, audit history
const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "status_changed",
        "assigned",
        "unassigned",
        "commented",
        "priority_changed",
        "reopened",
        "csat_rated",
      ],
    },
    field: { type: String, default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ticketSchema = new mongoose.Schema(
  {
    // Human-readable, sequential ticket number (TKT-2025-0001)
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    product: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    // Short human title shown in lists/search results (the description is the
    // long-form body). Optional for backward compatibility with old tickets.
    subject: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "",
    },
    employee: {
      // Denormalized snapshot of the requester's name at creation time — kept
      // for audit readability after the user is deleted. The live reference is
      // `user`; never editable via the API (single source of truth = User.name).
      type: String,
      required: true,
      trim: true,
    },
    company: {
      // Denormalized company NAME (kept in sync with companyId on rename).
      // New tickets should also carry companyId when the company exists in
      // the directory.
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: ["hardware", "software", "network", "access", "other"],
      default: "other",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    // Free-form labels for filtering/grouping (max 10 per ticket)
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 30,
      },
    ],
    // Ticket origin: web UI (default) or inbound email
    source: {
      type: String,
      enum: ["web", "email"],
      default: "web",
    },
    // Support team the ticket was routed to (denormalized from assignee.team)
    team: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50,
      index: true,
    },
    // Customer satisfaction (CSAT) — set ONCE by the requester after the
    // ticket is resolved/closed. rating: null until rated.
    csat: {
      rating: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, default: "", trim: true, maxlength: 1000 },
      ratedAt: { type: Date, default: null },
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // SLA tracking
    firstResponseAt: {
      type: Date,
      default: null,
    },
    slaDueDate: {
      type: Date,
      default: null,
    },
    slaBreached: {
      type: Boolean,
      default: false,
    },
    // Timestamp of the last "breaching soon" notification — used by the SLA
    // monitor to avoid spamming duplicate notifications every hour.
    slaSoonNotifiedAt: {
      type: Date,
      default: null,
    },
    // File attachments (URLs to S3/Cloudinary/disk)
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Audit history of all changes (see pre-save cap below)
    history: [historySchema],
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------
// HISTORY CAP — tickets previously grew their embedded audit history
// without bound. A long-lived ticket with thousands of comments/status
// changes pushed documents toward MongoDB's 16MB limit and slowed every
// read. We keep the most recent 200 entries (plenty for the audit UI) and
// drop the oldest. Runs on every save() so every write path is covered.
// NOTE: promise-style hook — Mongoose 9 document middleware no longer
// passes a `next` callback to pre('save').
// ---------------------------------------------------------------------
const MAX_HISTORY_ENTRIES = 200;
ticketSchema.pre("save", function () {
  if (this.history && this.history.length > MAX_HISTORY_ENTRIES) {
    this.history = this.history.slice(-MAX_HISTORY_ENTRIES);
  }
});

// Compound indexes for common queries
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ company: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ tags: 1 });
ticketSchema.index({ "csat.rating": 1 });

// Text index — powers the indexed $text search path in getTickets (the old
// approach ran 4 un-anchored case-insensitive regexes = 4 full collection
// scans per search request).
ticketSchema.index(
  { product: "text", subject: "text", description: "text", employee: "text", company: "text", tags: "text" },
  { name: "ticket_text_search" }
);

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;
