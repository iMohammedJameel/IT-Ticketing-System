const jwt = require("jsonwebtoken");
const User = require("../models/User");
const env = require("../config/env");

/**
 * Verify JWT from Authorization header.
 * - Strictly enforces "Bearer <token>" scheme.
 * - Pins algorithm to HS256 (prevents alg:none confusion).
 * - Loads the user from DB on every request to check status & tokenVersion.
 * - Suspended / deleted users are blocked immediately, even with a valid token.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: { message: "Authentication required" } });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res
        .status(401)
        .json({ success: false, error: { message: "Invalid authorization header format. Use: Bearer <token>" } });
    }

    const token = parts[1];

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Token expired"
          : "Invalid token";
      return res.status(401).json({ success: false, error: { message } });
    }

    // Load user fresh on every request — verifies they still exist & are active
    const user = await User.findById(payload.id).select("+tokenVersion +status +role");
    if (!user) {
      return res.status(401).json({ success: false, error: { message: "User no longer exists" } });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ success: false, error: { message: "Account suspended. Contact admin." } });
    }

    // Token version check — invalidates all tokens after password change / logout
    if (payload.v === undefined || payload.v !== user.tokenVersion) {
      return res.status(401).json({ success: false, error: { message: "Session invalidated. Please login again." } });
    }

    req.user = user._id.toString();
    req.userRole = user.role;
    req.userObj = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control — call with the allowed roles.
 *   router.post("/x", authMiddleware, allowedTo("admin"), handler)
 */
const allowedTo = (...roles) => (req, res, next) => {
  if (!req.userRole || !roles.includes(req.userRole)) {
    return res.status(403).json({ success: false, error: { message: "Access denied" } });
  }
  next();
};

module.exports = { authMiddleware, allowedTo };
