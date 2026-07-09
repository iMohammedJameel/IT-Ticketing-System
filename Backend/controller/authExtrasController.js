// Auth extras — forgot password, reset password, verify email, resend verification
const User = require("../models/User");
const {
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./validation/authvalidation");
const { AppError } = require("../middleware/errorMiddleware");
const env = require("../config/env");
const bcrypt = require("bcrypt");
const { generateToken, verifyToken } = require("../services/tokenService");
const { sendPasswordResetEmail, sendVerificationEmail } = require("../services/emailService");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------
// Forgot password — always returns success (no email enumeration)
// ---------------------------------------------------------------------
const forgotPassword = async (req, res, next) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const user = await User.findOne({ email: value.email });
    if (user && user.status === "active") {
      const { token, hashed } = generateToken();
      user.passwordResetToken = hashed;
      user.passwordResetExpires = new Date(Date.now() + HOUR);
      await user.save();
      await sendPasswordResetEmail(user, token);
    }
    // Always respond the same — don't leak whether email exists
    res.status(200).json({
      success: true,
      data: { message: "If the email exists, a reset link has been sent." },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Reset password — verifies token, sets new password, invalidates sessions
// ---------------------------------------------------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    const hashedToken = verifyToken(value.token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) throw new AppError("Token is invalid or expired", 400);

    user.password = await bcrypt.hash(value.newPassword, env.bcryptSaltRounds);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.tokenVersion += 1; // invalidate all existing sessions
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Password reset successful. Please login." },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Verify email — called when user clicks the verification link
// ---------------------------------------------------------------------
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError("Token is required", 400);

    const hashedToken = verifyToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) throw new AppError("Token is invalid or expired", 400);

    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Email verified successfully" },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Resend verification email
// ---------------------------------------------------------------------
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);
    if (user.emailVerifiedAt) throw new AppError("Email already verified", 400);

    const { token, hashed } = generateToken();
    user.emailVerificationToken = hashed;
    user.emailVerificationExpires = new Date(Date.now() + DAY);
    await user.save();
    await sendVerificationEmail(user, token);

    res.status(200).json({
      success: true,
      data: { message: "Verification email sent" },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
