/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Comments tab — the conversation on a ticket: public replies + staff
// internal notes, canned-response insertion, live refresh.
// `activityKey` bumps whenever the ticket's WS room reports activity
// (the orchestrator owns the socket subscription) so this list refetches.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import EmptyState from "../../../components/common/EmptyState";
import Spinner from "../../../components/common/Spinner";
import { useI18n } from "../../../i18n";
import { ticketService } from "../../../services/ticketService";
import { cannedResponseService } from "../../../services/cannedResponseService";
import { formatDateTime } from "../../../utils/format";
import styles from "../TicketsList.module.css";

const CommentsTab = ({ ticket, isStaff, activityKey = 0, onCountChange }) => {
  const { t, lang } = useI18n();
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [cannedResponses, setCannedResponses] = useState([]);

  const fetchComments = useCallback(async (ticketId) => {
    setLoadingComments(true);
    try {
      const res = await ticketService.getComments(ticketId);
      setComments(res.data.comments || []);
      onCountChange?.(res.data.comments?.length || 0);
    } catch {
      setComments([]);
      onCountChange?.(0);
    } finally {
      setLoadingComments(false);
    }
  }, [onCountChange]);

  // (Re)load comments when the ticket changes or live activity arrives
  useEffect(() => {
    if (!ticket?._id) return;
    fetchComments(ticket._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activityKey is an intentional refresh signal
  }, [ticket?._id, activityKey]);

  // Load canned responses for staff
  useEffect(() => {
    if (!isStaff) return;
    cannedResponseService
      .list()
      .then((res) => setCannedResponses(res.data.responses || []))
      .catch(() => {});
  }, [isStaff]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !ticket) return;
    try {
      const res = await ticketService.addComment(ticket._id, {
        text: newComment.trim(),
        isInternal,
      });
      setComments((prev) => [...prev, res.data.comment]);
      onCountChange?.((prevCount) => prevCount + 1);
      setNewComment("");
      setIsInternal(false);
      toast.success(t("tickets.commentAdded"));
    } catch (err) {
      toast.error(err.message || t("common.error"));
    }
  };

  const insertCanned = async (id) => {
    const canned = cannedResponses.find((c) => c._id === id);
    if (!canned) return;
    setNewComment((prev) => (prev ? `${prev}\n${canned.content}` : canned.content));
    cannedResponseService.markUsed(id).catch(() => {});
  };

  return (
    <div>
      <div className={styles.commentsList}>
        {loadingComments ? (
          <div className="text-center py-3">
            <Spinner size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <EmptyState icon="fa-regular fa-comments" title={t("tickets.noComments")} description={t("tickets.startConversation")} />
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className={comment.isInternal ? `${styles.commentItem} ${styles.commentInternal}` : styles.commentItem}>
              <div className={styles.commentAvatar}>
                {comment.user?.profileImage ? (
                  <img src={comment.user.profileImage} alt="" />
                ) : (
                  (comment.user?.name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.commentContent}>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <strong className={styles.commentAuthor}>{comment.user?.name || "Unknown"}</strong>
                  {(comment.user?.role === "admin" || comment.user?.role === "agent") && (
                    <span className={styles.adminBadge}>{comment.user.role === "admin" ? t("role.admin") : t("role.agent")}</span>
                  )}
                  {comment.isInternal && (
                    <span className="badge text-bg-warning" style={{ fontSize: "0.65rem" }}>
                      {t("tickets.internalNote")}
                    </span>
                  )}
                  <span className={styles.commentTime}>{formatDateTime(comment.createdAt, lang)}</span>
                  {comment.editedAt && <small className="text-muted">({t("common.edited")})</small>}
                </div>
                <p className={styles.commentText}>{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.commentInput}>
        {isStaff && cannedResponses.length > 0 && (
          <select
            className="form-select form-select-sm mb-2"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) insertCanned(e.target.value);
              e.target.value = "";
            }}
            aria-label={t("tickets.insertCanned")}
          >
            <option value="">{t("tickets.insertCanned")}</option>
            {cannedResponses.map((c) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
        )}
        <textarea
          className={`form-control mb-2 ${styles.commentTextarea}`}
          rows="3"
          placeholder={t("tickets.writeComment")}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <div className="d-flex justify-content-between align-items-center">
          {isStaff ? (
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="internal-note"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              <label htmlFor="internal-note" className="form-check-label" style={{ fontSize: "0.8rem" }}>
                {t("tickets.internalNote")}
              </label>
            </div>
          ) : <span />}
          <button
            className={`btn ${styles.btnSendComment}`}
            onClick={handleAddComment}
            disabled={!newComment.trim()}
          >
            <i className="fa-solid fa-paper-plane me-1" aria-hidden="true"></i>
            {t("tickets.send")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsTab;
