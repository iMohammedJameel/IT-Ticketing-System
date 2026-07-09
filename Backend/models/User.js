// User schema with secure defaults: password hidden by default, brute-force lockout, token versioning
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // `select: false` — password hash is never returned unless explicitly requested
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profileImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    // Incremented on password change / logout to invalidate existing tokens
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // Refresh token family — stores the latest hashed refresh token so we can
    // detect token reuse (an attacker using a stolen, already-rotated refresh
    // token causes the entire family to be revoked).
    refreshTokens: [
      {
        token: String, // SHA-256 hash of the refresh token
        issuedAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
    // Brute-force protection
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Email verification
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },
    // Password reset
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
    // Notification preferences
    notificationPrefs: {
      ticketCreated: { type: Boolean, default: true },
      ticketAssigned: { type: Boolean, default: true },
      ticketStatusChanged: { type: Boolean, default: true },
      ticketCommented: { type: Boolean, default: true },
      slaBreaching: { type: Boolean, default: true },
    },
    // Job details (was previously stored in localStorage — moved to backend)
    jobTitle: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// Compound index for admin user queries
userSchema.index({ status: 1, role: 1 });

// Virtual: is account currently locked?
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Strip sensitive fields when converting to JSON
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.tokenVersion;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

// Guard against re-registration when the same model file is required twice
// (e.g. during Vitest runs with module isolation edge cases).
const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
