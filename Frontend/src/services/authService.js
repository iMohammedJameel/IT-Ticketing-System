// Auth service — encapsulates all auth-related API calls
import api from "../api";

export const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
  updateProfileImage: (data) => api.put("/auth/update-profile-image", data),
  updateProfile: (data) => api.patch("/auth/profile", data),
  verifyPassword: (data) => api.post("/auth/verify-password", data),

  // Password reset flow
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data) => api.post("/auth/reset-password", data),

  // Email verification
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: () => api.post("/auth/resend-verification"),

  // Admin user management
  getAllUsers: (params) => api.get("/auth/users", { params }),
  toggleUserStatus: (userId) => api.patch(`/auth/users/${userId}/toggle-status`),
  deleteUser: (userId) => api.delete(`/auth/users/${userId}`),
};
