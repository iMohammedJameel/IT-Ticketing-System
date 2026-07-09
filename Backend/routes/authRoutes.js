const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  changePassword,
  updateProfileImage,
  updateProfile,
  getMe,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
} = require("../controller/authController");
const { verifyPassword } = require("../controller/verifyController");
const { refresh } = require("../controller/refreshTokenController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Auth routes — receive the authLimiter injected from app.js
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
  router.delete("/auth/users/:userId", authMiddleware, allowedTo("admin"), deleteUser);

  return router;
};
