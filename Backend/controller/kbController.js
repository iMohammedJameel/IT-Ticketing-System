// Knowledge base controller — CRUD + search + helpful voting
const KBArticle = require("../models/KBArticle");
const { AppError } = require("../middleware/errorMiddleware");
const Joi = require("joi");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);

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

// Public — vote helpful/not helpful
const vote = async (req, res, next) => {
  try {
    const { helpful } = req.body;
    if (typeof helpful !== "boolean") throw new AppError("`helpful` boolean required", 400);
    const article = await KBArticle.findOneAndUpdate(
      { _id: req.params.id, published: true },
      { $inc: helpful ? { helpfulCount: 1 } : { notHelpfulCount: 1 } },
      { new: true }
    );
    if (!article) throw new AppError("Article not found", 404);
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
    const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const slug = slugify(value.title);
    const existing = await KBArticle.findOne({ slug });
    if (existing) throw new AppError("An article with this title already exists", 409);

    const article = await KBArticle.create({ ...value, slug, author: req.user });
    res.status(201).json({ success: true, data: { article } });
  } catch (err) {
    next(err);
  }
};

// Admin — update article
const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    if (value.title) value.slug = slugify(value.title);
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
};
