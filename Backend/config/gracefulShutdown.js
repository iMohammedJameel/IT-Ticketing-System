/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Graceful shutdown — stop background jobs, close the SOCKET server
// (io.close also closes the wrapped HTTP server; server.close below is
// a fallback for when socket.io was never initialized), then Mongo.
// Extracted from app.js so the entry file stays about wiring, not teardown.
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const FORCE_EXIT_TIMEOUT_MS = 10000;

const createShutdown = ({ server, stopSlaMonitor, closeSocket }) => {
  let shuttingDown = false;
  let timeoutArmed = false;

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

    // Force-close after 10s (armed once — a re-entrant call must not stack timers)
    if (!timeoutArmed) {
      timeoutArmed = true;
      setTimeout(() => {
        logger.error("Forcing shutdown after timeout");
        process.exit(1);
      }, FORCE_EXIT_TIMEOUT_MS).unref();
    }
  };

  // Node 15+ defaults to crashing on unhandled rejections (recommended —
  // the process state is unknown after one). We log then exit to surface
  // the bug rather than silently continuing in a potentially corrupt state.
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection", { reason: String(reason) });
    shutdown("unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", { err: err.message, stack: err.stack });
    shutdown("uncaughtException");
  });

  return shutdown;
};

module.exports = { createShutdown };
