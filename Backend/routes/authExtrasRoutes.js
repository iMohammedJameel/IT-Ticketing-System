const express = require("express");
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controller/authExtrasController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Public — password reset (rate-limited to prevent email spam abuse)
// authLimiter is injected from app.js (15-min window, 10 attempts)
module.exports = (authLimiter) => {
  router.post("/auth/forgot-password", authLimiter, forgotPassword);
  router.post("/auth/reset-password", authLimiter, resetPassword);

  // Public — email verification (rate-limited to prevent token brute-force)
  router.post("/auth/verify-email", authLimiter, verifyEmail);

  // Authenticated — resend verification (rate-limited)
  router.post("/auth/resend-verification", authLimiter, authMiddleware, resendVerification);

  return router;
};
