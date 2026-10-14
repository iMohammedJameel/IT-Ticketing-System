/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Unit tests for the zero-dependency TOTP service (RFC 6238 / RFC 4226).
// Uses the official RFC 6238 test vectors (SHA-1, 8 digits) plus behaviour
// checks for the login flow (window tolerance, recovery codes).
import { describe, it, expect } from "vitest";
import {
  hotp,
  totp,
  verifyTotp,
  generateSecret,
  otpauthUrl,
  generateRecoveryCodes,
  matchRecoveryCode,
  base32Decode,
  base32Encode,
} from "../../services/totpService";

// RFC 6238 Appendix B test secret (ASCII "12345678901234567890")
const RFC_SECRET_B32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totpService base32", () => {
  it("round-trips encode/decode", () => {
    const buf = Buffer.from("hello world");
    const enc = base32Encode(buf);
    expect(base32Decode(enc).toString()).toBe("hello world");
  });
});

describe("totpService RFC 6238 vectors (SHA1, 8 digits)", () => {
  const cases = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ];
  it.each(cases)("T=%i → %s", (seconds, expected) => {
    const token = totp(RFC_SECRET_B32, { at: seconds * 1000, digits: 8 });
    expect(token).toBe(expected);
  });
});

describe("totpService hotp (RFC 4226 corner)", () => {
  it("produces consistent 6-digit codes", () => {
    const code = hotp(base32Decode(RFC_SECRET_B32), 0, 6);
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe("totpService verifyTotp", () => {
  it("accepts the current code", () => {
    const now = Date.now();
    const token = totp(RFC_SECRET_B32, { at: now });
    expect(verifyTotp(RFC_SECRET_B32, token, { at: now })).toBe(true);
  });

  it("accepts codes within ±1 step (clock drift)", () => {
    const now = Date.now();
    const token = totp(RFC_SECRET_B32, { at: now - 30000 });
    expect(verifyTotp(RFC_SECRET_B32, token, { at: now })).toBe(true);
  });

  it("rejects codes outside the drift window", () => {
    const now = Date.now();
    const token = totp(RFC_SECRET_B32, { at: now - 120000 }); // 4 steps ago
    expect(verifyTotp(RFC_SECRET_B32, token, { at: now })).toBe(false);
  });

  it("rejects non-numeric tokens without throwing", () => {
    expect(verifyTotp(RFC_SECRET_B32, "abcdef")).toBe(false);
    expect(verifyTotp(RFC_SECRET_B32, "")).toBe(false);
    expect(verifyTotp(RFC_SECRET_B32, null)).toBe(false);
  });
});

describe("totpService secrets & URLs", () => {
  it("generates a 32-char base32 secret", () => {
    expect(generateSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });

  it("builds a valid otpauth:// URI", () => {
    const url = otpauthUrl({ secret: RFC_SECRET_B32, email: "a@b.com" });
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain(`secret=${RFC_SECRET_B32}`);
    expect(url).toContain("digits=6");
  });
});

describe("totpService recovery codes", () => {
  it("generates unique XXXXX-XXXXX codes", () => {
    const codes = generateRecoveryCodes(5);
    expect(codes).toHaveLength(5);
    expect(new Set(codes).size).toBe(5);
    codes.forEach((c) => expect(c).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/));
  });

  it("matches a recovery code against its hash (case/space tolerant)", () => {
    const [code] = generateRecoveryCodes(1);
    const { sha256 } = require("../../services/totpService");
    const hashes = [sha256(code)];
    expect(matchRecoveryCode(hashes, code)).toBe(true);
    expect(matchRecoveryCode(hashes, code.toLowerCase())).toBe(true);
    expect(matchRecoveryCode(hashes, ` ${code} `)).toBe(true);
    expect(matchRecoveryCode(hashes, "AAAAA-BBBBB")).toBe(false);
  });
});
