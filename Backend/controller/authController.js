// Auth controller — register, login, logout, password change, profile
// All responses use the standardized envelope: { success, data | error }
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require("./validation/authvalidation");
const { AppError } = require("../middleware/errorMiddleware");
const env = require("../config/env");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateToken } = require("../services/tokenService");
const { sendVerificationEmail } = require("../services/emailService");
const { signRefreshToken, hashToken } = require("./refreshTokenController");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 min

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, v: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: "HS256" }
  );

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt,
  notificationPrefs: user.notificationPrefs,
  jobTitle: user.jobTitle,
  department: user.department,
  phone: user.phone,
  createdAt: user.createdAt,
});

// ---------------------------------------------------------------------
// Register — role is FORCED to "user". Self-promotion to admin is impossible.
// ---------------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const { name, email, password } = value;

    const existing = await User.findOne({ email });
    if (existing) throw new AppError("Email already registered", 409);

    const hash = await bcrypt.hash(password, env.bcryptSaltRounds);

    const newUser = await User.create({
      name,
      email,
      password: hash,
      // role intentionally omitted — schema defaults to "user"
    });

    // Generate email verification token
    const { token: verifyToken, hashed: hashedVerifyToken } = generateToken();
    newUser.emailVerificationToken = hashedVerifyToken;
    newUser.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await newUser.save();
    await sendVerificationEmail(newUser, verifyToken);

    const token = signToken(newUser);

    res.status(201).json({
      success: true,
      data: { message: "Account created. Please check your email to verify your account.", token, user: publicUser(newUser) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Login — single error message prevents user enumeration
// ---------------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const { email, password } = value;

    // `.select("+password")` because password has `select: false`
    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +lockUntil +tokenVersion +status"
    );

    // Generic error — don't reveal whether the email exists
    const INVALID = "Invalid credentials";
    const LOCKED = "Account temporarily locked. Try again in 15 minutes.";

    if (!user) throw new AppError(INVALID, 401);

    if (user.isLocked) throw new AppError(LOCKED, 423);

    if (user.status === "suspended") {
      throw new AppError("Account suspended. Contact your administrator.", 403);
    }

    // Email verification enforcement — block login for unverified users
    // (admins seeded via the seeder are pre-verified; new self-registered users must verify first)
    if (!user.emailVerifiedAt) {
      throw new AppError(
        "Please verify your email address before logging in. Check your inbox (and spam folder).",
        403
      );
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // Increment failed attempts, lock if threshold reached
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      }
      await user.save();
      // If now locked, return the locked message; otherwise the generic invalid
      throw new AppError(user.isLocked ? LOCKED : INVALID, user.isLocked ? 423 : 401);
    }

    // Success — reset counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    // Issue refresh token and store its hash so we can detect reuse later
    const { token: refreshToken } = signRefreshToken(user);
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // Cap stored refresh tokens to last 5
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    const token = signToken(user);

    res.status(200).json({
      success: true,
      data: { message: "Login successful", token, refreshToken, user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Logout — bumps tokenVersion so all existing access tokens are
// invalidated, AND wipes all stored refresh tokens so they can't be
// used to mint new access tokens.
// ---------------------------------------------------------------------
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user, {
      $inc: { tokenVersion: 1 },
      $set: { refreshTokens: [] },
    });
    res.status(200).json({ success: true, data: { message: "Logout successful" } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Change password — validates strength, invalidates other sessions
// ---------------------------------------------------------------------
const changePassword = async (req, res, next) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const { currentPassword, newPassword } = value;

    if (currentPassword === newPassword) {
      throw new AppError("New password must be different from current password", 400);
    }

    const user = await User.findById(req.user).select("+password +tokenVersion");
    if (!user) throw new AppError("User not found", 404);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new AppError("Current password is incorrect", 400);

    user.password = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
    // Invalidate all other sessions (current client will receive new token below)
    user.tokenVersion += 1;
    // Wipe refresh tokens — the new token issued below carries a fresh pair
    user.refreshTokens = [];
    await user.save();

    const token = signToken(user);
    const { token: refreshToken } = signRefreshToken(user);
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Password changed successfully", token, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update profile image — strict base64 validation, size limit
// (Phase 2 will migrate to multipart upload to object storage)
// ---------------------------------------------------------------------
const updateProfileImage = async (req, res, next) => {
  try {
    const { profileImage } = req.body;
    if (!profileImage) throw new AppError("Profile image is required", 400);

    // Match data:image/<type>;base64,<data>
    const match = profileImage.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
    if (!match) throw new AppError("Invalid image format. Allowed: png, jpeg, webp, gif", 400);

    const buffer = Buffer.from(match[2], "base64");
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    if (buffer.length > MAX_SIZE) {
      throw new AppError("Image too large. Maximum 2 MB.", 413);
    }

    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);

    user.profileImage = profileImage;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Profile image updated", user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update profile (name / email)
// When the email changes:
//   - mark emailVerifiedAt = null (require re-verification)
//   - bump tokenVersion (other sessions keep working, but the verified
//     flag flips to "unverified" until they re-verify)
//   - generate + send a new verification email
// ---------------------------------------------------------------------
const updateProfile = async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);

    const emailChanged = value.email && value.email !== user.email;

    if (emailChanged) {
      const existing = await User.findOne({ email: value.email, _id: { $ne: req.user } });
      if (existing) throw new AppError("Email already in use", 409);
      user.email = value.email;
      user.emailVerifiedAt = null;
      // Issue a fresh verification token
      const { token: verifyToken, hashed: hashedVerifyToken } = generateToken();
      user.emailVerificationToken = hashedVerifyToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      // Persist first so we can send the email afterwards
      await user.save();
      // Best-effort: don't fail the profile update if email send fails
      try {
        await sendVerificationEmail(user, verifyToken);
      } catch (e) {
        console.error("Failed to send verification email on email change:", e.message);
      }
    } else if (value.name) {
      user.name = value.name;
      await user.save();
    }

    res.status(200).json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Get current user profile
// ---------------------------------------------------------------------
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);
    res.status(200).json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Admin: get all users with pagination + search (prevents loading the
// entire users collection on large deployments).
// ---------------------------------------------------------------------
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;
    const { role, status, search } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
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
// Admin: toggle user active/suspended status
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
// Admin: delete user (cannot delete self).
// Cascade: nullify `user`/`assignedTo`/`resolvedBy` refs on tickets
// (preserves audit trail), delete the user's comments, delete notifications
// addressed to them, and detach them as KB article author.
// ---------------------------------------------------------------------
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const KBArticle = require("../models/KBArticle");
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

module.exports = {
  register,
  login,
  logout,
  changePassword,
  updateProfileImage,
  updateProfile,
  getMe,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
};
