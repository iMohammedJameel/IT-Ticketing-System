/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Auth controller — register, login, logout, password change, profile.
// All responses use the standardized envelope: { success, data | error }.
//
// Avatar concerns were split into ./auth/ (single responsibility):
//   auth/avatarUploadConfig.js   — multer + allowlists + magic bytes
//   auth/avatarController.js     — upload / serve / legacy base64 handlers
//   auth/authHelpers.js          — token signing + refresh storage + lockout
//   auth/mfaLoginVerification.js — TOTP step of the login flow
//
// The export surface below is UNCHANGED, so routes/authRoutes.js keeps
// working without a single edit.
const User = require("../models/User");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require("./validation/authvalidation");
const { AppError } = require("../middleware/errorMiddleware");
const env = require("../config/env");
const bcrypt = require("bcrypt");
const { generateToken } = require("../services/tokenService");
const { sendVerificationEmail } = require("../services/emailService");
const { signRefreshToken } = require("./refreshTokenController");
const publicUser = require("../utils/publicUser");
const logger = require("../utils/logger");
const { validateOrThrow } = require("../utils/validation");

const {
  signToken,
  storeRefreshToken,
  registerFailedLoginAttempt,
  LOGIN_ERRORS,
} = require("./auth/authHelpers");
const { verifyMfaLogin } = require("./auth/mfaLoginVerification");

const { avatarUpload, uploadAvatar, getAvatar, updateProfileImage } = require("./auth/avatarController");

// ---------------------------------------------------------------------
// Register — role is FORCED to "user". Self-promotion to admin is impossible.
// ANTI-ENUMERATION: registering an email that already exists returns the SAME
// 201 envelope as a successful registration (minus the token). Previously the
// 409 "Email already registered" let anyone probe which emails are signed up.
// ---------------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const value = validateOrThrow(registerSchema, req.body);

    const { name, email, password } = value;

    const GENERIC_MSG = "Account created. Please check your email to verify your account.";

    const existing = await User.findOne({ email }).select("_id");
    if (existing) {
      // Silent duplicate — identical response shape, no token, no second
      // account, no re-send (a re-send would also leak the existence).
      logger.warn("Register attempted with existing email (silent)", {});
      return res.status(201).json({ success: true, data: { message: GENERIC_MSG } });
    }

    const hash = await bcrypt.hash(password, env.bcryptSaltRounds);

    const newUser = await User.create({
      name,
      email,
      password: hash,
      // NOT pre-verified — the verification email sent below is what flips
      // this flag. (Dev/test conveniences live in the login handler.)
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
      data: { message: GENERIC_MSG, token, user: publicUser(newUser) },
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
    const value = validateOrThrow(loginSchema, req.body);

    const { email, password } = value;

    // `.select("+password")` because password has `select: false`
    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +lockUntil +tokenVersion +status"
    );

    // Generic error — don't reveal whether the email exists
    if (!user) throw new AppError(LOGIN_ERRORS.INVALID, 401);

    if (user.isLocked) throw new AppError(LOGIN_ERRORS.LOCKED, 423);

    if (user.status === "suspended") {
      throw new AppError("Account suspended. Contact your administrator.", 403);
    }

    // Email verification enforcement.
    // FIX(QA-009/009b): this block used to either auto-verify EVERY dev
    // login (making the unverified banner + gate untestable) or hard-403 in
    // prod (making the banner dead code). Now three explicit modes:
    //   DEV_AUTO_VERIFY=true  → convenience auto-verify (opt-in)
    //   REQUIRE_EMAIL_VERIFY  → 403 login gate (default in production)
    //   otherwise             → login allowed, amber VerifyBanner shows
    //                           (default in development — the demoable path)
    if (!user.emailVerifiedAt) {
      if (env.devAutoVerify) {
        user.emailVerifiedAt = new Date();
        await user.save();
      } else if (env.requireEmailVerify) {
        throw new AppError(
          "Please verify your email address before logging in. Check your inbox (and spam folder).",
          403
        );
      }
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // Increment failed attempts, lock if threshold reached
      registerFailedLoginAttempt(user);
      await user.save();
      // If now locked, return the locked message; otherwise the generic invalid
      throw new AppError(
        user.isLocked ? LOGIN_ERRORS.LOCKED : LOGIN_ERRORS.INVALID,
        user.isLocked ? 423 : 401
      );
    }

    // MFA (TOTP) verification — runs only for accounts with MFA enabled.
    if (user.mfaEnabled) {
      // Re-select the hidden MFA fields
      const mfaUser = await User.findById(user._id).select("+mfaSecret +mfaRecoveryCodes");
      await verifyMfaLogin(user, mfaUser, value.mfaToken);
    }

    // Success — reset counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    // Issue refresh token and store its hash so we can detect reuse later
    const { token: refreshToken } = signRefreshToken(user);
    storeRefreshToken(user, refreshToken);
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
    const value = validateOrThrow(changePasswordSchema, req.body);

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
    // Wipe refresh tokens, then stage the fresh pair — ONE save instead of the
    // previous save→push→save sequence (the first save persisted a user with
    // zero valid refresh tokens; a crash between the two saves would have
    // logged the user out of every session with no recovery path).
    user.refreshTokens = [];
    const token = signToken(user);
    const { token: refreshToken } = signRefreshToken(user);
    storeRefreshToken(user, refreshToken);
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
// Update profile (name / email / notificationPrefs / job details)
// When the email changes:
//   - mark emailVerifiedAt = null (require re-verification)
//   - bump tokenVersion (other sessions keep working, but the verified
//     flag flips to "unverified" until they re-verify)
//   - generate + send a new verification email
// notificationPrefs is MERGED key-by-key onto the existing subdocument so a
// partial PATCH ({notificationPrefs:{slaBreaching:false}}) can't wipe the
// other preferences.
// ---------------------------------------------------------------------
const updateProfile = async (req, res, next) => {
  try {
    const value = validateOrThrow(updateProfileSchema, req.body);

    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);

    // HOISTED above the if-block: the token is generated inside the email-change
    // branch but consumed AFTER user.save() further down. Declaring it inside
    // the block made line ~487 throw ReferenceError: verifyToken is not defined
    // (a 500 crash on every email change, with the email already persisted).
    let verifyToken = null;
    let emailChanged = false;
    if (value.email && value.email !== user.email) {
      const existing = await User.findOne({ email: value.email, _id: { $ne: req.user } });
      if (existing) throw new AppError("Email already in use", 409);
      user.email = value.email;
      user.emailVerifiedAt = null;
      // Issue a fresh verification token
      const { token, hashed: hashedVerifyToken } = generateToken();
      verifyToken = token;
      user.emailVerificationToken = hashedVerifyToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      emailChanged = true;
    }

    if (value.name) user.name = value.name;
    if (value.jobTitle !== undefined) user.jobTitle = value.jobTitle;
    if (value.department !== undefined) user.department = value.department;
    if (value.phone !== undefined) user.phone = value.phone;
    if (value.notificationPrefs) {
      // Merge onto the current prefs (a Mongoose subdocument needs toObject
      // before spreading — otherwise internal mongoose props leak in).
      const current =
        user.notificationPrefs && typeof user.notificationPrefs.toObject === "function"
          ? user.notificationPrefs.toObject()
          : user.notificationPrefs || {};
      user.notificationPrefs = { ...current, ...value.notificationPrefs };
    }

    // Persist first so the (possible) verification email references a saved token
    await user.save();

    if (emailChanged) {
      // Best-effort: don't fail the profile update if email send fails
      try {
        await sendVerificationEmail(user, verifyToken);
      } catch (e) {
        logger.warn("Failed to send verification email on email change", { err: e.message });
      }
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

// Admin user management (getAllUsers / toggleUserStatus / updateUserRole /
// deleteUser) lives in controller/userManagementController.js

module.exports = {
  register,
  login,
  logout,
  changePassword,
  updateProfileImage,
  uploadAvatar,
  getAvatar,
  avatarUpload,
  updateProfile,
  getMe,
};
