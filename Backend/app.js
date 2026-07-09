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
const errorMiddleware = require("./middleware/errorMiddleware");
const notificationService = require("./services/notificationService");

const app = express();

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
    skip: (req) => req.path === "/api/health",
  })
);

// ---------------------------------------------------------------------
// Rate limiting — global + stricter for auth endpoints
// ---------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  // Don't rate-limit the health check endpoint — Kubernetes liveness/readiness
  // probes hit it every few seconds and would otherwise exhaust the budget,
  // causing the orchestrator to mark the pod unhealthy and restart it.
  skip: (req) => req.path === "/api/health",
  message: { success: false, error: { message: "Too many requests, please try again later." } },
});
app.use("/api", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: env.isProd ? 10 : 10000, // strict in prod, permissive in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many attempts. Account temporarily locked." } },
  // Skip rate limiting entirely in test mode
  skip: (req) => process.env.NODE_ENV === "test",
});

// ---------------------------------------------------------------------
// Health check (no auth, no rate limit hit beyond global)
// ---------------------------------------------------------------------
app.get("/api/health", (req, res) => {
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

app.use("/api", authRoutes(authLimiter));
app.use("/api", authExtrasRoutes(authLimiter));
app.use("/api", ticketRoutes);
app.use("/api", commentRoutes);
app.use("/api", notificationRoutes);
app.use("/api", attachmentRoutes);
app.use("/api", kbRoutes);
app.use("/api", bulkRoutes);

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
    console.log("✅ MongoDB connected");

    const server = app.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port} [${env.nodeEnv}]`);
    });

    // -----------------------------------------------------------------
    // WebSocket (socket.io)
    // -----------------------------------------------------------------
    const { initSocket } = require("./socket");
    initSocket(server);
    console.log("🔌 WebSocket initialized");

    // -----------------------------------------------------------------
    // Background jobs — SLA monitor
    // -----------------------------------------------------------------
    const { startSlaMonitor } = require("./services/slaMonitor");
    startSlaMonitor();

    // -----------------------------------------------------------------
    // Graceful shutdown
    // -----------------------------------------------------------------
    const { stopSlaMonitor } = require("./services/slaMonitor");
    const shutdown = (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      stopSlaMonitor();
      server.close(async () => {
        console.log("HTTP server closed");
        try {
          await mongoose.connection.close(false);
          console.log("MongoDB connection closed");
          process.exit(0);
        } catch (err) {
          console.error("Error closing MongoDB:", err);
          process.exit(1);
        }
      });

      // Force-close after 10s
      setTimeout(() => {
        console.error("Forcing shutdown after timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    // Node 15+ defaults to crashing on unhandled rejections (recommended —
    // the process state is unknown after one). We log then exit to surface
    // the bug rather than silently continuing in a potentially corrupt state.
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      shutdown("unhandledRejection");
    });
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      shutdown("uncaughtException");
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

// Only start the server when run directly (`node app.js`).
// When required from a test file we just export the app without binding a port.
if (require.main === module) {
  startServer();
}

module.exports = app;
