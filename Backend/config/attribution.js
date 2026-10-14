/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Central attribution constants — referenced by the response-header middleware
// in app.js and printed at boot. Part of the project's notice layer (LICENSE +
// NOTICE + source-file headers). Keep in sync with the frontend copy
// (frontend/it-help-desk/src/attribution.js).
const ATTRIBUTION = {
  product: "Jameel IT — Help Desk & Ticketing Platform",
  author: "Mohammed Jameel",
  url: "https://imohammedjameel.github.io/",
  linkedin: "https://www.linkedin.com/in/imohammedjameel/",
  license: "MIT",
  // Unique build signature — lets the author locate copies of this codebase
  // (e.g. via GitHub code search) even after cosmetic renames.
  signature: "JMLIT-4FC9A6FEFD",
};

module.exports = ATTRIBUTION;
module.exports.ATTRIBUTION = ATTRIBUTION;
