/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Verify password — used as re-authentication before destructive actions
const User = require("../models/User");
const { verifyPasswordSchema } = require("./validation/authvalidation");
const { AppError } = require("../middleware/errorMiddleware");
const { validateOrThrow } = require("../utils/validation");
const bcrypt = require("bcrypt");

const verifyPassword = async (req, res, next) => {
  try {
    const value = validateOrThrow(verifyPasswordSchema, req.body);

    const user = await User.findById(req.user).select("+password");
    if (!user) throw new AppError("User not found", 404);

    const match = await bcrypt.compare(value.password, user.password);
    if (!match) throw new AppError("Incorrect password", 401);

    res.status(200).json({ success: true, data: { message: "Password verified" } });
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyPassword };
