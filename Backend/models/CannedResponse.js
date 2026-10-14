/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Canned (predefined) responses — reusable reply templates for support staff.
// Selected in the comment box and inserted with one click instead of retyping
// the same "please restart your router" reply for the 40th time.
const mongoose = require("mongoose");

const cannedResponseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["general", "hardware", "software", "network", "access", "other"],
      default: "general",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

cannedResponseSchema.index({ title: "text" });

const CannedResponse =
  mongoose.models.CannedResponse || mongoose.model("CannedResponse", cannedResponseSchema);

module.exports = CannedResponse;
