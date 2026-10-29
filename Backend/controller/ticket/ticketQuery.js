/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket query builder — pure function that turns validated query params
// into a MongoDB filter. Extracted from ticketController.js so the read
// handler stays thin and the filter logic becomes unit-testable in isolation.
//
// SEARCH — was: 4 un-anchored case-insensitive regexes (description, product,
// employee, ticketNumber) = 4 full collection scans per request. Now:
//   - "TKT-…" style queries  → anchored prefix regex on the INDEXED
//     ticketNumber field (index-backed, anchored at ^)
//   - everything else         → MongoDB $text search using the ticket text
//     index (tokenized, relevance-ranked, index-backed)
const { isStaff } = require("../../utils/roles");
const { escapeRegex } = require("../../utils/regex");

// At-risk view — active tickets due within 4h (or already past due)
const SLA_AT_RISK_WINDOW_MS = 4 * 60 * 60 * 1000;

const TICKET_NUMBER_PREFIX_RE = /^TKT[-\d]{1,24}$/i;
const DIGIT_FRAGMENT_RE = /^[\d-]{1,24}$/;

// Sanitize a raw search string into safe $text terms: strip operators
// (`-word`, `"phrases"`, escapes) so users can't sculpt the query.
const toSafeTextTerms = (search) =>
  search
    .trim()
    .replace(/["\\]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[-+]/, ""))
    .filter((t) => t.length >= 2)
    .slice(0, 8)
    .join(" ");

/**
 * Build the MongoDB filter for GET /tickets.
 *
 * @param {object} value  validated query params (page/limit/sort/order/status/
 *                        priority/category/company/companyId/team/tag/
 *                        assignedTo/unassigned/slaAtRisk/search)
 * @param {object} ctx    { user, userRole } from authMiddleware
 * @returns {{ query: object, textScore: boolean }}
 */
const buildTicketQuery = (value, ctx) => {
  const {
    status, priority, category, company, companyId, team, tag,
    assignedTo, unassigned, slaAtRisk, search, from, to,
  } = value;

  // Staff (admin + agent) sees all; regular user sees only their own.
  const query = isStaff(ctx.userRole) ? {} : { user: ctx.user };
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (company) query.company = company;
  if (companyId) query.companyId = companyId;
  if (team) query.team = team;
  // ADD(QA-rec-4): date range on createdAt — from inclusive, to exclusive
  // (the client sends to = selected day + 1). Applied AFTER the base scope
  // so a regular user can only ever narrow within their OWN tickets.
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lt = new Date(to);
  }
  // "me" resolves to the authenticated user — powers the agent queue
  if (assignedTo) query.assignedTo = assignedTo === "me" ? ctx.user : assignedTo;
  // Triage view — tickets nobody picked up yet
  if (unassigned) query.assignedTo = null;
  // At-risk view — active tickets due within 4h (or already past due)
  if (slaAtRisk) {
    query.slaDueDate = { $ne: null, $lte: new Date(Date.now() + SLA_AT_RISK_WINDOW_MS) };
    query.status = { $nin: ["resolved", "closed"] };
  }
  if (tag) query.tags = tag; // exact (lowercased) tag match — indexed

  let textScore = false;
  if (search) {
    const cleaned = search.trim();
    if (TICKET_NUMBER_PREFIX_RE.test(cleaned)) {
      // Ticket-number lookup — anchored regex on the indexed field
      // (matches "TKT", "TKT-2026", "TKT-2026-0001" progressively)
      query.ticketNumber = { $regex: `^${escapeRegex(cleaned)}`, $options: "i" };
    } else if (DIGIT_FRAGMENT_RE.test(cleaned)) {
      // Bare digit fragment ("0007", "2026-0007") — the command palette and
      // search box send these. Contains-match on ticketNumber (regex specials
      // escaped) so "0007" finds TKT-2026-0007. Falls through to $text only
      // when the query isn't pure digits/hyphens.
      query.ticketNumber = { $regex: escapeRegex(cleaned), $options: "i" };
    } else {
      // Full-text search on the text index.
      const safeTerms = toSafeTextTerms(cleaned);
      if (safeTerms) {
        query.$text = { $search: safeTerms };
        textScore = true; // rank by relevance while we're at it
      }
    }
  }

  return { query, textScore };
};

module.exports = { buildTicketQuery };
