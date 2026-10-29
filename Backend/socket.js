/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
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

// ---------------------------------------------------------------------
// Presence — which users are online right now (QA-deep: extended from
// staff-only to EVERY connected user so the users table can show employee
// activity too; the list is still broadcast ONLY to the staff room, so
// employees never see each other's presence).
// A userId→socket-count map (not a Set of sockets) so multiple tabs count
// once, and a user only goes offline when their LAST socket disconnects.
// ---------------------------------------------------------------------
const presence = new Map();

const onlineUserIds = () => [...presence.keys()];

const broadcastPresence = () => {
  if (!io) return;
  const payload = { online: onlineUserIds() };
  io.to("role:staff").emit("presence:update", payload);
};

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
    // Role rooms — notificationService broadcasts new tickets to all staff
    if (socket.userRole === "admin") socket.join("role:admin");
    if (socket.userRole === "agent") socket.join("role:agent");

    // Presence — count this socket; broadcast the online list to staff and
    // hand the CURRENT list to just-connected STAFF sockets so the UI
    // doesn't have to wait for the next change to know who's online.
    // (QA-deep: end users are tracked too — admins see green dots on every
    // active employee row in the users table.)
    presence.set(socket.userId, (presence.get(socket.userId) || 0) + 1);
    broadcastPresence();
    if (socket.userRole === "admin" || socket.userRole === "agent") {
      socket.emit("presence:update", { online: onlineUserIds() });
    }

    socket.on("join:ticket", (ticketId) => {
      // Authorization: only staff or the ticket's requester may join a ticket
      // room (prevents a logged-in user from eavesdropping on other people's
      // ticket activity).
      if (typeof ticketId === "string" && ticketId.match(/^[0-9a-fA-F]{24}$/)) {
        const Ticket = require("./models/Ticket");
        Promise.resolve()
          .then(async () => {
            if (socket.userRole === "admin" || socket.userRole === "agent") {
              socket.join(`ticket:${ticketId}`);
              return;
            }
            const allowed = await Ticket.exists({ _id: ticketId, user: socket.userId });
            if (allowed) socket.join(`ticket:${ticketId}`);
          })
          .catch(() => {
            /* not authorized to join — silently ignore */
          });
      }
    });

    socket.on("leave:ticket", (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on("disconnect", () => {
      // Presence — decrement; go offline only when the LAST socket leaves
      if (presence.has(socket.userId)) {
        const remaining = presence.get(socket.userId) - 1;
        if (remaining <= 0) presence.delete(socket.userId);
        else presence.set(socket.userId, remaining);
        broadcastPresence();
      }
      // rooms are auto-cleaned
    });
  });

  // Wire the notification service → socket emitter
  notificationService.setIoEmitter(io);

  return io;
};

const getIo = () => io;

// Currently-online user ids (used by tests / future REST exposure)
const getOnlineStaff = () => onlineUserIds();

// Emit to a ticket room (everyone watching that ticket)
const emitToTicket = (ticketId, event, payload) => {
  if (io) io.to(`ticket:${ticketId}`).emit(event, payload);
};

// Close the socket server (and the underlying HTTP server it wraps).
// Used by the app's graceful shutdown — without this, open WebSocket
// connections keep server.close() hanging until the force-kill timeout,
// cutting in-flight HTTP requests mid-response.
const closeSocket = () =>
  new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
    io = null;
  });

module.exports = { initSocket, getIo, closeSocket, emitToTicket, getOnlineStaff };
