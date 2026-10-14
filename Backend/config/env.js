/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Centralized env config with validation on boot
require("dotenv").config();
const Joi = require("joi");

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(5000),
  DB_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default("1d"),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  CORS_ORIGINS: Joi.string().default("http://localhost:5173"),
  BCRYPT_SALT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  // Global API budget per IP per window. A polling SPA easily exceeds the old
  // 100/15min, so the default is now 500 — tune per deployment as needed.
  RATE_LIMIT_MAX: Joi.number().default(500),
  // Stricter budget for credential-bearing auth routes ONLY (login, register,
  // forgot/reset-password, verify-email, resend-verification) — brute-force
  // protection where it matters, without throttling normal API traffic.
  AUTH_RATE_LIMIT_MAX: Joi.number().default(20),
  CLIENT_URL: Joi.string().default("http://localhost:5173"),
  // Structured logging level: error|warn|info|debug (default: info in prod, debug in dev)
  // allow("") so a copied-from-example env file with an empty LOG_LEVEL= boots.
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").allow("").default(""),
  // Shared secret for the inbound email → ticket webhook (POST /api/inbound/email).
  // Empty (default) = endpoint disabled.
  INBOUND_EMAIL_SECRET: Joi.string().allow("").default(""),
  // Business-hours SLA window (used when a policy has businessHoursOnly=true)
  WORK_DAY_START_HOUR: Joi.number().min(0).max(23).default(9),
  WORK_DAY_END_HOUR: Joi.number().min(1).max(24).default(17),
  // Working days, 0=Sunday…6=Saturday. Default Sun–Thu (Egypt/ME work week)
  WORK_DAYS: Joi.string().default("0,1,2,3,4"),
  // Minutes east of UTC for business-hours math (Cairo = 180)
  WORK_TZ_OFFSET_MINUTES: Joi.number().min(-840).max(840).default(180),
  // Optional S3-compatible object storage (AWS S3 / MinIO / Spaces / B2).
  // Empty S3_ENABLED (default) = local disk under Backend/uploads
  S3_ENABLED: Joi.string().valid("true", "false").default("false"),
  S3_BUCKET: Joi.string().allow("").default(""),
  S3_REGION: Joi.string().allow("").default("us-east-1"),
  S3_ACCESS_KEY_ID: Joi.string().allow("").default(""),
  S3_SECRET_ACCESS_KEY: Joi.string().allow("").default(""),
  S3_ENDPOINT: Joi.string().allow("").default(""),
}).unknown(true);

const { value, error } = envSchema.validate(process.env);

if (error) {
  console.error("❌ Invalid environment configuration:");
  error.details.forEach((d) => console.error("  -", d.message));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Placeholder-secret guard (production only).
// The Joi schema above only enforces LENGTH (min 16 chars) — so the placeholder
// values shipped in docker-compose.yml ("change_me_to_a_long_random_string_min_32_chars")
// sail straight through validation and the API boots with guessable secrets:
// anyone who reads the public compose file can forge admin JWTs.
// Refuse to boot in production until real secrets are provided.
// ---------------------------------------------------------------------------
const PLACEHOLDER_PATTERNS = [
  /^change[_-]?me/i, // "change_me_to_a_long_random_string…" (docker-compose default)
  /^replace[_-]?me/i,
  /^your[_-]?(jwt[_-]?)?(secret|key)/i, // "your_secret", "your-jwt-key"
  /^secret[_-]?(here|please)/i,
  /^placeholder/i,
  /^dev(elopment)?[_-]?secret/i,
  /^(.)\1+$/, // pure repetition ("aaaaaaaaaaaaaaaa")
];

const checkSecret = (name, secret) => {
  const str = String(secret);
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(str)) {
      console.error(
        `❌ ${name} looks like a placeholder (${str.slice(0, 12)}…). ` +
          "Generate a real secret with: openssl rand -hex 32"
      );
      process.exit(1);
    }
  }
};

if (value.NODE_ENV === "production") {
  checkSecret("JWT_SECRET", value.JWT_SECRET);
  checkSecret("JWT_REFRESH_SECRET", value.JWT_REFRESH_SECRET);
  // Secrets must not match each other either — sharing them lets a leaked
  // refresh-secret mint access tokens directly.
  if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
    console.error("❌ JWT_SECRET and JWT_REFRESH_SECRET must be different values.");
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  dbUrl: value.DB_URL,
  jwtSecret: value.JWT_SECRET,
  jwtExpiresIn: value.JWT_EXPIRES_IN,
  jwtRefreshSecret: value.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN,
  corsOrigins: value.CORS_ORIGINS.split(",").map((o) => o.trim()),
  bcryptSaltRounds: value.BCRYPT_SALT_ROUNDS,
  rateLimitWindowMs: value.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: value.RATE_LIMIT_MAX,
  authRateLimitMax: value.AUTH_RATE_LIMIT_MAX,
  clientUrl: value.CLIENT_URL,
  isProd: value.NODE_ENV === "production",
  logLevel: value.LOG_LEVEL,
  inboundEmailSecret: value.INBOUND_EMAIL_SECRET,
  workDayStartHour: value.WORK_DAY_START_HOUR,
  workDayEndHour: value.WORK_DAY_END_HOUR,
  workDays: value.WORK_DAYS,
  workTzOffsetMinutes: value.WORK_TZ_OFFSET_MINUTES,
  s3: {
    enabled: value.S3_ENABLED === "true",
    bucket: value.S3_BUCKET,
    region: value.S3_REGION,
    accessKeyId: value.S3_ACCESS_KEY_ID,
    secretAccessKey: value.S3_SECRET_ACCESS_KEY,
    endpoint: value.S3_ENDPOINT,
  },
};
