/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const Joi = require("joi");

// Password rules: min 8 chars, at least 1 letter, at least 1 digit.
// NOTE: intentionally does NOT require uppercase/lowercase mix — the policy
// must stay consistent with the credentials this system ships with (seeded
// accounts use e.g. "password123"). Requiring an uppercase letter made it
// impossible to revert to those passwords through the API.
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Za-z]/, "letter")
  .pattern(/[0-9]/, "digit")
  .message({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 128 characters",
    "string.pattern.name": "Password must contain at least one {#name}",
  })
  .required();

// Note: role is intentionally ABSENT from registerSchema — role is server-controlled only.
// Promoting a user to admin must be done via a dedicated admin endpoint, never via self-registration.
// email({ tlds: false }): HTML5 email inputs accept non-IANA TLDs (e.g.
// "qa@company.test") — FE/BE consistency (BUG-qa7-9).
const registerSchema = Joi.object({
  name: Joi.string().required().min(3).max(50).trim(),
  email: Joi.string().email({ tlds: false }).required().lowercase().trim(),
  password: passwordSchema,
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: false }).required().lowercase().trim(),
  password: Joi.string().required(), // don't reveal rules on login
  // 6-digit TOTP code OR a recovery code — only checked when the account has
  // MFA enabled. Absent for normal logins.
  mfaToken: Joi.string().allow("").max(20).trim(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
});

// Notification-preference keys — MUST mirror the User model's
// `notificationPrefs` subdocument exactly (the Settings panel toggles these).
const notificationPrefsSchema = Joi.object({
  ticketCreated: Joi.boolean(),
  ticketAssigned: Joi.boolean(),
  ticketStatusChanged: Joi.boolean(),
  ticketCommented: Joi.boolean(),
  slaBreaching: Joi.boolean(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim(),
  email: Joi.string().email({ tlds: false }).lowercase().trim(),
  // Notification preferences (Settings → Personal Details panel)
  notificationPrefs: notificationPrefsSchema,
  // Job details (Settings → Job Details tab) — moved from localStorage to the
  // User document. Empty strings allowed so the fields can be cleared.
  jobTitle: Joi.string().allow("").max(100).trim(),
  department: Joi.string().allow("").max(100).trim(),
  phone: Joi.string().allow("").max(30).trim(),
}).min(1);

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: false }).required().lowercase().trim(),
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
