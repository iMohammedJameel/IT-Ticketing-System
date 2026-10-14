/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Notification service — creates in-app notifications and (optionally) sends emails
// Also exposes a hook so the WebSocket layer can push real-time notifications.
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendTicketNotificationEmail } = require("./emailService");
const logger = require("../utils/logger");

// WebSocket hook — set by the socket.io bootstrap (Phase 3)
let ioEmitter = null;
const setIoEmitter = (emitter) => { ioEmitter = emitter; };

const create = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  ticketId = null,
  sendEmail = false,
}) => {
  try {
    // Don't notify yourself
    if (senderId && String(recipientId) === String(senderId)) return null;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      ticket: ticketId,
    });

    // Push via WebSocket if available
    if (ioEmitter) {
      // 1. Targeted — the notification's recipient
      ioEmitter.to(`user:${recipientId}`).emit("notification", {
        id: notification._id,
        type,
        title,
        message,
        ticket: ticketId,
        createdAt: notification.createdAt,
      });
      // 2. Ticket room — anyone VIEWING this ticket (modal open) gets a
      // live "ticket activity" nudge so open views refresh in real time.
      // Previously the backend had ticket rooms but never emitted to them,
      // and the frontend never joined them — dead infrastructure.
      if (ticketId) {
        ioEmitter.to(`ticket:${ticketId}`).emit("ticket:activity", {
          ticketId,
          type,
          title,
          message,
          at: notification.createdAt,
        });
      }
    }

    // Send email if requested and user opted in
    if (sendEmail) {
      const user = await User.findById(recipientId);
      if (user && user.notificationPrefs) {
        const prefMap = {
          ticket_created: "ticketCreated",
          ticket_assigned: "ticketAssigned",
          ticket_status_changed: "ticketStatusChanged",
          ticket_commented: "ticketCommented",
          ticket_priority_changed: "ticketPriorityChanged",
          sla_breaching: "slaBreaching",
          sla_breached: "slaBreaching", // both SLA types respect the same pref
        };
        const pref = prefMap[type];
        if (!pref || user.notificationPrefs[pref]) {
          const ticket = ticketId ? await require("../models/Ticket").findById(ticketId) : null;
          if (ticket) await sendTicketNotificationEmail(user, ticket, type);
        }
      }
    }
    return notification;
  } catch (err) {
    logger.warn("Notification create failed", { err: err.message });
    return null;
  }
};

const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const filter = { recipient: userId };
  if (unreadOnly) filter.read = false;
  const skip = (page - 1) * limit;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("sender", "name email profileImage")
      .populate("ticket", "ticketNumber product status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);
  return { items, total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) };
};

const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, read: false },
    { read: true, readAt: new Date() }
  );
  return result.modifiedCount;
};

const deleteNotification = async (notificationId, userId) => {
  return Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
};

module.exports = {
  setIoEmitter,
  create,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
