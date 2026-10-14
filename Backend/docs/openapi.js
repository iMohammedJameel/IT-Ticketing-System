// OpenAPI 3.0 spec — served at GET /api/docs (JSON) with a lightweight
// Swagger-UI page at GET /api/docs-ui. Hand-written (zero dependencies —
// swagger-jsdoc/swagger-ui-express would add ~40 MB to the image for a spec
// we can author directly).

const bearer = [{ bearerAuth: [] }];
const pathParam = (name) => ({ name, in: "path", required: true, schema: { type: "string" } });

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Jameel IT Ticketing System API",
    version: "2.0.0",
    description:
      "Full-stack IT help desk API. All routes are mounted under /api (legacy) and /api/v1. " +
      "Authentication uses `Authorization: Bearer <accessToken>`. " +
      "Roles: user (requests tickets), agent (works tickets), admin (full management).",
  },
  servers: [
    { url: "/", description: "Same-origin (nginx proxy / docker-compose)" },
    { url: "http://localhost:5000", description: "Local dev" },
  ],
  tags: [
    { name: "Auth" }, { name: "MFA" }, { name: "Users" }, { name: "Tickets" },
    { name: "Comments" }, { name: "Attachments" }, { name: "Notifications" },
    { name: "Knowledge Base" }, { name: "Bulk" }, { name: "Companies" },
    { name: "Canned Responses" }, { name: "SLA Policies" }, { name: "Inbound Email" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths: {
    "/health": {
      get: { tags: ["Auth"], summary: "Health check", responses: { 200: { description: "OK" } } },
    },

    // ---------------- Auth ----------------
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register (role forced to 'user'; anti-enumeration)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created (same envelope for duplicate emails)" },
          400: { description: "Validation error" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login (returns 401 mfa_required when MFA is enabled)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  mfaToken: { type: "string", description: "TOTP or recovery code — required if MFA enabled" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "token + refreshToken + user" },
          401: { description: "Invalid credentials / MFA required (details[0].code = mfa_required)" },
        },
      },
    },
    "/auth/refresh": { post: { tags: ["Auth"], summary: "Rotate refresh token pair", responses: { 200: { description: "New pair" } } } },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Logout (revokes all sessions)", security: bearer, responses: { 200: { description: "OK" } } } },
    "/auth/me": { get: { tags: ["Auth"], summary: "Current user", security: bearer, responses: { 200: { description: "User" } } } },
    "/auth/avatar": { post: { tags: ["Auth"], summary: "Upload avatar (multipart, field `file`)", security: bearer, responses: { 200: { description: "Updated user" } } } },
    "/auth/avatar/{filename}": { get: { tags: ["Auth"], summary: "Fetch avatar image (public)", parameters: [pathParam("filename")], responses: { 200: { description: "Image bytes" } } } },

    // ---------------- Users ----------------
    "/auth/users": { get: { tags: ["Users"], summary: "List users (admin; ?role=admin,agent)", security: bearer, responses: { 200: { description: "Paginated users" } } } },
    "/auth/users/{id}/role": { patch: { tags: ["Users"], summary: "Set role/team (admin)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Updated user" } } } },
    "/auth/users/{id}/toggle-status": { patch: { tags: ["Users"], summary: "Suspend/activate (admin)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Updated user" } } } },

    // ---------------- MFA ----------------
    "/auth/mfa/setup": { post: { tags: ["MFA"], summary: "Begin TOTP enrollment (returns otpauth URI + QR)", security: bearer, responses: { 200: { description: "secret + otpauthUrl + qrDataUrl (self-hosted PNG data URL)" } } } },
    "/auth/mfa/enable": { post: { tags: ["MFA"], summary: "Confirm enrollment with a 6-digit code; returns recovery codes ONCE", security: bearer, responses: { 200: { description: "recoveryCodes" } } } },
    "/auth/mfa/disable": { post: { tags: ["MFA"], summary: "Disable MFA (requires password)", security: bearer, responses: { 200: { description: "OK" } } } },

    // ---------------- Tickets ----------------
    "/tickets": {
      get: { tags: ["Tickets"], summary: "List tickets (staff: all; user: own). Filters: status/priority/category/company/companyId/team/tag/assignedTo/search", security: bearer, responses: { 200: { description: "Paginated tickets" } } },
      post: { tags: ["Tickets"], summary: "Create ticket (SLA due date from SLA policies)", security: bearer, responses: { 201: { description: "Ticket" } } },
    },
    "/tickets/stats": { get: { tags: ["Tickets"], summary: "Dashboard stats + FRT/resolution/SLA-compliance/CSAT metrics (staff)", security: bearer, responses: { 200: { description: "Stats" } } } },
    "/tickets/{id}": {
      get: { tags: ["Tickets"], summary: "Get ticket", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Ticket" } } },
      put: { tags: ["Tickets"], summary: "Update ticket (staff)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Ticket" } } },
    },
    "/tickets/{id}/status": { patch: { tags: ["Tickets"], summary: "Change status (staff)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Ticket" } } } },
    "/tickets/{id}/priority": { patch: { tags: ["Tickets"], summary: "Change priority + recompute SLA (staff)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Ticket" } } } },
    "/tickets/{id}/assign": { patch: { tags: ["Tickets"], summary: "Assign to admin/agent (staff)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Ticket" } } } },
    "/tickets/{id}/csat": { post: { tags: ["Tickets"], summary: "Rate a resolved/closed ticket 1-5 (requester only, once)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "csat" } } } },

    // ---------------- Comments / Attachments ----------------
    "/tickets/{id}/comments": {
      get: { tags: ["Comments"], summary: "List comments (internal hidden from non-staff)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Comments" } } },
      post: { tags: ["Comments"], summary: "Add comment (staff may mark internal)", security: bearer, parameters: [pathParam("id")], responses: { 201: { description: "Comment" } } },
    },
    "/tickets/{id}/attachments": { post: { tags: ["Attachments"], summary: "Upload attachment (multipart; magic-byte validated; disk or S3)", security: bearer, parameters: [pathParam("id")], responses: { 201: { description: "Attachment" } } } },
    "/tickets/{id}/attachments/{filename}": {
      get: {
        tags: ["Attachments"],
        summary: "Download attachment (auth; forces download)",
        security: bearer,
        parameters: [pathParam("id"), pathParam("filename")],
        responses: { 200: { description: "File stream" } },
      },
    },

    // ---------------- Notifications / KB / Bulk ----------------
    "/notifications": { get: { tags: ["Notifications"], summary: "List own notifications", security: bearer, responses: { 200: { description: "Paginated" } } } },
    "/kb": { get: { tags: ["Knowledge Base"], summary: "Search published articles ($text search)", responses: { 200: { description: "Articles" } } } },
    "/kb/{id}/vote": { post: { tags: ["Knowledge Base"], summary: "Vote helpful (auth; one vote per user)", security: bearer, parameters: [pathParam("id")], responses: { 200: { description: "Counts" }, 409: { description: "Already voted" } } } },
    "/tickets/bulk/status": { post: { tags: ["Bulk"], summary: "Bulk status change (staff)", security: bearer, responses: { 200: { description: "modifiedCount" } } } },
    "/tickets/bulk/assign": { post: { tags: ["Bulk"], summary: "Bulk assign (staff)", security: bearer, responses: { 200: { description: "modifiedCount" } } } },
    "/tickets/bulk/delete": { post: { tags: ["Bulk"], summary: "Bulk delete (admin; cascades)", security: bearer, responses: { 200: { description: "deletedCount" } } } },
    "/tickets/export/csv": { get: { tags: ["Bulk"], summary: "CSV export (formula-injection safe; admin)", security: bearer, responses: { 200: { description: "CSV text (UTF-8 BOM)" } } } },

    // ---------------- New resources ----------------
    "/companies": {
      get: { tags: ["Companies"], summary: "Company directory (staff)", security: bearer, responses: { 200: { description: "Companies" } } },
      post: { tags: ["Companies"], summary: "Create company (admin)", security: bearer, responses: { 201: { description: "Company" } } },
    },
    "/canned-responses": {
      get: { tags: ["Canned Responses"], summary: "Templates sorted by usage (staff)", security: bearer, responses: { 200: { description: "Responses" } } },
      post: { tags: ["Canned Responses"], summary: "Create template (admin)", security: bearer, responses: { 201: { description: "Response" } } },
    },
    "/sla-policies": { get: { tags: ["SLA Policies"], summary: "Effective SLA policies (staff)", security: bearer, responses: { 200: { description: "Policies" } } } },
    "/sla-policies/{priority}": {
      put: {
        tags: ["SLA Policies"],
        summary: "Upsert policy {hours, businessHoursOnly} (admin)",
        security: bearer,
        parameters: [{ name: "priority", in: "path", required: true, schema: { type: "string", enum: ["low", "medium", "high", "urgent"] } }],
        responses: { 200: { description: "Policy" } },
      },
    },
    "/inbound/email": {
      post: {
        tags: ["Inbound Email"],
        summary: "Email → ticket webhook (x-inbound-secret header; disabled unless INBOUND_EMAIL_SECRET set)",
        responses: { 201: { description: "ticketNumber" }, 403: { description: "Invalid secret" } },
      },
    },
  },
};

module.exports = openapi;
