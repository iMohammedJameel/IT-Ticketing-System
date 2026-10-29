/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Auth helpers — token signing, refresh-token storage, lockout constants.
// Extracted from authController.js so login/changePassword/register share
// one clearly-named place for the crypto/retention rules.
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { hashToken } = require("../refreshTokenController");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 min
// Cap stored refresh tokens to last 5 — shared by login and changePassword
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORED_REFRESH_TOKENS = 5;

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, v: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: "HS256" }
  );

const storeRefreshToken = (user, refreshToken) => {
  user.refreshTokens.push({
    token: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  if (user.refreshTokens.length > MAX_STORED_REFRESH_TOKENS) {
    user.refreshTokens = user.refreshTokens.slice(-MAX_STORED_REFRESH_TOKENS);
  }
};

// Shared failure-path bookkeeping for login + MFA verification:
// increments the failed-attempt counter and locks the account when the
// threshold is reached. Returns the message/status the caller should throw.
const registerFailedLoginAttempt = (user) => {
  user.failedLoginAttempts += 1;
  if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }
};

const LOGIN_ERRORS = {
  INVALID: "Invalid credentials",
  LOCKED: "Account temporarily locked. Try again in 15 minutes.",
};

module.exports = {
  signToken,
  storeRefreshToken,
  registerFailedLoginAttempt,
  LOGIN_ERRORS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_TIME_MS,
};
