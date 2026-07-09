// Knowledge base — FAQ / articles for self-service
const mongoose = require("mongoose");

const kbArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    excerpt: {
      type: String,
      maxlength: 300,
      default: "",
    },
    category: {
      type: String,
      enum: ["hardware", "software", "network", "access", "other"],
      default: "other",
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    published: {
      type: Boolean,
      default: false,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text index for full-text search
kbArticleSchema.index({ title: "text", content: "text", tags: "text" });
kbArticleSchema.index({ createdAt: -1 });

const KBArticle = mongoose.models.KBArticle || mongoose.model("KBArticle", kbArticleSchema);
module.exports = KBArticle;
