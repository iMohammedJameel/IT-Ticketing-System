/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Shared regex escape — was duplicated inline in 6 places across 5 files
// (ticketController, authController, companyController ×3, inboundEmailController).
// Without escaping, characters like "." or ".*" act as regex metacharacters —
// `?search=.*` would match everything and crafted input could backtrack hard.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
