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
    employee: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
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
    // Audit history of all changes
    history: [historySchema],
  },
  { timestamps: true }
);

// Compound indexes for common queries
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ company: 1 });
ticketSchema.index({ createdAt: -1 });

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;
