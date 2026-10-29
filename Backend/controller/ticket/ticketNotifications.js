/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Ticket notification fan-out — shared by create/status/assign handlers.
// Extracted from ticketController.js so every handler doesn't re-implement
// the "respond first, notify after, never fail the request on notify error"
// pattern.
const User = require("../../models/User");
const notificationService = require("../../services/notificationService");
const logger = require("../../utils/logger");

const isSelf = (a, b) => String(a) === String(b);

// Notify all staff (admins + agents) that a new ticket was created.
// Notification failures are logged and swallowed — a broken SMTP server
// must never fail the API response that already went out.
const notifyStaffOfNewTicket = async (ticket, requester) => {
  try {
    const staff = await User.find({ role: { $in: ["admin", "agent"] }, status: "active" }).select("_id");
    await Promise.all(
      staff.map((s) =>
        notificationService.create({
          recipientId: s._id,
          senderId: requester.id,
          type: "ticket_created",
          title: `New ticket: ${ticket.ticketNumber}`,
          message: `${requester.name} reported an issue with ${ticket.product}`,
          ticketId: ticket._id,
          sendEmail: true,
        })
      )
    );
  } catch (e) {
    logger.warn("New-ticket notification fan-out failed", { err: e.message });
  }
};

// Notify the ticket creator that the status changed.
const notifyCreatorOfStatusChange = async (ticket, actor, newStatus) => {
  try {
    if (isSelf(ticket.user, actor.id)) return;
    await notificationService.create({
      recipientId: ticket.user,
      senderId: actor.id,
      type: "ticket_status_changed",
      title: `Ticket ${ticket.ticketNumber} → ${newStatus}`,
      message:
        newStatus === "resolved" || newStatus === "closed"
          ? `Your ticket was ${newStatus}. Please rate the support you received.`
          : `Status updated by support`,
      ticketId: ticket._id,
      sendEmail: true,
    });
  } catch (e) {
    logger.warn("Status-change notification failed", { err: e.message });
  }
};

// Notify the new assignee AND the ticket creator about an assignment.
const notifyAssignment = async (ticket, actor) => {
  try {
    if (!isSelf(ticket.assignedTo, actor.id)) {
      await notificationService.create({
        recipientId: ticket.assignedTo,
        senderId: actor.id,
        type: "ticket_assigned",
        title: `Ticket ${ticket.ticketNumber} assigned to you`,
        message: `${ticket.product} — ${ticket.description.slice(0, 80)}`,
        ticketId: ticket._id,
        sendEmail: true,
      });
    }
    if (!isSelf(ticket.user, actor.id)) {
      await notificationService.create({
        recipientId: ticket.user,
        senderId: actor.id,
        type: "ticket_assigned",
        title: `Your ticket ${ticket.ticketNumber} was assigned`,
        message: `An agent has been assigned to your ticket`,
        ticketId: ticket._id,
      });
    }
  } catch (e) {
    logger.warn("Assignment notification failed", { err: e.message });
  }
};

module.exports = { notifyStaffOfNewTicket, notifyCreatorOfStatusChange, notifyAssignment };
