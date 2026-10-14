/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Unit tests for the CSV escaping utility — the security fix for CSV
// formula injection (OWASP). Regression guard for the export endpoint.
import { describe, it, expect } from "vitest";
import { escapeCsv, buildCsv } from "../../utils/csv";

describe("utils/csv escapeCsv", () => {
  it("passes through plain values unchanged", () => {
    expect(escapeCsv("hello")).toBe("hello");
    expect(escapeCsv(42)).toBe("42");
    expect(escapeCsv("TKT-2026-0001")).toBe("TKT-2026-0001");
  });

  it("renders null/undefined as empty string", () => {
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes cells containing commas", () => {
    expect(escapeCsv("a,b")).toBe('"a,b"');
  });

  it("quotes cells containing newlines", () => {
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsv("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  // ---------------- Formula injection ----------------
  it.each([
    ["=1+1"],
    ["=HYPERLINK(\"http://evil.example\",\"x\")"],
    ["=cmd|'/C calc'!A1"],
    ["+1+1"],
    ["-1+1"],
    ["@SUM(A1:A2)"],
    ["\t=cmd"],
    ["\rcmd"],
  ])("neutralizes the formula payload %j", (payload) => {
    const escaped = escapeCsv(payload);
    // The exported cell must NOT start with a formula-triggering character
    // (after stripping the optional CSV quoting quotes)
    const cell = escaped.replace(/^"/, "");
    expect(cell[0]).not.toMatch(/[=+\-@\t\r]/);
    // Defense is the OWASP single-quote prefix, inside any CSV quotes
    expect(cell.startsWith("'")).toBe(true);
  });

  it("does not mangle values that merely CONTAIN operators mid-string", () => {
    expect(escapeCsv("Total = 5")).toBe("Total = 5");
    expect(escapeCsv("5 + 3")).toBe("5 + 3");
  });

  it("neutralizes even when the cell would be quoted", () => {
    // Quoting alone must not bypass the defense: "=1+1,x" contains a comma
    const escaped = escapeCsv("=1+1,x");
    const cell = escaped.replace(/^"/, "");
    expect(cell.startsWith("'")).toBe(true);
    expect(escaped).toContain('"');
  });

  it("stringifies non-string values safely (no formula chars at position 0)", () => {
    const escaped = escapeCsv(new Date("2026-01-01T00:00:00Z"));
    expect(escaped).toEqual(expect.any(String));
    expect(escaped[0]).not.toMatch(/[=+\-@\t\r]/);
  });
});

describe("utils/csv buildCsv", () => {
  it("builds a BOM-prefixed document with headers and rows", () => {
    const csv = buildCsv(["A", "B"], [["x", "=1+1"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain("A,B");
    expect(csv).toContain("x");
    expect(csv).toContain("'=1+1");
  });
});
