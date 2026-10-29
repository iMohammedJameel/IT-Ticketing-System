/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Shared validation helper — single implementation of the Joi validate-
// or-throw pattern that was previously copy-pasted 28 times across
// controllers (5 identical lines each). Controllers now call:
//   const value = validateOrThrow(schema, req.body);
const { AppError } = require("../middleware/errorMiddleware");

const VALIDATE_OPTS = { abortEarly: false, stripUnknown: true };

const validateOrThrow = (schema, data, opts = VALIDATE_OPTS) => {
  const { error, value } = schema.validate(data, opts);
  if (error) {
    throw new AppError("Validation error", 400, error.details.map((d) => d.message));
  }
  return value;
};

module.exports = { validateOrThrow };
