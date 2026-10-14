/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controller/authExtrasController");
const {
  setup: mfaSetup,
  enable: mfaEnable,
  disable: mfaDisable,
  status: mfaStatus,
} = require("../controller/mfaController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Public — password reset + email verification (rate-limited: the strict
// AUTH_RATE_LIMIT_MAX budget from app.js, default 20 / 15 min / IP — these
// endpoints take tokens/credentials and must not be brute-forceable)
module.exports = (authLimiter) => {
  router.post("/auth/forgot-password", authLimiter, forgotPassword);
  router.post("/auth/reset-password", authLimiter, resetPassword);

  // Public — email verification (rate-limited to prevent token brute-force)
  router.post("/auth/verify-email", authLimiter, verifyEmail);

  // Authenticated — resend verification (rate-limited)
  router.post("/auth/resend-verification", authLimiter, authMiddleware, resendVerification);

  // MFA (TOTP) — setup/enable/disable, all authenticated
  router.get("/auth/mfa/status", authMiddleware, mfaStatus);
  router.post("/auth/mfa/setup", authLimiter, authMiddleware, mfaSetup);
  router.post("/auth/mfa/enable", authLimiter, authMiddleware, mfaEnable);
  router.post("/auth/mfa/disable", authLimiter, authMiddleware, mfaDisable);

  return router;
};
