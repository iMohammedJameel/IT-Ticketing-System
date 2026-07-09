// Notification service — in-app notifications
import api from "../api";

export const notificationService = {
  list: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/mark-all-read"),
  delete: (id) => api.delete(`/notifications/${id}`),
};
