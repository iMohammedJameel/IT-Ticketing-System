/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Company controller — CRUD for the B2B customer directory.
// Read access for staff (admin + agent); mutations admin-only.
const Company = require("../models/Company");
const Ticket = require("../models/Ticket");
const { AppError } = require("../middleware/errorMiddleware");
const Joi = require("joi");

const upsertSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  contactName: Joi.string().allow("").max(100).trim(),
  // tlds:false — HTML5 email inputs accept non-IANA TLDs (e.g. "qa@company.test"),
  // so the FE passed while Joi (IANA allowlist) rejected — BUG-qa7-9. Structure
  // validation only, no TLD policing.
  email: Joi.string().allow("").email({ tlds: false }).max(200).trim(),
  phone: Joi.string().allow("").max(40).trim(),
  notes: Joi.string().allow("").max(2000).trim(),
  active: Joi.boolean(),
});

const updateSchema = upsertSchema.fork(["name"], (s) => s.optional()).min(1);

// GET /companies — staff. Optional ?active=true&search=
const list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === "true") filter.active = true;
    if (req.query.active === "false") filter.active = false;
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: escaped, $options: "i" };
    }
    const companies = await Company.find(filter).sort({ name: 1 }).limit(500);
    res.status(200).json({ success: true, data: { companies } });
  } catch (err) {
    next(err);
  }
};

// GET /companies/:id — staff, includes open-ticket stats
const getOne = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid company id", 400);
    const company = await Company.findById(req.params.id);
    if (!company) throw new AppError("Company not found", 404);

    const [total, open] = await Promise.all([
      Ticket.countDocuments({ companyId: company._id }),
      Ticket.countDocuments({ companyId: company._id, status: { $in: ["open", "in-progress"] } }),
    ]);
    res.status(200).json({ success: true, data: { company, stats: { total, open } } });
  } catch (err) {
    next(err);
  }
};

// POST /companies — admin
const create = async (req, res, next) => {
  try {
    const { error, value } = upsertSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const existing = await Company.findOne({ name: { $regex: `^${value.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (existing) throw new AppError("A company with this name already exists", 409);

    const company = await Company.create({ ...value, createdBy: undefined });
    res.status(201).json({ success: true, data: { company } });
  } catch (err) {
    next(err);
  }
};

// PUT /companies/:id — admin
const update = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid company id", 400);
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    if (value.name) {
      const dup = await Company.findOne({
        name: { $regex: `^${value.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        _id: { $ne: req.params.id },
      });
      if (dup) throw new AppError("A company with this name already exists", 409);
    }

    const company = await Company.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    if (!company) throw new AppError("Company not found", 404);

    // Keep the denormalized text on tickets in sync when the name changes
    if (value.name) {
      await Ticket.updateMany({ companyId: company._id }, { $set: { company: company.name } });
    }
    res.status(200).json({ success: true, data: { company } });
  } catch (err) {
    next(err);
  }
};

// DELETE /companies/:id — admin. Soft-delete (deactivate) when tickets exist,
// hard delete otherwise. Never orphans ticket history.
const remove = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid company id", 400);
    const company = await Company.findById(req.params.id);
    if (!company) throw new AppError("Company not found", 404);

    const ticketCount = await Ticket.countDocuments({ companyId: company._id });
    if (ticketCount > 0) {
      company.active = false;
      await company.save();
      return res.status(200).json({
        success: true,
        data: { message: `Company deactivated (${ticketCount} tickets keep their history)` },
      });
    }
    await Company.findByIdAndDelete(company._id);
    res.status(200).json({ success: true, data: { message: "Company deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
