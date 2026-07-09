// Notification controller — list, mark-read, mark-all-read, delete
const notificationService = require("../services/notificationService");
const { AppError } = require("../middleware/errorMiddleware");

const getMyNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const unreadOnly = req.query.unread === "true";
    const data = await notificationService.getUserNotifications(req.user, { page, limit, unreadOnly });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid id", 400);
    const n = await notificationService.markAsRead(req.params.id, req.user);
    if (!n) throw new AppError("Notification not found", 404);
    res.status(200).json({ success: true, data: { notification: n } });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user);
    res.status(200).json({ success: true, data: { message: `${count} notifications marked as read` } });
  } catch (err) {
    next(err);
  }
};

const deleteMyNotification = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid id", 400);
    const n = await notificationService.deleteNotification(req.params.id, req.user);
    if (!n) throw new AppError("Notification not found", 404);
    res.status(200).json({ success: true, data: { message: "Notification deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  deleteMyNotification,
};
