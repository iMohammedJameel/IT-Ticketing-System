// Unit tests for the token service — verifies hashing is deterministic and
// the generated tokens are unique.
import { describe, it, expect } from "vitest";
import { generateToken, verifyToken } from "../../services/tokenService";

describe("tokenService", () => {
  describe("generateToken", () => {
    it("returns a 64-char hex token + its SHA-256 hash", () => {
      const { token, hashed } = generateToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(hashed).toMatch(/^[0-9a-f]{64}$/);
      expect(token).not.toBe(hashed);
    });

    it("generates a unique token every call", () => {
      const a = generateToken();
      const b = generateToken();
      expect(a.token).not.toBe(b.token);
      expect(a.hashed).not.toBe(b.hashed);
    });
  });

  describe("verifyToken", () => {
    it("hashes the plain token identically to generateToken", () => {
      const { token, hashed } = generateToken();
      expect(verifyToken(token)).toBe(hashed);
    });

    it("returns a different hash for a tampered token", () => {
      const { token, hashed } = generateToken();
      const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
      expect(verifyToken(tampered)).not.toBe(hashed);
    });
  });
});
