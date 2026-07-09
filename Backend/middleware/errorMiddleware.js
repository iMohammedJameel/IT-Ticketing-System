// Centralized error handler — converts known errors to clean HTTP responses,
// hides internal details in production, logs full stack for debugging.
const env = require("../config/env");

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorMiddleware = (err, req, res, next) => {
  // body-parser sets `err.status` (not `err.statusCode`) and `err.type`.
  // Read both so payload-too-large / parse errors surface as the correct
  // HTTP code instead of falling through to 500.
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  // ---- body-parser: payload too large ----
  if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body too large";
  }
  // ---- body-parser: invalid JSON ----
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON body";
  }
  // ---- body-parser: invalid UTF-8 ----
  if (err.type === "entity.failed.utf8") {
    statusCode = 400;
    message = "Invalid UTF-8 in request body";
  }

  // ---- Mongoose: bad ObjectId ----
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ---- Mongoose: validation error ----
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ---- Mongoose: duplicate key ----
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field
      ? `${field} already exists`
      : "Duplicate value";
  }

  // ---- Joi validation ----
  if (err.isJoi) {
    statusCode = 400;
    message = "Validation error";
    details = err.details.map((d) => ({
      field: d.path.join("."),
      message: d.message,
    }));
  }

  // ---- CORS ----
  if (err.message === "Not allowed by CORS") {
    statusCode = 403;
  }

  // ---- Rate limit ----
  if (err.name === "RateLimitExceededError") {
    statusCode = 429;
  }

  // Log full error in dev; only operational errors in prod
  if (env.isProd && !err.isOperational && statusCode === 500) {
    console.error("💥 UNCAUGHT ERROR:", err);
    message = "Something went wrong";
  } else if (!env.isProd) {
    console.error("💥 Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: statusCode < 400,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProd ? {} : { stack: err.stack }),
    },
  });
};

module.exports = errorMiddleware;
module.exports.AppError = AppError;
