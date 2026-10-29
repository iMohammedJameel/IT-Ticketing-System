/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Auth service — encapsulates all auth-related API calls
import api from "../api";

export const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),

  // Avatar — multipart file upload (preferred). Legacy base64 endpoint kept
  // for backward compatibility but the UI uses this one.
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  updateProfileImage: (data) => api.put("/auth/update-profile-image", data),
  updateProfile: (data) => api.patch("/auth/profile", data),
  verifyPassword: (data) => api.post("/auth/verify-password", data),

  // MFA (TOTP)
  mfaStatus: () => api.get("/auth/mfa/status"),
  mfaSetup: () => api.post("/auth/mfa/setup"),
  mfaEnable: (token) => api.post("/auth/mfa/enable", { token }),
  mfaDisable: (password) => api.post("/auth/mfa/disable", { password }),

  // Password reset flow
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data) => api.post("/auth/reset-password", data),

  // Email verification
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: () => api.post("/auth/resend-verification"),

  // Admin user management
  getAllUsers: (params) => api.get("/auth/users", { params }),
  // Staff directory (admin + agent) — minimal fields for assignment
  // dropdowns. FIX(QA-004..007): the old call to /auth/users 403'd for
  // agents (admin-only route) and left the assign dropdown empty.
  getStaffDirectory: () => api.get("/auth/staff-directory"),
  toggleUserStatus: (userId) => api.patch(`/auth/users/${userId}/toggle-status`),
  // Role/team management: { role: "user"|"agent"|"admin", team: "..." }
  updateUserRole: (userId, data) => api.patch(`/auth/users/${userId}/role`, data),
  deleteUser: (userId) => api.delete(`/auth/users/${userId}`),
};
