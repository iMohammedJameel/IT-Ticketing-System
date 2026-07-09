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
  RATE_LIMIT_MAX: Joi.number().default(100),
  CLIENT_URL: Joi.string().default("http://localhost:5173"),
}).unknown(true);

const { value, error } = envSchema.validate(process.env);

if (error) {
  console.error("❌ Invalid environment configuration:");
  error.details.forEach((d) => console.error("  -", d.message));
  process.exit(1);
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
  clientUrl: value.CLIENT_URL,
  isProd: value.NODE_ENV === "production",
};
