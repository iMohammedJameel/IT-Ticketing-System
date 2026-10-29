/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// User management controller — admin-only user operations, extracted from
// authController (which was 700+ lines mixing credential flows, profile
// handling and admin directory management in one file).
// Routes: GET /auth/users · PATCH toggle-status · PATCH role · DELETE user
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const KBArticle = require("../models/KBArticle");
const { AppError } = require("../middleware/errorMiddleware");
const { validateOrThrow } = require("../utils/validation");
const { escapeRegex } = require("../utils/regex");
const publicUser = require("../utils/publicUser");
const Joi = require("joi");

// ---------------------------------------------------------------------
// Get all users with pagination + search (prevents loading the entire
// users collection on large deployments).
// ---------------------------------------------------------------------
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;
    const { role, status, search, team } = req.query;

    const filter = {};
    // Accepts single role (?role=admin) or comma-separated (?role=admin,agent)
    if (role) {
      const roles = role.split(",").map((r) => r.trim()).filter(Boolean);
      filter.role = roles.length === 1 ? roles[0] : { $in: roles };
    }
    if (status) filter.status = status;
    if (team) filter.team = team;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(publicUser),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Toggle user active/suspended status
// ---------------------------------------------------------------------
const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid user id", 400);

    if (userId === req.user) throw new AppError("You cannot suspend your own account", 400);

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    user.status = user.status === "active" ? "suspended" : "active";
    // If suspending — invalidate their tokens immediately
    if (user.status === "suspended") user.tokenVersion += 1;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: `User ${user.status}`, user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Delete user (cannot delete self).
// Cascade: nullify `user`/`assignedTo`/`resolvedBy` refs on tickets
// (preserves audit trail), delete the user's comments, delete notifications
// addressed to them, and detach them as KB article author.
// ---------------------------------------------------------------------
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid user id", 400);
    if (userId === req.user) throw new AppError("You cannot delete your own account", 400);

    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new AppError("User not found", 404);

    // Cascade — run in parallel:
    // 1. Nullify refs on tickets where the user is creator/assignee/resolver.
    //    We nullify rather than delete so the audit history is preserved.
    // 2. Delete the user's comments.
    // 3. Delete notifications addressed to the user.
    // 4. Detach the user as KB article author (keep the article, set author=null).
    await Promise.all([
      Ticket.updateMany(
        { user: userId },
        { $set: { user: null } }
      ),
      Ticket.updateMany(
        { assignedTo: userId },
        { $set: { assignedTo: null } }
      ),
      Ticket.updateMany(
        { resolvedBy: userId },
        { $set: { resolvedBy: null } }
      ),
      Comment.deleteMany({ user: userId }),
      Notification.deleteMany({
        $or: [{ recipient: userId }, { sender: userId }],
      }),
      KBArticle.updateMany(
        { author: userId },
        { $unset: { author: 1 } }
      ),
    ]);

    res.status(200).json({ success: true, data: { message: "User deleted successfully" } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update a user's role and/or team.
// Needed now that the system has THREE roles (user / agent / admin) —
// without it, nobody could ever become an agent.
// Guards: cannot change your own role (lock-out protection) and cannot
// demote the last active admin (keeps at least one admin able to manage).
// ---------------------------------------------------------------------
const updateUserRole = async (req, res, next) => {
  try {
    const schema = Joi.object({
      role: Joi.string().valid("user", "agent", "admin"),
      team: Joi.string().allow("").max(50).trim(),
    }).min(1);
    const value = validateOrThrow(schema, req.body);

    const { userId } = req.params;
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) throw new AppError("Invalid user id", 400);
    if (userId === req.user) throw new AppError("You cannot change your own role/team", 400);

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    // Guard: never demote the last active admin
    if (value.role && value.role !== "admin" && user.role === "admin") {
      const otherAdmins = await User.countDocuments({
        role: "admin",
        status: "active",
        _id: { $ne: user._id },
      });
      if (otherAdmins === 0) {
        throw new AppError("Cannot demote the last active admin", 400);
      }
    }

    if (value.role) {
      user.role = value.role;
      // Role change invalidates existing sessions (JWT carries the old role)
      user.tokenVersion += 1;
    }
    if (value.team !== undefined) user.team = value.team;
    await user.save();

    res.status(200).json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Staff directory — minimal-field list of active admins + agents for
// assignment dropdowns. FIX(QA-004..007): TicketsList and TicketDetail
// called the admin-only GET /auth/users for ANY staff member, so agents
// got 403 + an empty assign dropdown on every page load. This endpoint is
// admin+agent and returns ONLY what a dropdown needs — no emails/phones
// (PII minimization: agents should not browse the full user directory).
// ---------------------------------------------------------------------
const getStaffDirectory = async (req, res, next) => {
  try {
    const staff = await User.find(
      { role: { $in: ["admin", "agent"] }, status: "active" },
      // explicit projection — whitelist, not blacklist
      "name role team profileImage"
    )
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        users: staff.map((u) => ({
          id: u._id,
          name: u.name,
          role: u.role,
          team: u.team || "",
          profileImage: u.profileImage || null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getStaffDirectory,
  toggleUserStatus,
  updateUserRole,
  deleteUser,
};
