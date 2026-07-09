const Joi = require("joi");

// Password rules: min 8 chars, at least 1 upper, 1 lower, 1 digit
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, "uppercase letter")
  .pattern(/[a-z]/, "lowercase letter")
  .pattern(/[0-9]/, "digit")
  .message({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 128 characters",
    "string.pattern.name":
      "Password must contain at least one {#name}",
  })
  .required();

// Note: role is intentionally ABSENT from registerSchema — role is server-controlled only.
// Promoting a user to admin must be done via a dedicated admin endpoint, never via self-registration.
const registerSchema = Joi.object({
  name: Joi.string().required().min(3).max(50).trim(),
  email: Joi.string().email().required().lowercase().trim(),
  password: passwordSchema,
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required(), // don't reveal rules on login
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim(),
  email: Joi.string().email().lowercase().trim(),
}).min(1);

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: passwordSchema,
});

const verifyPasswordSchema = Joi.object({
  password: Joi.string().required().max(128),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyPasswordSchema,
};
