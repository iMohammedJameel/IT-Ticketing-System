const express = require("express");
const router = express.Router();
const {
  addComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controller/commentController");
const { authMiddleware, allowedTo } = require("../middleware/authMiddleware");

router.post("/tickets/:ticketId/comments", authMiddleware, addComment);
router.get("/tickets/:ticketId/comments", authMiddleware, getComments);
router.patch("/comments/:id", authMiddleware, updateComment);
router.delete("/comments/:id", authMiddleware, deleteComment);

module.exports = router;
