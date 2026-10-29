/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// =====================================================================
// App entry — security middleware, routes, DB connection, graceful shutdown
//
// Structure (split out for maintainability):
//   middleware/requestContext.js  — x-request-id + attribution headers
//   config/rateLimiters.js        — global + auth rate limiters
//   config/gracefulShutdown.js    — SIGTERM/SIGINT/unhandled-rejection teardown
// =====================================================================
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const mongoose = require("mongoose");

const env = require("./config/env");
const ATTRIBUTION = require("./config/attribution");
const errorMiddleware = require("./middleware/errorMiddleware");
const { requestId, attributionHeaders } = require("./middleware/requestContext");
const { globalLimiter, authLimiter, skipHealthChecks } = require("./config/rateLimiters");
const { createShutdown } = require("./config/gracefulShutdown");
const logger = require("./utils/logger");

const app = express();

// ---------------------------------------------------------------------
// Request context + attribution, then the middleware chain
// ---------------------------------------------------------------------
app.use(requestId);
app.use(attributionHeaders);

// Boot signature in the server log — identifies the codebase on any host.
logger.info(
  `${ATTRIBUTION.product} · © ${new Date().getFullYear()} ${ATTRIBUTION.author} (${ATTRIBUTION.url}) · sig:${ATTRIBUTION.signature} · ${ATTRIBUTION.license}`
);

// Trust proxy (if behind reverse proxy / load balancer)
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
    skip: skipHealthChecks,
  })
);

// ---------------------------------------------------------------------
// Rate limiting — see config/rateLimiters.js for the two-tier rationale
// ---------------------------------------------------------------------
app.use("/api", globalLimiter);

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

// Error middleware (must be last)
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

    // WebSocket (socket.io)
    const { initSocket, closeSocket } = require("./socket");
    initSocket(server);
    logger.info("WebSocket initialized");

    // Background jobs — SLA monitor
    const { startSlaMonitor, stopSlaMonitor } = require("./services/slaMonitor");
    startSlaMonitor();

    // Graceful shutdown wiring
    createShutdown({ server, stopSlaMonitor, closeSocket });
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
