/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Canned response service — reusable reply templates for support staff
import api from "../api";

export const cannedResponseService = {
  list: (params) => api.get("/canned-responses", { params }),
  create: (data) => api.post("/canned-responses", data),
  update: (id, data) => api.put(`/canned-responses/${id}`, data),
  remove: (id) => api.delete(`/canned-responses/${id}`),
  markUsed: (id) => api.post(`/canned-responses/${id}/use`),
};
