// Comment controller — add, list, update, delete
const Comment = require("../models/Comment");
const Ticket = require("../models/Ticket");
const { commentSchema } = require("./validation/TicketValidation");
const { AppError } = require("../middleware/errorMiddleware");
const notificationService = require("../services/notificationService");

const addComment = async (req, res, next) => {
  try {
    const { error, value } = commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const { ticketId } = req.params;
    if (!ticketId.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid ticket id", 400);

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new AppError("Ticket not found", 404);

    if (req.userRole !== "admin" && ticket.user.toString() !== req.user) {
      throw new AppError("Not authorized to comment on this ticket", 403);
    }

    // Only admins can post internal notes
    const isInternal = req.userRole === "admin" ? value.isInternal : false;

    const comment = await Comment.create({
      ticket: ticketId,
      user: req.user,
      text: value.text,
      isInternal,
    });

    // Push audit entry to ticket history
    ticket.history.push({
      action: "commented",
      by: req.user,
      newValue: value.text.slice(0, 100),
      note: isInternal ? "internal" : "",
    });
    await ticket.save();

    const populated = await Comment.findById(comment._id).populate("user", "name email profileImage role");

    // Notify the ticket creator (if not the commenter) and the assigned admin
    const recipients = new Set();
    if (ticket.user && String(ticket.user) !== String(req.user)) recipients.add(String(ticket.user));
    if (ticket.assignedTo && String(ticket.assignedTo) !== String(req.user)) recipients.add(String(ticket.assignedTo));

    await Promise.all(
      [...recipients].map((rid) =>
        notificationService.create({
          recipientId: rid,
          senderId: req.user,
          type: "ticket_commented",
          title: `New comment on ${ticket.ticketNumber}`,
          message: value.text.slice(0, 100),
          ticketId: ticket._id,
          sendEmail: true,
        })
      )
    );

    res.status(201).json({ success: true, data: { comment: populated } });
  } catch (err) {
    next(err);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid ticket id", 400);

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new AppError("Ticket not found", 404);

    if (req.userRole !== "admin" && ticket.user.toString() !== req.user) {
      throw new AppError("Not authorized", 403);
    }

    // Regular users cannot see internal comments
    const filter = { ticket: ticketId };
    if (req.userRole !== "admin") filter.isInternal = false;

    const comments = await Comment.find(filter)
      .populate("user", "name email profileImage role")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: { comments } });
  } catch (err) {
    next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { error, value } = commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new AppError("Comment not found", 404);

    if (comment.user.toString() !== req.user) {
      throw new AppError("You can only edit your own comments", 403);
    }

    comment.text = value.text;
    // Only admins can flip the `isInternal` flag — a regular user editing
    // their own comment must not be able to mark it internal (which would
    // hide it from themselves and other users).
    if (req.userRole === "admin" && value.isInternal !== undefined) {
      comment.isInternal = value.isInternal;
    }
    comment.editedAt = new Date();
    await comment.save();

    const populated = await Comment.findById(comment._id).populate("user", "name email profileImage role");
    res.status(200).json({ success: true, data: { comment: populated } });
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new AppError("Comment not found", 404);

    if (comment.user.toString() !== req.user && req.userRole !== "admin") {
      throw new AppError("Not authorized", 403);
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: { message: "Comment deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = { addComment, getComments, updateComment, deleteComment };
