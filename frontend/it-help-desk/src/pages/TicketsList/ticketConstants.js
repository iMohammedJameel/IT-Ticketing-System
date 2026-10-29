/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Shared ticket constants + formatting helpers (used by all TicketsList parts)
// COLORS: every status/priority color is a CSS variable string ("var(--status-open)")
// that resolves to the semantic palette defined once in src/index.css — light and
// dark themes included. Inline styles support var(), so components can use these
// directly without importing hex values that drift per screen (the old bug).
// QA-uiux (WCAG 1.4.3): `color` = vivid base for DOTS/ICONS/BORDERS;
// `ink` = darkened (light theme) / lightened (dark theme) shade for TEXT on
// tinted badge chips — the base colors measured 2.0–3.8:1 as badge text.
import { formatDate, formatDateTime } from "../../utils/format";

export const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "var(--status-open)", ink: "var(--status-open-ink)" },
  { value: "in-progress", label: "In Progress", color: "var(--status-progress)", ink: "var(--status-progress-ink)" },
  { value: "resolved", label: "Resolved", color: "var(--status-resolved)", ink: "var(--status-resolved-ink)" },
  { value: "closed", label: "Closed", color: "var(--status-closed)", ink: "var(--status-closed-ink)" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "var(--prio-low)", ink: "var(--prio-low-ink)" },
  { value: "medium", label: "Medium", color: "var(--prio-medium)", ink: "var(--prio-medium-ink)" },
  { value: "high", label: "High", color: "var(--prio-high)", ink: "var(--prio-high-ink)" },
  { value: "urgent", label: "Urgent", color: "var(--prio-urgent)", ink: "var(--prio-urgent-ink)" },
];

export const FALLBACK_COMPANIES = [
  "Burger King", "McDonald's", "KFC", "Pizza Hut",
  "Subway", "Starbucks", "Domino's Pizza", "Other",
];

export const CATEGORIES = ["hardware", "software", "network", "access", "other"];

// SLA hours per priority — used by the create-form SLA notice
export const SLA_HOURS = { low: 72, medium: 48, high: 24, urgent: 4 };

export const getStatusInfo = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

export const getPriorityInfo = (priority) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];

// Status flow order — powers the stepper on the ticket detail page
export const STATUS_FLOW = ["open", "in-progress", "resolved", "closed"];

// Concrete hex for SVG-only contexts (recharts fills do not reliably resolve
// CSS var() in presentation attributes). Keep in sync with index.css tokens.
export const CHART_COLORS = {
  open: "#ef4444",
  "in-progress": "#f97316",
  resolved: "#22c55e",
  closed: "#9ca3af",
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

// Notification type → icon + color (bell-everything is unreadable at a glance)
export const NOTIF_META = {
  ticket_created: { icon: "fa-ticket", color: "var(--status-open)" },
  ticket_assigned: { icon: "fa-user-gear", color: "var(--prio-medium)" },
  ticket_status_changed: { icon: "fa-rotate", color: "var(--status-progress)" },
  ticket_commented: { icon: "fa-comment-dots", color: "var(--primary)" },
  sla_breaching: { icon: "fa-clock", color: "var(--prio-urgent)" },
  sla_breached: { icon: "fa-triangle-exclamation", color: "var(--status-open)" },
};
export const getNotifMeta = (type) => NOTIF_META[type] || { icon: "fa-bell", color: "var(--primary)" };

// Re-export the locale-aware formatters so existing imports keep working
export { formatDate, formatDateTime };
