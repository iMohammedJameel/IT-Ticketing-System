// Notification service — creates in-app notifications and (optionally) sends emails
// Also exposes a hook so the WebSocket layer can push real-time notifications.
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendTicketNotificationEmail } = require("./emailService");

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
      ioEmitter.to(`user:${recipientId}`).emit("notification", {
        id: notification._id,
        type,
        title,
        message,
        ticket: ticketId,
        createdAt: notification.createdAt,
      });
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
    console.error("Notification create failed:", err.message);
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
