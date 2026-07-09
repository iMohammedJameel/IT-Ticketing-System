const express = require("express");
const router = express.Router();
const {
  upload,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} = require("../controller/attachmentController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

// Upload attachment — authenticated users can upload to their own tickets
router.post(
  "/tickets/:id/attachments",
  authMiddleware,
  upload.single("file"),
  uploadAttachment
);

// Download attachment — AUTHENTICATED, forces download (no in-browser execution)
router.get(
  "/tickets/:id/attachments/:filename",
  authMiddleware,
  downloadAttachment
);

// Delete attachment — admin or owner
router.delete(
  "/tickets/:id/attachments/:attachmentId",
  authMiddleware,
  deleteAttachment
);

module.exports = router;
