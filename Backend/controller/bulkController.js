/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Bulk operations + CSV export — public entry point (re-exports).
//
// The implementation was split into focused modules under ./bulk/:
//   bulk/bulkSchemas.js       — shared Joi validation (id lists, status, assignee)
//   bulk/bulkOpsController.js — status / assign / delete mutations (admin only)
//   bulk/exportController.js  — CSV export + activity feed (read-only)
//
// The export surface below is UNCHANGED, so routes/bulkRoutes.js keeps
// working without a single edit.
const { bulkStatus, bulkAssign, bulkDelete } = require("./bulk/bulkOpsController");
const { exportCsv, getActivityFeed } = require("./bulk/exportController");

module.exports = { bulkStatus, bulkAssign, bulkDelete, exportCsv, getActivityFeed };
