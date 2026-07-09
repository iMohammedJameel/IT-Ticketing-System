// Refresh token controller — issues a new access+refresh token pair in
// exchange for a valid refresh token. Implements refresh-token rotation:
// each refresh consumes the old token and issues a new one, so a stolen
// refresh token can be used at most once. Reusing an already-rotated token
// revokes the entire family (defence against token theft).
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { AppError } = require("../middleware/errorMiddleware");
const env = require("../config/env");
const Joi = require("joi");

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, v: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: "HS256" }
  );

const signRefreshToken = (user) => {
  const jti = crypto.randomBytes(32).toString("hex");
  const token = jwt.sign(
    { id: user._id, jti, v: user.tokenVersion },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn, algorithm: "HS256" }
  );
  return { token, jti };
};

const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

// ---------------------------------------------------------------------
// POST /auth/refresh — exchange refresh token for a new access+refresh pair
// ---------------------------------------------------------------------
const refresh = async (req, res, next) => {
  try {
    const { error, value } = refreshSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

    let payload;
    try {
      payload = jwt.verify(value.refreshToken, env.jwtRefreshSecret, { algorithms: ["HS256"] });
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const user = await User.findById(payload.id).select("+tokenVersion +refreshTokens +status");
    if (!user) throw new AppError("Invalid refresh token", 401);
    if (user.status === "suspended") {
      throw new AppError("Account suspended", 403);
    }
    // If tokenVersion was bumped (logout/password change) the old refresh
    // token is invalid even if not yet expired.
    if (payload.v !== user.tokenVersion) {
      throw new AppError("Session invalidated, please login again", 401);
    }

    const hashed = hashToken(value.refreshToken);
    // Is this refresh token still in the user's refreshTokens array?
    const stored = user.refreshTokens.find((t) => t.token === hashed);
    if (!stored) {
      // Token reuse detected — revoke the entire family for safety
      user.refreshTokens = [];
      await user.save();
      throw new AppError("Refresh token reuse detected — all sessions revoked", 401);
    }

    // Remove the consumed token (rotation) and issue a new pair
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== hashed);
    const { token: newRefreshToken } = signRefreshToken(user);
    user.refreshTokens.push({
      token: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // Cap the stored refresh tokens to prevent unbounded growth
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    const accessToken = signAccessToken(user);
    res.status(200).json({
      success: true,
      data: {
        message: "Token refreshed",
        token: accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { refresh, signAccessToken, signRefreshToken, hashToken };
