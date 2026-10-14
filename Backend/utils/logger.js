/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Structured logger — JSON lines in production (grep/ELK friendly), pretty
// console output in development. Zero dependencies.
//
// Usage:
//   const logger = require("../utils/logger");
//   logger.info("SLA monitor started", { interval: "1h" });
//   logger.error("DB connection failed", { err: err.message });

const isProd = process.env.NODE_ENV === "production";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const configuredLevel = (process.env.LOG_LEVEL || (isProd ? "info" : "debug"))
  .toString()
  .toLowerCase();

const activeLevel = LEVELS[configuredLevel] !== undefined ? LEVELS[configuredLevel] : LEVELS.info;

const emit = (level, msg, meta) => {
  if (LEVELS[level] > activeLevel) return;

  const ts = new Date().toISOString();
  if (isProd) {
    // JSON lines — one log entry per line, ready for log shippers
    const entry = { t: ts, lvl: level, msg };
    if (meta !== undefined) entry.meta = meta;
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else {
    const suffix = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${ts}] ${level.toUpperCase().padEnd(5)} ${msg}${suffix}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
};

module.exports = {
  error: (msg, meta) => emit("error", msg, meta),
  warn: (msg, meta) => emit("warn", msg, meta),
  info: (msg, meta) => emit("info", msg, meta),
  debug: (msg, meta) => emit("debug", msg, meta),
};
