/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// CSV escaping utilities — shared by the CSV export (bulkController) and unit
// tests.
//
// SECURITY: CSV formula injection.
// If a cell's value starts with `=`, `+`, `-`, `@`, a TAB or a CR, spreadsheet
// applications (Excel, LibreOffice, Google Sheets) interpret the cell as a
// FORMULA when the exported file is opened. An attacker who can control a
// ticket field (product name, employee name, company...) can plant
// `=HYPERLINK("http://evil.com","x")` or `=cmd|'/C ...'` and compromise the
// analyst who opens the export.
//
// Defense (per OWASP CSV Injection guidance): prefix the dangerous character
// with a single quote BEFORE quoting decisions are made — quoting alone does
// NOT neutralize formulas.

// Characters that turn a cell into a formula when they appear at position 0
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escape a single CSV cell value.
 * - Doubles embedded quotes
 * - Quotes cells containing commas / quotes / newlines
 * - Prefixes formula-triggering leading characters with `'`
 * - Renders null/undefined as empty string
 */
const escapeCsv = (val) => {
  if (val === null || val === undefined) return "";
  let s = String(val);

  // Neutralize formula injection BEFORE quoting (quoting does not help:
  // `"=1+1"` is still evaluated as a formula by Excel)
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;

  // Double embedded double-quotes
  s = s.replace(/"/g, '""');

  // Quote the whole cell if it contains a comma, quote or newline
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};

/**
 * Build a CSV document (with BOM) from headers + row arrays.
 * Each cell is passed through escapeCsv.
 */
const buildCsv = (headers, rows) => {
  const head = headers.map(escapeCsv).join(",");
  const body = rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
  // BOM so Excel detects UTF-8
  return "\uFEFF" + [head, body].join("\r\n");
};

module.exports = { escapeCsv, buildCsv };
