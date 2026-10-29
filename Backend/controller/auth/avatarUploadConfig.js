/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Avatar upload config — multer memory storage + extension/mime allowlist +
// magic-byte signatures. Extracted from authController.js so the auth file
// only deals with authentication, and avatar concerns live together.
//
// Avatars are stored in memory; the buffer is validated (magic bytes)
// then written via the storage service (disk or S3). NEVER stored in the DB
// document again (the old base64 approach bloated every user doc by up to
// 2MB and duplicated the blob into every API response that embedded the user).
const multer = require("multer");
const path = require("path");
const { AppError } = require("../../middleware/errorMiddleware");

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const AVATAR_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const AVATAR_MAGIC = {
  ".png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  ".jpg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".gif": [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
  ".webp": [Buffer.from("RIFF")],
};

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!AVATAR_TYPES[ext] || !Object.values(AVATAR_TYPES).includes(file.mimetype)) {
      return cb(new AppError("Avatar must be png, jpg, webp or gif", 400));
    }
    cb(null, true);
  },
});

// True when the buffer's leading bytes match one of the known signatures
// for the claimed extension. Used by the upload handler to catch files
// whose content doesn't match their name.
const matchesMagicBytes = (buffer, ext) => {
  const magic = AVATAR_MAGIC[ext] || [];
  if (!magic.length) return false;
  const header = buffer.slice(0, 8);
  return magic.some((m) => header.slice(0, m.length).equals(m));
};

module.exports = { avatarUpload, AVATAR_TYPES, AVATAR_MAGIC, matchesMagicBytes, AVATAR_MAX_BYTES };
