/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Shared role helpers.
// "staff" = anyone who works tickets: admins AND agents.
// Introduced with the agent role so controllers don't hardcode `role === "admin"`
// in a dozen places (which was the root cause of tickets being assignable to
// admins only).
const STAFF_ROLES = ["admin", "agent"];

const isStaff = (role) => role === "admin" || role === "agent";

// Roles that can be assigned a ticket
const ASSIGNABLE_ROLES = ["admin", "agent"];

module.exports = { STAFF_ROLES, ASSIGNABLE_ROLES, isStaff };
