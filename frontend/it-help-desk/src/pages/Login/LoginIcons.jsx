/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Login page icons — inline SVG components (outline style, inherit
// currentColor). Extracted from Login.jsx so the page file holds the
// authentication flow only.

/* ── Field icons ── */
export const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const EyeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

/* Directional arrow — flips to flow with RTL via CSS */
export const ArrowIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/* ── Jameel brand mark — used on the AR DOM brand bar and mobile header.
   (The EN desktop brand is pixel-baked inside the background asset.) ── */
export const JameelLogo = ({ className }) => (
  <svg className={className} viewBox="0 0 72 88" fill="none" aria-hidden="true">
    {/* gold pyramid cap (Giza) with inner ridge */}
    <path d="M36 2 L48 18 H24 Z" fill="#C38C48" />
    <path d="M36 2 L36 18" stroke="#A87638" strokeWidth="1.3" />
    {/* headset band arcing from the ear cup up toward the pyramid */}
    <path d="M14.5 40 C14.5 28 22 21 33 20.5" stroke="#0B1F3C" strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* ear cup */}
    <rect x="9" y="38" width="11" height="17" rx="5.5" fill="#0B1F3C" />
    {/* mic boom curling to a gold tip */}
    <path d="M20 52 C22 58 27 61 32.5 61" stroke="#0B1F3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="34.5" cy="61" r="2.6" fill="#C6985C" />
    {/* bold J: top arm + stem + round hook */}
    <path d="M22 30 H50 V56 A13 13 0 0 1 24 57" stroke="#0B1F3C" strokeWidth="8.5" strokeLinecap="round" fill="none" />
    {/* white circuit traces + nodes inside the J stem */}
    <path d="M37 40 V48 M37 44 H44" stroke="#F2F6FB" strokeWidth="2" strokeLinecap="round" />
    <circle cx="37" cy="40" r="2" fill="#F2F6FB" />
    <circle cx="37" cy="48" r="2" fill="#F2F6FB" />
    <circle cx="44" cy="44" r="2" fill="#F2F6FB" />
  </svg>
);

/* ── Solid shield (data-safe footer — solid fill like the reference) ── */
export const SolidShield = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#2563EB" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/* ── Eye of Horus (faint watermark glyph inside the panel) ── */
export const EyeOfHorus = ({ className }) => (
  <svg className={className} viewBox="0 0 120 74" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 38 C28 18 92 18 110 38 C92 58 28 58 10 38 Z" />
    <circle cx="60" cy="38" r="10" />
    <path d="M18 18 C40 6 80 6 102 18" />
    <path d="M42 54 L34 70" />
    <path d="M74 54 C78 66 74 72 66 74" />
    <path d="M86 52 L96 66" />
  </svg>
);
