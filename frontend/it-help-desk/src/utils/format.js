/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Locale-aware date/time formatting — every screen imports from HERE so
// Arabic users get Arabic dates and relative times ("منذ ٥ دقائق"), not
// hardcoded en-GB output.
const cachedLang = () => {
  try {
    return localStorage.getItem("app_language") === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
};

export const formatDate = (date, lang = cachedLang()) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

export const formatDateTime = (date, lang = cachedLang()) => {
  if (!date) return "—";
  return new Date(date).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

// Full "Oct 14, 2025 10:24 AM" style (reference recent-tickets table):
// date + year + time in one string, joined WITHOUT the comma toLocaleString
// would insert — EN uses the reference's US format.
export const formatDateTimeYear = (date, lang = cachedLang()) => {
  if (!date) return "—";
  const d = new Date(date);
  const loc = lang === "ar" ? "ar-EG" : "en-US";
  const datePart = d.toLocaleDateString(loc, {
    month: "short", day: "numeric", year: "numeric",
  });
  const timePart = d.toLocaleTimeString(loc, {
    hour: "numeric", minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
};

// Relative time via Intl.RelativeTimeFormat — "5m ago" / "قبل ٥ دقائق"
export const formatRelativeTime = (dateStr, lang = cachedLang()) => {
  if (!dateStr) return "";
  const diffSec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-EG" : "en", { numeric: "auto" });

  if (diffSec < 60) return rtf.format(-Math.round(diffSec), "second");
  if (diffSec < 3600) return rtf.format(-Math.round(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.round(diffSec / 3600), "hour");
  if (diffSec < 7 * 86400) return rtf.format(-Math.round(diffSec / 86400), "day");
  return formatDate(dateStr, lang);
};

// Short SLA countdown — "3h 20m left" / "Overdue 2h"
export const formatSlaCountdown = (dueDate, overdueText = "Overdue") => {
  if (!dueDate) return null;
  const diffMs = new Date(dueDate).getTime() - Date.now();
  if (diffMs <= 0) {
    const h = Math.abs(diffMs) / 3_600_000;
    return `${overdueText} ${h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`}`;
  }
  const h = diffMs / 3_600_000;
  if (h < 1) return `${Math.round(diffMs / 60000)}m`;
  if (h < 24) return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
  return `${Math.round(h / 24)}d`;
};

// Human-friendly duration for dashboard metrics ("3.2h", "45m")
export const formatMinutes = (minutes) => {
  if (minutes == null || minutes < 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / (60 * 24)).toFixed(1)}d`;
};

// Compact number — 1200 → "1.2K" (stat cards)
export const formatCompact = (n) => {
  if (n == null) return "—";
  return new Intl.NumberFormat(cachedLang() === "ar" ? "ar-EG" : "en", {
    notation: "compact",
  }).format(n);
};
