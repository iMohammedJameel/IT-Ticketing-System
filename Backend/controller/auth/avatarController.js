/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Avatar handlers — multipart upload (preferred), public read, and the
// LEGACY base64 endpoint kept for backward compatibility with older clients.
// Extracted from authController.js (avatar is a file-storage concern, not an
// authentication concern).
const crypto = require("crypto");
const path = require("path");
const User = require("../../models/User");
const { AppError } = require("../../middleware/errorMiddleware");
const storage = require("../../services/storageService");
const publicUser = require("../../utils/publicUser");

const { AVATAR_TYPES, matchesMagicBytes, avatarUpload } = require("./avatarUploadConfig");

// UUID-with-extension pattern the uploader generates
const AVATAR_FILENAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp|gif)$/i;

// ---------------------------------------------------------------------
// Update profile image (multipart file upload) — NEW preferred endpoint.
// Validates magic bytes, stores via storage service (disk or S3), saves
// only a short URL in the user document. GET /auth/avatar/:filename serves
// it publicly (avatars are not secret — they appear in comment threads).
// ---------------------------------------------------------------------
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("No image uploaded (field name: `file`)", 400);

    const ext = path.extname(req.file.originalname || "").toLowerCase();
    if (!matchesMagicBytes(req.file.buffer, ext)) {
      throw new AppError("File content does not match its extension", 400);
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    await storage.save(req.file.buffer, `avatars/${filename}`, req.file.mimetype);

    const user = await User.findById(req.user);
    if (!user) throw new AppError("User not found", 404);

    // Best-effort cleanup of the previous avatar file
    const oldUrl = user.profileImage || "";
    const oldMatch = oldUrl.match(/\/avatar\/([a-zA-Z0-9-]+\.[a-z]+)$/);
    if (oldMatch) await storage.delete(`avatars/${oldMatch[1]}`).catch(() => {});

    user.profileImage = `/api/auth/avatar/${filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Profile image updated", user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /auth/avatar/:filename — public read (content-type pinned to the
// extension allowlist + nosniff, so an uploaded file can never execute)
const getAvatar = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename.match(AVATAR_FILENAME_RE)) {
      throw new AppError("Invalid filename", 400);
    }
    const key = `avatars/${filename.toLowerCase()}`;
    if (!(await storage.exists(key))) throw new AppError("Avatar not found", 404);

    const ext = path.extname(filename).toLowerCase();
    res.setHeader("Content-Type", AVATAR_TYPES[ext] || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=86400");

    const stream = await storage.createReadStream(key);
    stream.on("error", () => res.status(500).end());
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Update profile image (LEGACY base64 endpoint) — kept for backward
// compatibility with older clients. Limit reduced to 512KB; new clients
// should use POST /auth/avatar (multipart) instead.
// ---------------------------------------------------------------------
const updateProfileImage = async (req, res, next) => {
  try {
    const { profileImage } = req.body;
    if (!profileImage) throw new AppError("Profile image is required", 400);

    // Match data:image/<type>;base64,<data>
    const match = profileImage.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
    if (!match) throw new AppError("Invalid image format. Allowed: png, jpeg, webp, gif", 400);

    const buffer = Buffer.from(match[2], "base64");
    const MAX_SIZE = 512 * 1024; // 512 KB (was 2MB — data-URIs bloat every response)
    if (buffer.length > MAX_SIZE) {
      throw new AppError("Image too large. Maximum 512 KB (or use the file-upload endpoint).", 413);
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

module.exports = { uploadAvatar, getAvatar, updateProfileImage, avatarUpload };
