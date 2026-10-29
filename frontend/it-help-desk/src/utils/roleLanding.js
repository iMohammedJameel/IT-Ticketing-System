/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Role-aware landing route — single source of truth. This logic was
// previously duplicated in three places (Login.finishLogin, the "/" route
// and the "*" fallback inside Dashboard.jsx) that could drift apart when
// a new role or landing page is added.

export const getRoleLanding = (user) => {
  if (!user) return "/login";
  if (user.role === "admin") return "/dashboard";
  if (user.role === "agent") return "/queue";
  return "/home";
};
