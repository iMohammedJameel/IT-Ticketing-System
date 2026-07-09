// Verify password — used as re-authentication before destructive actions
const User = require("../models/User");
const { verifyPasswordSchema } = require("./validation/authvalidation");
const { AppError } = require("../middleware/errorMiddleware");
const bcrypt = require("bcrypt");

const verifyPassword = async (req, res, next) => {
  try {
    const { error, value } = verifyPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) throw new AppError("Validation error", 400, error.details.map((d) => d.message));

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
