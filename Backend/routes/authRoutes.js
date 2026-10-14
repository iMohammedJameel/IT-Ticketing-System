/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  changePassword,
  updateProfileImage,
  uploadAvatar,
  getAvatar,
  avatarUpload,
  updateProfile,
  getMe,
  getAllUsers,
  toggleUserStatus,
  updateUserRole,
  deleteUser,
} = require("../controller/authController");
const { verifyPassword } = require("../controller/verifyController");
const { refresh } = require("../controller/refreshTokenController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Auth routes — receive the authLimiter injected from app.js
// (AUTH_RATE_LIMIT_MAX, default 20 req / 15 min / IP — brute-force protection
// for the credential-bearing endpoints; the rest of the API only pays the
// global RATE_LIMIT_MAX budget)
module.exports = (authLimiter) => {
  // Public
  router.post("/auth/register", authLimiter, register);
  router.post("/auth/login", authLimiter, login);
  // Refresh token endpoint — public (validates the refresh token itself)
  router.post("/auth/refresh", refresh);

  // Authenticated
  router.post("/auth/logout", authMiddleware, logout);
  router.get("/auth/me", authMiddleware, getMe);
  router.put("/auth/change-password", authMiddleware, changePassword);
  router.put("/auth/update-profile-image", authMiddleware, updateProfileImage);
  // Avatar — multipart file upload (preferred over the base64 endpoint)
  router.post("/auth/avatar", authMiddleware, avatarUpload.single("file"), uploadAvatar);
  // Avatar — public read (avatars appear in comment threads, not secret)
  router.get("/auth/avatar/:filename", getAvatar);
  router.patch("/auth/profile", authMiddleware, updateProfile);
  router.post("/auth/verify-password", authLimiter, authMiddleware, verifyPassword);

  // Admin-only user management
  router.get("/auth/users", authMiddleware, allowedTo("admin"), getAllUsers);
  router.patch(
    "/auth/users/:userId/toggle-status",
    authMiddleware,
    allowedTo("admin"),
    toggleUserStatus
  );
  // Role/team management (user ↔ agent ↔ admin)
  router.patch(
    "/auth/users/:userId/role",
    authMiddleware,
    allowedTo("admin"),
    updateUserRole
  );
  router.delete("/auth/users/:userId", authMiddleware, allowedTo("admin"), deleteUser);

  return router;
};
