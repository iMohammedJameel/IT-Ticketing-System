/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Create-ticket form configuration — extractable constants + pure helpers.
// Split out of Tickets.jsx so the page component holds layout + flow only.
// FALLBACK_COMPANIES / CATEGORIES are re-used from the shared TicketsList
// constants instead of being duplicated per page (DRY).
import { FALLBACK_COMPANIES, CATEGORIES } from "../TicketsList/ticketConstants";

export { FALLBACK_COMPANIES, CATEGORIES };

const PRODUCTS = [
  "E-Invoice", "E-Receipt", "POS System", "Accounting Software",
  "Inventory Management", "CRM System", "Other",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

const PRIORITY_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

/* QA-uiux (WCAG 1.4.3): theme-aware TEXT inks for the ACTIVE priority chip —
   the vivid bg + white text measured 2.1:1 (medium). Mirrors the ticket-badge
   ink vars so the selector speaks the same visual language as the badges. */
const PRIORITY_INKS = {
  low: "var(--prio-low-ink)",
  medium: "var(--prio-medium-ink)",
  high: "var(--prio-high-ink)",
  urgent: "var(--prio-urgent-ink)",
};

// Default SLA hours (mirror of backend fallbacks) — replaced by live policies
const DEFAULT_SLA_HOURS = { low: "72h", medium: "48h", high: "24h", urgent: "4h" };

// Max file size per attachment (mirrors the backend attachment limit)
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// Parse "Comma, separated,tags" → clean lowercase array (max 10)
export const parseTags = (raw) =>
  [...new Set(
    raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2 && t.length <= 30)
  )].slice(0, 10);

export {
  PRODUCTS,
  PRIORITIES,
  PRIORITY_COLORS,
  PRIORITY_INKS,
  DEFAULT_SLA_HOURS,
  MAX_ATTACHMENT_BYTES,
};
