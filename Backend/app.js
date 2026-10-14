/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// =====================================================================
// App entry — security middleware, routes, DB connection, graceful shutdown
// =====================================================================
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const mongoose = require("mongoose");

const env = require("./config/env");
const ATTRIBUTION = require("./config/attribution");
const errorMiddleware = require("./middleware/errorMiddleware");
const logger = require("./utils/logger");
const crypto = require("crypto");

const app = express();

// ---------------------------------------------------------------------
// Request ID — every request gets an x-request-id header (and req.id),
// which the structured logger and error responses can reference. Essential
// for correlating a user complaint to a specific log line.
// ---------------------------------------------------------------------
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
});

// ---------------------------------------------------------------------
// Attribution layer (see LICENSE + NOTICE) — stamped on EVERY API response.
// Visible to anyone inspecting network traffic in browser devtools.
// ---------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader("x-authored-by", ATTRIBUTION.author);
  res.setHeader("x-app-source", ATTRIBUTION.url);
  res.setHeader("x-app-signature", ATTRIBUTION.signature);
  next();
});

// Boot signature in the server log — identifies the codebase on any host.
logger.info(
  `${ATTRIBUTION.product} · © ${new Date().getFullYear()} ${ATTRIBUTION.author} (${ATTRIBUTION.url}) · sig:${ATTRIBUTION.signature} · ${ATTRIBUTION.license}`
);

// ---------------------------------------------------------------------
// Trust proxy (if behind reverse proxy / load balancer)
// ---------------------------------------------------------------------
app.set("trust proxy", 1);

// ---------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: env.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl (no origin) and whitelisted origins
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);

// Body parsers (sane limits — 1mb for json, 5mb for urlencoded for image uploads)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// NoSQL injection sanitizer — strips $ and . from req.body / req.params / req.query
app.use(mongoSanitize({ replaceWith: "_" }));

// HTTP parameter pollution protection
app.use(hpp());

// Compression
app.use(compression());

// HTTP logging
app.use(
  morgan(env.isProd ? "combined" : "dev", {
    skip: (req) => req.path === "/api/health" || req.path === "/api/v1/health",
  })
);

// ---------------------------------------------------------------------
// Rate limiting — two tiers:
//   1. globalLimiter  — RATE_LIMIT_MAX (default 500) per IP / 15 min across
//      the whole /api surface. A polling SPA comfortably fits in 500; the old
//      default of 100 throttled normal browsing.
//   2. authLimiter    — AUTH_RATE_LIMIT_MAX (default 20) per IP / 15 min,
//      mounted ONLY on the credential-bearing auth routes (login, register,
//      forgot-password, reset-password, verify-email, resend-verification —
//      see routes/authRoutes.js + routes/authExtrasRoutes.js). Tight enough
//      to make brute-forcing passwords/tokens impractical, without touching
//      the rest of the API.
// ---------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  // Don't rate-limit the health check endpoint — Kubernetes liveness/readiness
  // probes hit it every few seconds and would otherwise exhaust the budget,
  // causing the orchestrator to mark the pod unhealthy and restart it.
  skip: (req) => req.path === "/api/health" || req.path === "/api/v1/health",
  message: { success: false, error: { message: "Too many requests, please try again later." } },
});
app.use("/api", globalLimiter);

const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // same 15-min window as the global limiter
  max: env.authRateLimitMax, // default 20 — brute-force protection where it matters
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many attempts. Please try again in a few minutes." } },
  // Skip rate limiting entirely in test mode — integration tests fire many
  // auth requests in rapid succession.
  skip: (req) => process.env.NODE_ENV === "test",
});

// ---------------------------------------------------------------------
// Health check (no auth, no rate limit hit beyond global)
// ---------------------------------------------------------------------
app.get(["/api/health", "/api/v1/health"], (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------
const authRoutes = require("./routes/authRoutes");
const authExtrasRoutes = require("./routes/authExtrasRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const commentRoutes = require("./routes/commentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const kbRoutes = require("./routes/kbRoutes");
const bulkRoutes = require("./routes/bulkRoutes");
const companyRoutes = require("./routes/companyRoutes");
const cannedRoutes = require("./routes/cannedRoutes");
const slaRoutes = require("./routes/slaRoutes");
const inboundRoutes = require("./routes/inboundRoutes");
const openapiSpec = require("./docs/openapi");

// ---------------------------------------------------------------------
// API DOCS — GET /api/docs (OpenAPI JSON) + /api/docs-ui (Swagger UI page).
// Zero-dependency: the UI page loads swagger-ui from a CDN at runtime.
// ---------------------------------------------------------------------
app.get(["/api/docs", "/api/v1/docs"], (req, res) => {
  res.status(200).json(openapiSpec);
});
app.get(["/api/docs-ui", "/api/v1/docs-ui"], (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>API Docs — IT Ticketing</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
    <body><div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>window.ui = SwaggerUIBundle({ url: '/api/docs', dom_id: '#swagger' });</script>
    </body></html>`
  );
});

// ---------------------------------------------------------------------
// Mount every router under BOTH /api (legacy) and /api/v1 (versioned).
// The global limiter on /api covers both (path-prefix match).
// ---------------------------------------------------------------------
const mountRoutes = (prefix) => {
  app.use(prefix, authRoutes(authLimiter));
  app.use(prefix, authExtrasRoutes(authLimiter));
  app.use(prefix, ticketRoutes);
  app.use(prefix, commentRoutes);
  app.use(prefix, notificationRoutes);
  app.use(prefix, attachmentRoutes);
  app.use(prefix, kbRoutes);
  app.use(prefix, bulkRoutes);
  app.use(prefix, companyRoutes);
  app.use(prefix, cannedRoutes);
  app.use(prefix, slaRoutes);
  app.use(prefix, inboundRoutes);
};
mountRoutes("/api");
mountRoutes("/api/v1");

// NOTE: /uploads is intentionally NOT served statically.
// Attachments are streamed via the authenticated /api/tickets/:id/attachments/:filename
// endpoint, which validates ticket ownership and forces Content-Disposition: attachment
// to prevent stored-XSS via uploaded HTML/SVG files.

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: "Route not found" } });
});

// ---------------------------------------------------------------------
// Error middleware (must be last)
// ---------------------------------------------------------------------
app.use(errorMiddleware);

// ---------------------------------------------------------------------
// DB connection + server start — await DB before listening
// ---------------------------------------------------------------------
async function startServer() {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.dbUrl, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    logger.info("MongoDB connected");

    // Seed default SLA policies on first boot (safe to re-run; no-op when present)
    try {
      await require("./services/slaPolicyService").ensureDefaultPolicies();
    } catch (e) {
      logger.warn("SLA policy seed skipped", { err: e.message });
    }

    const server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`, {
        apiDocs: "/api/docs",
        storage: process.env.S3_ENABLED === "true" ? "s3" : "disk",
      });
    });

    // -----------------------------------------------------------------
    // WebSocket (socket.io)
    // -----------------------------------------------------------------
    const { initSocket, closeSocket } = require("./socket");
    initSocket(server);
    logger.info("WebSocket initialized");

    // -----------------------------------------------------------------
    // Background jobs — SLA monitor
    // -----------------------------------------------------------------
    const { startSlaMonitor, stopSlaMonitor } = require("./services/slaMonitor");
    startSlaMonitor();

    // -----------------------------------------------------------------
    // Graceful shutdown — stop background jobs, close the SOCKET server
    // (io.close also closes the wrapped HTTP server; server.close below is
    // a fallback for when socket.io was never initialized), then Mongo.
    // -----------------------------------------------------------------
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return; // second SIGINT during shutdown — ignore
      shuttingDown = true;
      logger.info(`${signal} received, shutting down gracefully...`);
      stopSlaMonitor();
      closeSocket().then(() => {
        // Fallback for the no-socket path (tests / bare HTTP)
        server.close(() => {});
        mongoose.connection
          .close(false)
          .then(() => {
            logger.info("MongoDB connection closed");
            process.exit(0);
          })
          .catch((err) => {
            logger.error("Error closing MongoDB", { err: err.message });
            process.exit(1);
          });
      });

      // Force-close after 10s
      setTimeout(() => {
        logger.error("Forcing shutdown after timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    // Node 15+ defaults to crashing on unhandled rejections (recommended —
    // the process state is unknown after one). We log then exit to surface
    // the bug rather than silently continuing in a potentially corrupt state.
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection", { reason: String(reason) });
      shutdown("unhandledRejection");
    });
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception", { err: err.message, stack: err.stack });
      shutdown("uncaughtException");
    });
  } catch (err) {
    logger.error("Failed to start server", { err: err.message });
    process.exit(1);
  }
}

// Only start the server when run directly (`node app.js`).
// When required from a test file we just export the app without binding a port.
if (require.main === module) {
  startServer();
}

module.exports = app;
