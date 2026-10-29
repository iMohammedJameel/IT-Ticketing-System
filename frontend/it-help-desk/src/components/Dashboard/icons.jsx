/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Stroke icon set (24px, stroke 2 — Lucide style, mirrors the Sidebar).
// Extracted to their own module: 20 inline SVG components were ~135 lines
// of noise at the top of DashboardContent.jsx.
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconTicket = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
  </svg>
);
export const IconAlertCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" /><path d="M12 16h.01" />
  </svg>
);
export const IconHourglass = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M5 22h14" /><path d="M5 2h14" />
    <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
    <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
  </svg>
);
export const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconWarning = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M5 12h14" /><path d="M12 5v14" />
  </svg>
);
export const IconList = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
    <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
  </svg>
);
export const IconBookOpen = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
export const IconGear = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
export const IconHeadset = () => (
  <svg viewBox="0 0 24 24" width="44" height="44" {...stroke} aria-hidden="true">
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1z" />
    <path d="M21 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1z" />
    <path d="M21 17v1a4 4 0 0 1-4 4h-4" />
  </svg>
);
export const IconUser = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
export const IconLock = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
export const IconBell = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
export const IconLogout = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
  </svg>
);
export const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...stroke} aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
export const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);
export const IconTrendUp = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} aria-hidden="true">
    <path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
  </svg>
);
export const IconTrendDown = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} aria-hidden="true">
    <path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" />
  </svg>
);
export const IconTrophy = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
export const IconCrown = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path d="M5 20h14" />
  </svg>
);
export const IconBars = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
  </svg>
);
