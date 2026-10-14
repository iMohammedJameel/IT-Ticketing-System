/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket service — all ticket-related API calls
import api from "../api";

export const ticketService = {
  create: (data) => api.post("/tickets", data),
  list: (params) => api.get("/tickets", { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  updateStatus: (id, data) => api.patch(`/tickets/${id}/status`, data),
  updatePriority: (id, data) => api.patch(`/tickets/${id}/priority`, data),
  assign: (id, data) => api.patch(`/tickets/${id}/assign`, data),
  getStats: () => api.get("/tickets/stats"),

  // CSAT — requester rates a resolved ticket (once)
  rateCsat: (id, data) => api.post(`/tickets/${id}/csat`, data),

  // Attachments
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/tickets/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteAttachment: (id, attachmentId) =>
    api.delete(`/tickets/${id}/attachments/${attachmentId}`),

  // Bulk operations (staff)
  bulkStatus: (ids, status) => api.post("/tickets/bulk/status", { ids, status }),
  bulkAssign: (ids, assignedTo) => api.post("/tickets/bulk/assign", { ids, assignedTo }),
  bulkDelete: (ids) => api.post("/tickets/bulk/delete", { ids }),
  exportCsv: (params) =>
    api.get("/tickets/export/csv", { params, responseType: "blob" }),

  // Comments
  addComment: (ticketId, data) => api.post(`/tickets/${ticketId}/comments`, data),
  getComments: (ticketId) => api.get(`/tickets/${ticketId}/comments`),
  updateComment: (id, data) => api.patch(`/comments/${id}`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),

  // SLA policies (staff) — powers the create-form SLA notice
  getSlaPolicies: () => api.get("/sla-policies"),
};
