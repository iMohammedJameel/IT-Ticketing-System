/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Rate limiter factory — two tiers, extracted from app.js:
//   1. globalLimiter  — RATE_LIMIT_MAX (default 500) per IP / 15 min across
//      the whole /api surface. A polling SPA comfortably fits in 500; the old
//      default of 100 throttled normal browsing.
//   2. authLimiter    — AUTH_RATE_LIMIT_MAX (default 20) per IP / 15 min,
//      mounted ONLY on the credential-bearing auth routes (login, register,
//      forgot-password, reset-password, verify-email, resend-verification —
//      see routes/authRoutes.js + routes/authExtrasRoutes.js). Tight enough
//      to make brute-forcing passwords/tokens impractical, without touching
//      the rest of the API.
const rateLimit = require("express-rate-limit");
const env = require("./env");

const RATE_LIMIT_MESSAGE = {
  success: false,
  error: { message: "Too many requests, please try again later." },
};
const AUTH_RATE_LIMIT_MESSAGE = {
  success: false,
  error: { message: "Too many attempts. Please try again in a few minutes." },
};

// Don't rate-limit the health check endpoint — Kubernetes liveness/readiness
// probes hit it every few seconds and would otherwise exhaust the budget,
// causing the orchestrator to mark the pod unhealthy and restart it.
const skipHealthChecks = (req) =>
  req.path === "/api/health" || req.path === "/api/v1/health";

const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHealthChecks,
  message: RATE_LIMIT_MESSAGE,
});

const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // same 15-min window as the global limiter
  max: env.authRateLimitMax, // default 20 — brute-force protection where it matters
  standardHeaders: true,
  legacyHeaders: false,
  message: AUTH_RATE_LIMIT_MESSAGE,
  // Skip rate limiting entirely in test mode — integration tests fire many
  // auth requests in rapid succession.
  skip: (req) => process.env.NODE_ENV === "test",
});

module.exports = { globalLimiter, authLimiter, skipHealthChecks };
