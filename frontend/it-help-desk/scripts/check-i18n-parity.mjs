/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// i18n parity check — asserts en.js and ar.js export the SAME key set.
// Usage: node scripts/check-i18n-parity.mjs
// Exits 1 (with a diff report) when keys are missing on either side.
import { EN } from "../src/i18n/en.js";
import { AR } from "../src/i18n/ar.js";

const flatten = (obj, prefix = "", out = new Set()) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.add(key);
  }
  return out;
};

const enKeys = flatten(EN);
const arKeys = flatten(AR);

const missingInAr = [...enKeys].filter((k) => !arKeys.has(k)).sort();
const missingInEn = [...arKeys].filter((k) => !enKeys.has(k)).sort();

console.log(`EN keys: ${enKeys.size}`);
console.log(`AR keys: ${arKeys.size}`);

if (missingInAr.length) console.log("\nMissing in AR:", missingInAr);
if (missingInEn.length) console.log("\nMissing in EN:", missingInEn);

if (missingInAr.length || missingInEn.length) {
  console.error("\nPARITY: FAIL");
  process.exit(1);
}
console.log("\nPARITY: OK — en.js and ar.js export identical key sets");
