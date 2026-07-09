// WebSocket bootstrap — attaches socket.io to the HTTP server.
// Authenticates via JWT AND loads user from DB to verify:
//   - user still exists
//   - user.status !== "suspended"
//   - JWT tokenVersion matches the user's current tokenVersion
// This mirrors the HTTP authMiddleware so suspended/logged-out users
// cannot keep their WebSocket open until JWT expiry.
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("./config/env");
const User = require("./models/User");
const notificationService = require("./services/notificationService");

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // ---------------------------------------------------------------------
  // Auth middleware — verify JWT AND load user from DB on every connection
  // ---------------------------------------------------------------------
  io.use(async (socket, next) => {
    // Token MUST come via handshake.auth (not query string — query gets logged)
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });

      // Load user fresh — verifies they still exist, are active, and tokenVersion matches
      const user = await User.findById(payload.id).select("+tokenVersion +status +role");
      if (!user) {
        return next(new Error("User no longer exists"));
      }
      if (user.status === "suspended") {
        return next(new Error("Account suspended"));
      }
      // Token version check — invalidates tokens after logout / password change / admin suspension
      if (payload.v === undefined || payload.v !== user.tokenVersion) {
        return next(new Error("Session invalidated"));
      }

      socket.userId = String(user._id);
      socket.userRole = user.role;
      next();
    } catch (err) {
      next(new Error(err.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join personal room for targeted notifications
    socket.join(`user:${socket.userId}`);
    if (socket.userRole === "admin") socket.join("role:admin");

    socket.on("join:ticket", (ticketId) => {
      if (typeof ticketId === "string" && ticketId.match(/^[0-9a-fA-F]{24}$/)) {
        socket.join(`ticket:${ticketId}`);
      }
    });

    socket.on("leave:ticket", (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on("disconnect", () => {
      // rooms are auto-cleaned
    });
  });

  // Wire the notification service → socket emitter
  notificationService.setIoEmitter(io);

  return io;
};

const getIo = () => io;

// Emit to a ticket room (everyone watching that ticket)
const emitToTicket = (ticketId, event, payload) => {
  if (io) io.to(`ticket:${ticketId}`).emit(event, payload);
};

module.exports = { initSocket, getIo, emitToTicket };
