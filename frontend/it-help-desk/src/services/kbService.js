/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Knowledge base service — public + admin
import api from "../api";

export const kbService = {
  // Public
  list: (params) => api.get("/kb", { params }),
  getById: (id) => api.get(`/kb/${id}`),
  vote: (id, helpful) => api.post(`/kb/${id}/vote`, { helpful }),

  // Admin
  listAll: (params) => api.get("/admin/kb", { params }),
  create: (data) => api.post("/admin/kb", data),
  update: (id, data) => api.put(`/admin/kb/${id}`, data),
  remove: (id) => api.delete(`/admin/kb/${id}`),
};
