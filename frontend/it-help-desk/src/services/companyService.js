/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Company service — the B2B customer directory (admin/agent)
import api from "../api";

export const companyService = {
  list: (params) => api.get("/companies", { params }),
  getOne: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post("/companies", data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  remove: (id) => api.delete(`/companies/${id}`),
};
