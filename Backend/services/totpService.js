/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TOTP service — RFC 6238 / RFC 4226 compliant, implemented with Node's
// built-in crypto (zero dependencies).
//
// Endpoints enabled by this service:
//   - Two-factor authentication at login (6-digit TOTP codes, 30s step)
//   - Single-use recovery codes (stored SHA-256 hashed, like refresh tokens)
const crypto = require("crypto");

// ---------------------------------------------------------------------
// Base32 (RFC 4648, no padding) — the encoding authenticator apps use
// ---------------------------------------------------------------------
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buf) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
};

const base32Decode = (s) => {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

// ---------------------------------------------------------------------
// HOTP / TOTP (RFC 4226 §5.3 dynamic truncation)
// ---------------------------------------------------------------------
const hotp = (secretBuf, counter, digits = 6) => {
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter (JS numbers are safe here — counters stay tiny)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac("sha1", secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 10 ** digits).padStart(digits, "0");
};

const DEFAULT_STEP = 30; // seconds

/** Compute the TOTP for a base32 secret at a given time (ms since epoch). */
const totp = (secretBase32, { at = Date.now(), step = DEFAULT_STEP, digits = 6 } = {}) => {
  const counter = Math.floor(at / 1000 / step);
  return hotp(base32Decode(secretBase32), counter, digits);
};

/** Timing-safe string comparison (length-safe: compares without early exit). */
const safeEqualStr = (a, b) => {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
};

/**
 * Verify a user-supplied token against the secret, allowing ±1 time step of
 * clock drift (standard authenticator tolerance).
 */
const verifyTotp = (secretBase32, token, { window = 1, at = Date.now(), step = DEFAULT_STEP, digits = 6 } = {}) => {
  if (typeof token !== "string" || !/^\d+$/.test(token)) return false;
  const counter = Math.floor(at / 1000 / step);
  for (let i = -window; i <= window; i++) {
    const expected = hotp(base32Decode(secretBase32), counter + i, digits);
    if (safeEqualStr(expected, token)) return true;
  }
  return false;
};

/** Generate a fresh 160-bit secret (base32, 32 chars — what authenticators expect). */
const generateSecret = () => base32Encode(crypto.randomBytes(20));

/** otpauth:// URI for authenticator apps (QR-code payload). */
const otpauthUrl = ({ secret, email, issuer = "IT Help Desk" }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// ---------------------------------------------------------------------
// Recovery codes — single-use, returned to the user ONCE, stored hashed
// ---------------------------------------------------------------------
const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

const generateRecoveryCodes = (count = 5) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX (10 hex chars, ~41 bits of entropy each)
    const bytes = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${bytes.slice(0, 5)}-${bytes.slice(5)}`);
  }
  return codes;
};

/** Match a plaintext recovery code against stored hashes (constant time). */
const matchRecoveryCode = (storedHashes, plaintext) => {
  const hashed = sha256(plaintext.trim().toUpperCase());
  return storedHashes.some((h) => safeEqualStr(h, hashed));
};

module.exports = {
  base32Encode,
  base32Decode,
  hotp,
  totp,
  verifyTotp,
  generateSecret,
  otpauthUrl,
  generateRecoveryCodes,
  matchRecoveryCode,
  sha256,
};
