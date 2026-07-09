// Token service — generate & verify secure random tokens for email verification & password reset
const crypto = require("crypto");

const generateToken = () => {
  // 32 bytes → 64 hex chars
  const token = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashed };
};

const verifyToken = (plainToken) => {
  return crypto.createHash("sha256").update(plainToken).digest("hex");
};

module.exports = { generateToken, verifyToken };
