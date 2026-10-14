/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    // Admin-only internal notes (not visible to regular users)
    isInternal: {
      type: Boolean,
      default: false,
    },
    // Soft edit tracking
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient fetching of ticket comments sorted by time
commentSchema.index({ ticket: 1, createdAt: 1 });

const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
module.exports = Comment;
