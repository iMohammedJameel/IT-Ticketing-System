/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// SLA policy controller — staff read, admin update.
// These feed slaPolicyService (60s cache) which ticket creation uses to
// compute due dates, so changes take effect within a minute.
const { AppError } = require("../middleware/errorMiddleware");
const SLAPolicy = require("../models/SLAPolicy");
const slaPolicyService = require("../services/slaPolicyService");
const Joi = require("joi");

const updateSchema = Joi.object({
  hours: Joi.number().min(0.25).max(720).required(),
  businessHoursOnly: Joi.boolean().default(false),
  description: Joi.string().allow("").max(300).trim(),
});

// GET /sla-policies — staff (merged with defaults when collection is empty)
const list = async (req, res, next) => {
  try {
    let policies = await SLAPolicy.find({}).sort({ priority: 1 }).lean();
    if (!policies.length) {
      policies = slaPolicyService.DEFAULT_POLICIES.map((p) => ({ ...p, isDefault: true }));
    }
    res.status(200).json({ success: true, data: { policies } });
  } catch (err) {
    next(err);
  }
};

// PUT /sla-policies/:priority — admin. Upsert per priority.
const update = async (req, res, next) => {
  try {
    const { priority } = req.params;
    if (!slaPolicyService.DEFAULT_POLICIES.some((p) => p.priority === priority)) {
      throw new AppError("Invalid priority", 400);
    }
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const policy = await SLAPolicy.findOneAndUpdate(
      { priority },
      { $set: { ...value, priority } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    slaPolicyService.invalidateCache();
    res.status(200).json({ success: true, data: { policy } });
  } catch (err) {
    next(err);
  }
};

// POST /sla-policies/reset — admin. Restores the default table.
const reset = async (req, res, next) => {
  try {
    await SLAPolicy.deleteMany({});
    const policies = await SLAPolicy.insertMany(slaPolicyService.DEFAULT_POLICIES);
    slaPolicyService.invalidateCache();
    res.status(200).json({ success: true, data: { policies } });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, update, reset };
