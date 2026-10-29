/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Knowledge base controller — CRUD + search + helpful voting
const KBArticle = require("../models/KBArticle");
const { AppError } = require("../middleware/errorMiddleware");
const { validateOrThrow } = require("../utils/validation");
const Joi = require("joi");

// Unicode-aware slugify — keeps letters/digits from ANY script (Arabic titles
// used to collapse to "-" because \w strips non-ASCII, so every Arabic
// article collided on the same slug). Spaces → dashes, everything else
// (punctuation, symbols) stripped, latin lowercased, dashes collapsed/trimmed.
const slugify = (s) =>
  s
    .toString()
    .trim()
    .toLowerCase() // no-op for Arabic; lowercases latin
    .replace(/[^\p{L}\p{N}\s-]+/gu, "") // strip punctuation/symbols, keep any-script letters + digits
    .replace(/[\s_]+/g, "-") // spaces (and underscores) → dashes
    .replace(/-{2,}/g, "-") // collapse runs of dashes
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
    .slice(0, 80)
    .replace(/-+$/g, ""); // re-trim in case the 80-char cut left a trailing dash

const createSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  content: Joi.string().min(10).max(10000).required(),
  excerpt: Joi.string().max(300).allow(""),
  category: Joi.string().valid("hardware", "software", "network", "access", "other").default("other"),
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
  published: Joi.boolean().default(false),
});

const updateSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  content: Joi.string().min(10).max(10000),
  excerpt: Joi.string().max(300).allow(""),
  category: Joi.string().valid("hardware", "software", "network", "access", "other"),
  tags: Joi.array().items(Joi.string().max(50)).max(10),
  published: Joi.boolean(),
}).min(1);

// Public — list published articles, with search and category filter
const listPublished = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;
    if (search) {
      filter.$text = { $search: search };
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      KBArticle.find(filter, search ? { score: { $meta: "textScore" } } : {})
        .populate("author", "name")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      KBArticle.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      data: { articles: items, total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
    });
  } catch (err) {
    next(err);
  }
};

// Public — get single published article, increments view count
const getPublished = async (req, res, next) => {
  try {
    const article = await KBArticle.findOneAndUpdate(
      { _id: req.params.id, published: true },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate("author", "name");
    if (!article) throw new AppError("Article not found", 404);
    res.status(200).json({ success: true, data: { article } });
  } catch (err) {
    next(err);
  }
};

// Authenticated — vote helpful/not helpful.
// SECURITY FIX (was public + uncounted):
//   - Requires authentication (route wires authMiddleware)
//   - ONE vote per user — enforced atomically by only matching articles where
//     this user hasn't voted yet ($ne on the voters ledger). No decrement
//     races, no curl-loop counter inflation.
const vote = async (req, res, next) => {
  try {
    const { helpful } = req.body;
    if (typeof helpful !== "boolean") throw new AppError("`helpful` boolean required", 400);

    const article = await KBArticle.findOneAndUpdate(
      { _id: req.params.id, published: true, "voters.user": { $ne: req.user } },
      {
        $push: { voters: { user: req.user, helpful } },
        $inc: helpful ? { helpfulCount: 1 } : { notHelpfulCount: 1 },
      },
      { new: true }
    );

    if (!article) {
      // Distinguish "not found" from "already voted" so the UI can react properly
      const exists = await KBArticle.exists({ _id: req.params.id, published: true });
      if (exists) throw new AppError("You have already voted on this article", 409);
      throw new AppError("Article not found", 404);
    }

    res.status(200).json({ success: true, data: { helpfulCount: article.helpfulCount, notHelpfulCount: article.notHelpfulCount } });
  } catch (err) {
    next(err);
  }
};

// Admin — list all articles (incl. drafts)
const listAll = async (req, res, next) => {
  try {
    const { published, category } = req.query;
    const filter = {};
    if (published !== undefined) filter.published = published === "true";
    if (category) filter.category = category;
    const articles = await KBArticle.find(filter).populate("author", "name").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { articles } });
  } catch (err) {
    next(err);
  }
};

// Admin — create article
const create = async (req, res, next) => {
  try {
    const value = validateOrThrow(createSchema, req.body);

    const slug = slugify(value.title);
    if (!slug) throw new AppError("Title must contain letters or digits to build a slug", 400);
    const existing = await KBArticle.findOne({ slug });
    if (existing) throw new AppError("An article with this title (or a very similar one) already exists", 409);

    const article = await KBArticle.create({ ...value, slug, author: req.user });
    res.status(201).json({ success: true, data: { article } });
  } catch (err) {
    next(err);
  }
};

// Admin — update article
const update = async (req, res, next) => {
  try {
    const value = validateOrThrow(updateSchema, req.body);

    if (value.title) {
      const slug = slugify(value.title);
      if (!slug) throw new AppError("Title must contain letters or digits to build a slug", 400);
      value.slug = slug;
      const existing = await KBArticle.findOne({ slug, _id: { $ne: req.params.id } });
      if (existing) throw new AppError("An article with this title (or a very similar one) already exists", 409);
    }
    const article = await KBArticle.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!article) throw new AppError("Article not found", 404);
    res.status(200).json({ success: true, data: { article } });
  } catch (err) {
    next(err);
  }
};

// Admin — delete article
const remove = async (req, res, next) => {
  try {
    const article = await KBArticle.findByIdAndDelete(req.params.id);
    if (!article) throw new AppError("Article not found", 404);
    res.status(200).json({ success: true, data: { message: "Article deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPublished,
  getPublished,
  vote,
  listAll,
  create,
  update,
  remove,
  slugify,
};
