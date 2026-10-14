/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
const express = require("express");
const router = express.Router();
const {
  addComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controller/commentController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/tickets/:ticketId/comments", authMiddleware, addComment);
router.get("/tickets/:ticketId/comments", authMiddleware, getComments);
router.patch("/comments/:id", authMiddleware, updateComment);
router.delete("/comments/:id", authMiddleware, deleteComment);

module.exports = router;
