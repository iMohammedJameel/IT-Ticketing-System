/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Canned response controller — staff read + usage counter, admin CRUD.
const CannedResponse = require("../models/CannedResponse");
const { AppError } = require("../middleware/errorMiddleware");
const { validateOrThrow } = require("../utils/validation");
const Joi = require("joi");

const createSchema = Joi.object({
  title: Joi.string().min(2).max(100).trim().required(),
  content: Joi.string().min(2).max(2000).trim().required(),
  category: Joi.string().valid("general", "hardware", "software", "network", "access", "other").default("general"),
});

const updateSchema = createSchema.fork(["title", "content"], (s) => s.optional()).min(1);

// GET /canned-responses?category= — staff
const list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const responses = await CannedResponse.find(filter)
      .populate("createdBy", "name")
      .sort({ usageCount: -1, title: 1 })
      .limit(200);
    res.status(200).json({ success: true, data: { responses } });
  } catch (err) {
    next(err);
  }
};

// POST /canned-responses — admin
const create = async (req, res, next) => {
  try {
    const value = validateOrThrow(createSchema, req.body);

    const response = await CannedResponse.create({ ...value, createdBy: req.user });
    res.status(201).json({ success: true, data: { response } });
  } catch (err) {
    next(err);
  }
};

// PUT /canned-responses/:id — admin
const update = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid id", 400);
    const value = validateOrThrow(updateSchema, req.body);

    const response = await CannedResponse.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    if (!response) throw new AppError("Canned response not found", 404);
    res.status(200).json({ success: true, data: { response } });
  } catch (err) {
    next(err);
  }
};

// DELETE /canned-responses/:id — admin
const remove = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid id", 400);
    const response = await CannedResponse.findByIdAndDelete(req.params.id);
    if (!response) throw new AppError("Canned response not found", 404);
    res.status(200).json({ success: true, data: { message: "Canned response deleted" } });
  } catch (err) {
    next(err);
  }
};

// POST /canned-responses/:id/use — staff (increments the popularity counter
// when an agent inserts the template into a comment)
const markUsed = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid id", 400);
    const response = await CannedResponse.findByIdAndUpdate(
      req.params.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );
    if (!response) throw new AppError("Canned response not found", 404);
    res.status(200).json({ success: true, data: { usageCount: response.usageCount } });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove, markUsed };
