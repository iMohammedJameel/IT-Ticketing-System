/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Storage service — pluggable file storage with TWO backends:
//   1. disk   (default): files under Backend/uploads — persists via Docker
//             VOLUME / docker-compose named volume
//   2. s3     (optional): any S3-compatible object store (AWS S3, MinIO,
//             DigitalOcean Spaces, Backblaze B2…) enabled with S3_ENABLED=true
//
// The S3 backend is implemented with Node 18's global fetch + hand-rolled
// AWS Signature V4 (HMAC-SHA256 chain) — NO aws-sdk dependency, which keeps
// the image small and the supply chain short.
//
// API (backend-agnostic):
//   storage.provider                      "disk" | "s3"
//   await storage.save(buffer, { key })    → { key, provider }
//   storage.createReadStream(key, { start }) → Node Readable
//   await storage.delete(key)
//   await storage.exists(key)
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { Readable } = require("stream");
const logger = require("../utils/logger");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------
const s3Config = () => ({
  enabled: process.env.S3_ENABLED === "true",
  bucket: process.env.S3_BUCKET || "",
  region: process.env.S3_REGION || "us-east-1",
  accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  // Optional custom endpoint (MinIO / Spaces / B2). Path-style is used when set.
  endpoint: process.env.S3_ENDPOINT || "",
});

// `let` (NOT const) — the misconfiguration guard below reassigns this to
// "disk". With `const` the fallback line itself threw a TypeError at module
// load, crashing the whole app instead of degrading gracefully.
let provider = s3Config().enabled ? "s3" : "disk";

// Guard: fail fast at boot if S3 was requested but misconfigured
if (provider === "s3") {
  const c = s3Config();
  if (!c.bucket || !c.accessKeyId || !c.secretAccessKey) {
    logger.warn("S3_ENABLED=true but S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY missing — falling back to disk storage");
    provider = "disk";
  }
}

// ---------------------------------------------------------------------
// Key sanitization — block path traversal on BOTH backends
// ---------------------------------------------------------------------
const sanitizeKey = (key) => {
  const clean = String(key).replace(/\\/g, "/").replace(/\.\.+/g, "").replace(/^\/+/, "");
  if (!/^[a-zA-Z0-9\-_./]+$/.test(clean)) throw new Error(`Invalid storage key: ${key}`);
  return clean;
};

// =====================================================================
// DISK backend
// =====================================================================
const diskPath = (key) => path.join(UPLOAD_DIR, sanitizeKey(key));

const disk = {
  async save(buffer, key) {
    const p = diskPath(key);
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.writeFile(p, buffer);
    return { key: sanitizeKey(key), provider: "disk" };
  },
  createReadStream(key) {
    return fs.createReadStream(diskPath(key));
  },
  async delete(key) {
    await fsp.unlink(diskPath(key)).catch(() => {});
  },
  async exists(key) {
    return fsp.access(diskPath(key)).then(() => true).catch(() => false);
  },
};

// =====================================================================
// S3 backend — AWS Signature Version 4 (zero-dependency)
// =====================================================================
const sha256Hex = (data) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
const EMPTY_PAYLOAD_HASH = sha256Hex("");

const s3Url = (key) => {
  const c = s3Config();
  const k = encodeURIComponent(sanitizeKey(key)).replace(/%2F/g, "/");
  if (c.endpoint) {
    const base = c.endpoint.replace(/\/+$/, "");
    return `${base}/${c.bucket}/${k}`;
  }
  return `https://${c.bucket}.s3.${c.region}.amazonaws.com/${k}`;
};

/**
 * Perform a signed S3 request.
 * @param {"GET"|"PUT"|"DELETE"|"HEAD"} method
 * @param {string} key object key
 * @param {object} opts { body?: Buffer, contentType?: string }
 */
const s3Request = async (method, key, { body = null, contentType = "application/octet-stream" } = {}) => {
  const c = s3Config();
  const url = new URL(s3Url(key));
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20260101T000000Z
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = body ? sha256Hex(body) : EMPTY_PAYLOAD_HASH;

  // Canonical request (headers must be lowercase + sorted)
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    url.pathname,
    "", // no query string in our calls
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${c.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(Buffer.from(`AWS4${c.secretAccessKey}`), dateStamp);
  const kRegion = hmac(kDate, c.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${c.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(body ? { "Content-Type": contentType, "Content-Length": String(body.length) } : {}),
    },
    body: body || undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`S3 ${method} ${key} failed: ${res.status} ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res;
};

const s3 = {
  async save(buffer, key, contentType = "application/octet-stream") {
    await s3Request("PUT", key, { body: buffer, contentType });
    return { key: sanitizeKey(key), provider: "s3" };
  },
  async createReadStream(key) {
    const res = await s3Request("GET", key);
    if (!res.body) throw new Error("S3 GET returned empty body");
    return Readable.fromWeb(res.body);
  },
  async delete(key) {
    await s3Request("DELETE", key).catch(() => {});
  },
  async exists(key) {
    try {
      await s3Request("HEAD", key);
      return true;
    } catch {
      return false;
    }
  },
};

// =====================================================================
// Public API
// =====================================================================
const storage = {
  provider,
  UPLOAD_DIR,
  sanitizeKey,
  save: (buffer, key, contentType) =>
    provider === "s3" ? s3.save(buffer, key, contentType) : disk.save(buffer, key),
  createReadStream: (key) =>
    provider === "s3" ? s3.createReadStream(key) : disk.createReadStream(key),
  delete: (key) => (provider === "s3" ? s3.delete(key) : disk.delete(key)),
  exists: (key) => (provider === "s3" ? s3.exists(key) : disk.exists(key)),
};

module.exports = storage;
