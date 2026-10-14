/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Attachment controller — secure file upload (extension + magic-byte validation),
// UUID-based filenames (unguessable), authenticated download endpoint.
// Files are stored through the pluggable storage service (disk, or S3 when
// S3_ENABLED=true) so attachments survive container redeploys and can move
// to object storage without touching this controller.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const Ticket = require("../models/Ticket");
const { AppError } = require("../middleware/errorMiddleware");
const storage = require("../services/storageService");
const { isStaff } = require("../utils/roles");

// Kept for reference/debugging — the storage service owns the actual path
const UPLOAD_DIR = storage.UPLOAD_DIR;
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------------------------------------------------------------
// Allowed file types — extension + MIME both validated, plus magic-byte check
// ---------------------------------------------------------------------
const ALLOWED_TYPES = {
  // extension: [mime variants, expected magic-byte signature(s)]
  ".png":  ["image/png"],
  ".jpg":  ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".gif":  ["image/gif"],
  ".pdf":  ["application/pdf"],
  ".txt":  ["text/plain", "text/plain; charset=utf-8"],
  ".csv":  ["text/csv", "text/plain", "application/csv"],
  ".doc":  ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls":  ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".zip":  ["application/zip", "application/x-zip-compressed"],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------
// Magic-byte signatures — used to validate the actual file content
// (prevents uploading evil.html with Content-Type: image/png)
// ---------------------------------------------------------------------
const MAGIC_SIGNATURES = {
  ".png":  [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
  ".jpg":  [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
  ".jpeg": [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
  ".gif":  [
    { offset: 0, bytes: Buffer.from("GIF87a") },
    { offset: 0, bytes: Buffer.from("GIF89a") },
  ],
  ".webp": [{ offset: 0, bytes: Buffer.from("RIFF") }], // simplified
  ".pdf":  [{ offset: 0, bytes: Buffer.from("%PDF-") }],
  ".zip":  [
    { offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
    { offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x05, 0x06]) },
    { offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x07, 0x08]) },
  ],
  // Office formats have complex signatures — verified via extension + zip magic for OOXML
  ".docx": [{ offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) }],
  ".xlsx": [{ offset: 0, bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) }],
  ".doc":  [{ offset: 0, bytes: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) }],
  ".xls":  [{ offset: 0, bytes: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) }],
  // Text formats have no fixed magic bytes — skip byte check, rely on extension
  ".txt":  [],
  ".csv":  [],
};

const hasMagicBytesBuf = (buffer, ext) => {
  const sigs = MAGIC_SIGNATURES[ext];
  if (!sigs || sigs.length === 0) return true; // no signature check needed
  return sigs.some((sig) => buffer.slice(sig.offset, sig.offset + sig.bytes.length).equals(sig.bytes));
};

// ---------------------------------------------------------------------
// Storage — memory storage + UUID-based filenames (unguessable, no client
// extension control); the validated buffer is handed to the storage service.
// ---------------------------------------------------------------------
const storageEngine = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_TYPES[ext]) {
    return cb(new AppError(`File extension "${ext}" not allowed`, 400));
  }
  if (!ALLOWED_TYPES[ext].includes(file.mimetype)) {
    return cb(new AppError(`MIME type "${file.mimetype}" does not match extension "${ext}"`, 400));
  }
  cb(null, true);
};

const upload = multer({
  storage: storageEngine,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

// ---------------------------------------------------------------------
// Upload attachment — memory buffer → magic-byte check → storage service
// (disk or S3). Nothing is written until all checks pass.
// ---------------------------------------------------------------------
const uploadAttachment = async (req, res, next) => {
  let savedKey = null;
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);

    // Verify the ticket exists and the user has access
    const query = isStaff(req.userRole)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user };
    const ticket = await Ticket.findOne(query);
    if (!ticket) throw new AppError("Ticket not found", 404);

    // Magic-byte verification (the actual security check) — on the buffer
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!hasMagicBytesBuf(req.file.buffer, ext)) {
      throw new AppError("File content does not match its extension. Upload rejected.", 400);
    }

    // Unguessable UUID filename, preserved extension
    const storedName = `${crypto.randomUUID()}${ext}`;
    savedKey = storedName;
    await storage.save(req.file.buffer, storedName, req.file.mimetype);

    const attachment = {
      url: `/api/tickets/${ticket._id}/attachments/${storedName}`,
      filename: req.file.originalname, // original name preserved for display
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
    ticket.attachments.push(attachment);
    ticket.history.push({
      action: "updated",
      field: "attachments",
      newValue: attachment.filename,
      by: req.user,
      note: "attachment added",
    });
    await ticket.save();

    res.status(201).json({ success: true, data: { attachment } });
  } catch (err) {
    // Clean up stored object if the DB update failed
    if (savedKey) {
      storage.delete(savedKey).catch(() => {});
    }
    next(err);
  }
};

// ---------------------------------------------------------------------
// Download attachment — AUTHENTICATED endpoint
// Verifies the requester owns the ticket (or is staff) before serving.
// Forces Content-Disposition: attachment to prevent browser execution.
// Streams through the storage backend (disk or S3).
// ---------------------------------------------------------------------
const downloadAttachment = async (req, res, next) => {
  try {
    const { id, filename } = req.params;

    // Validate filename format (UUID + safe extension)
    if (!filename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp|gif|pdf|txt|csv|docx?|xlsx?|zip)$/i)) {
      throw new AppError("Invalid filename", 400);
    }

    // Verify the ticket exists and the user has access
    const query = isStaff(req.userRole)
      ? { _id: id }
      : { _id: id, user: req.user };
    const ticket = await Ticket.findOne(query);
    if (!ticket) throw new AppError("Ticket not found", 404);

    // Verify the attachment belongs to this ticket
    const attachment = ticket.attachments.find(
      (a) => path.basename(a.url) === filename
    );
    if (!attachment) throw new AppError("Attachment not found", 404);

    if (!(await storage.exists(filename))) throw new AppError("File not found in storage", 404);

    // Force download — never let the browser execute/render via this endpoint
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Length", attachment.size);

    // Stream the file (disk or S3 — backend-agnostic)
    const stream = await storage.createReadStream(filename);
    stream.on("error", (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Delete attachment
// ---------------------------------------------------------------------
const deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const query = isStaff(req.userRole)
      ? { _id: id }
      : { _id: id, user: req.user };
    const ticket = await Ticket.findOne(query);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const attachment = ticket.attachments.id(attachmentId);
    if (!attachment) throw new AppError("Attachment not found", 404);

    // Delete from storage (async, non-blocking, backend-agnostic)
    const filename = path.basename(attachment.url);
    await storage.delete(filename).catch(() => {});

    attachment.deleteOne();
    await ticket.save();

    res.status(200).json({ success: true, data: { message: "Attachment deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  upload,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
};
