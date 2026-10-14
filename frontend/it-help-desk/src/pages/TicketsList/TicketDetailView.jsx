/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketDetailView — the full ticket experience used by the detail PAGE.
// Replaces the old 90vh modal bottleneck: proper layout (facts sidebar +
// activity column), status stepper, SLA countdown, image thumbnails,
// presence dots on staff, CSAT, canned responses, and live WS updates.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import EmptyState from "../../components/common/EmptyState";
import Spinner from "../../components/common/Spinner";
import { useNotifications } from "../../context/NotificationContext";
import { useI18n } from "../../i18n";
import { ticketService } from "../../services/ticketService";
import { cannedResponseService } from "../../services/cannedResponseService";
import { formatDateTime, formatSlaCountdown } from "../../utils/format";
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_FLOW,
  getStatusInfo,
  getPriorityInfo,
} from "./ticketConstants";
import styles from "./TicketsList.module.css";

const isImage = (att) =>
  att.mimetype?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.filename || "");

// ---------------------------------------------------------------------
// CSAT widget — 1-5 stars + optional comment, submitted once
// ---------------------------------------------------------------------
export const CsatWidget = ({ ticket, onRated }) => {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ticket.csat?.rating) {
    return (
      <div className="text-center py-3">
        <div className="mb-1" aria-label={`${ticket.csat.rating}/5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <i
              key={i}
              className={`fa-${i <= ticket.csat.rating ? "solid" : "regular"} fa-star ${styles.csatStar}`}
              style={{ color: i <= ticket.csat.rating ? "var(--prio-medium)" : undefined }}
              aria-hidden="true"
            ></i>
          ))}
        </div>
        <small className="text-muted">{t("tickets.alreadyRated")}</small>
      </div>
    );
  }

  const submit = async () => {
    if (!rating) return toast.error(t("tickets.pickStarFirst"));
    setSubmitting(true);
    try {
      const res = await ticketService.rateCsat(ticket._id, { rating, comment: comment.trim() });
      toast.success(t("tickets.thanksForRating"));
      onRated?.(res.data.csat);
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.csatBox} text-center py-3`}>
      <strong>{t("tickets.rateSupport")}</strong>
      <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{t("tickets.rateSupportHint")}</p>
      <div className="d-flex justify-content-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            className="btn btn-link p-0"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            aria-label={`${i} ${t("tickets.stars")}`}
          >
            <i
              className={`fa-${i <= (hover || rating) ? "solid" : "regular"} fa-star ${styles.csatStar}`}
              style={{ color: i <= (hover || rating) ? "var(--prio-medium)" : undefined }}
              aria-hidden="true"
            ></i>
          </button>
        ))}
      </div>
      <input
        type="text"
        className="form-control form-control-sm mb-2"
        style={{ maxWidth: "320px", margin: "0 auto" }}
        placeholder={t("tickets.optionalComment")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      <button className="btn btn-sm btn-primary" onClick={submit} disabled={submitting}>
        {t("tickets.submitRating")}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------
// Status stepper — visualizes the open → in-progress → resolved → closed flow
// ---------------------------------------------------------------------
const StatusStepper = ({ status }) => {
  const { t } = useI18n();
  const currentIdx = STATUS_FLOW.indexOf(status);
  return (
    <div className="stepper" aria-label={t("tickets.statusFlow")}>
      {STATUS_FLOW.map((s, i) => {
        const cls = i < currentIdx ? "done" : i === currentIdx ? "current" : "";
        return (
          <div key={s} className={`stepper-step ${cls}`}>
            <div className="stepper-dot">
              {i < currentIdx ? <i className="fa-solid fa-check" aria-hidden="true"></i> : null}
            </div>
            <div>{t(`status.${s}`)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------
// The detail view
// ---------------------------------------------------------------------
function TicketDetailView({
  ticket,
  isStaff,
  currentUserId,
  staffList = [],
  onlineStaff = [],
  onSaved,
  onCloseTicket,
}) {
  const { t, lang } = useI18n();
  const { joinTicket, leaveTicket, subscribeTicketActivity } = useNotifications();

  const [tab, setTab] = useState("details");
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [saving, setSaving] = useState(false);
  const [cannedResponses, setCannedResponses] = useState([]);

  // Sync local edit state whenever a (possibly refreshed) ticket arrives.
  // Deps are intentionally GRANULAR (the specific fields) rather than the
  // whole `ticket` object — re-syncing on every object identity change would
  // wipe the staff's in-progress dropdown selections on unrelated re-renders.
  useEffect(() => {
    if (!ticket) return;
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setSelectedAdmin(ticket.assignedTo?._id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- granular deps intentional (see comment above)
  }, [ticket?._id, ticket?.status, ticket?.priority, ticket?.assignedTo?._id]);

  const fetchComments = useCallback(async (ticketId) => {
    setLoadingComments(true);
    try {
      const res = await ticketService.getComments(ticketId);
      setComments(res.data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  // Join the ticket's WS room while open → live updates
  useEffect(() => {
    if (!ticket?._id) return;
    joinTicket(ticket._id);
    fetchComments(ticket._id);
    const unsub = subscribeTicketActivity((evt) => {
      if (evt.ticketId === ticket._id) {
        fetchComments(ticket._id);
        toast.info(t("tickets.liveUpdates"), { description: evt.title });
        onSaved?.({ silent: true });
      }
    });
    return () => {
      unsub();
      leaveTicket(ticket._id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id]);

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

  const handleSaveChanges = async () => {
    if (!isStaff || !ticket) return;
    setSaving(true);
    try {
      if (newStatus !== ticket.status) {
        await ticketService.updateStatus(ticket._id, { status: newStatus });
        toast.success(`${t("tickets.status")}: ${t(`status.${newStatus}`)}`);
      }
      if (newPriority !== ticket.priority) {
        await ticketService.updatePriority(ticket._id, { priority: newPriority });
        toast.success(`${t("tickets.priority")}: ${t(`status.${newPriority}`)}`);
      }
      if (selectedAdmin !== (ticket.assignedTo?._id || "") && selectedAdmin) {
        await ticketService.assign(ticket._id, { assignedTo: selectedAdmin });
        toast.success(t("tickets.assignedToast"));
      }
      onSaved?.();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  // Requester confirms a resolved ticket is really done → close loop
  const handleCloseTicket = async () => {
    if (!onCloseTicket) return;
    const ok = window.confirm(t("tickets.confirmClose"));
    if (!ok) return;
    try {
      await ticketService.updateStatus(ticket._id, { status: "closed" });
      toast.success(t("tickets.closedToast"));
      onSaved?.();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    }
  };

  const isRequester = ticket && String(ticket.user?._id || ticket.user) === String(currentUserId);
  const rateable = ticket && ["resolved", "closed"].includes(ticket.status) && isRequester;
  const canClose = ticket && ticket.status === "resolved" && isRequester;

  const statusInfo = getStatusInfo(ticket?.status);
  const priorityInfo = getPriorityInfo(ticket?.priority);
  const slaLeft = ticket ? formatSlaCountdown(ticket.slaDueDate, t("common.overdue")) : null;
  const slaActive = ticket && !["resolved", "closed"].includes(ticket.status);

  if (!ticket) return null;

  const facts = [
    { label: t("tickets.createdBy"), value: ticket.user?.name || "—" },
    { label: t("tickets.company"), value: ticket.company },
    { label: t("tickets.product"), value: ticket.product },
    { label: t("tickets.category"), value: t(`category.${ticket.category}`) },
    {
      label: t("tickets.assignTo"),
      value: ticket.assignedTo?.name || t("common.notAssigned"),
      presenceId: ticket.assignedTo?._id,
    },
    ...(ticket.team ? [{ label: t("tickets.team"), value: ticket.team }] : []),
    { label: t("tickets.created"), value: formatDateTime(ticket.createdAt, lang) },
    { label: "SLA", value: ticket.slaDueDate ? formatDateTime(ticket.slaDueDate, lang) : "—" },
    ...(ticket.endDate ? [{ label: t("tickets.resolvedAt"), value: formatDateTime(ticket.endDate, lang) }] : []),
  ];

  return (
    <div className={styles.detailWrap}>
      {/* ── Header ── */}
      <div className={`d-flex flex-wrap align-items-center gap-2 mb-3 ${styles.detailHeader}`}>
        <h1 className={styles.detailTitle}>
          <span className={styles.detailNumber}>{ticket.ticketNumber}</span>
          {ticket.subject || ticket.product}
        </h1>
        <span className={styles.statusBadge} style={{ backgroundColor: statusInfo.color }}>
          {t(`status.${ticket.status}`)}
        </span>
        <span
          className={styles.priorityBadge}
          style={{
            backgroundColor: `color-mix(in srgb, ${priorityInfo.color} 15%, transparent)`,
            color: priorityInfo.color,
            border: `1px solid color-mix(in srgb, ${priorityInfo.color} 45%, transparent)`,
          }}
        >
          {t(`status.${ticket.priority}`)}
        </span>
        {slaActive && slaLeft && ticket.slaDueDate && (
          <span
            className={styles.slaChip}
            style={{
              color: new Date(ticket.slaDueDate) < new Date() ? "var(--status-open)" : "var(--text-secondary)",
              fontWeight: new Date(ticket.slaDueDate) < new Date() ? 700 : 500,
            }}
          >
            <i className="fa-regular fa-clock me-1" aria-hidden="true"></i>
            {slaLeft}
          </span>
        )}
      </div>

      {/* ── Status stepper ── */}
      <StatusStepper status={ticket.status} />

      <div className="row g-4">
        {/* ── Left column: description + activity tabs ── */}
        <div className="col-12 col-lg-8">
          <div className={`${styles.card} h-100`}>
            {/* Description always visible */}
            <div className="mb-3">
              <h2 className={styles.detailSectionTitle}>{t("tickets.problemDescription")}</h2>
              <p className="text-muted mt-2" style={{ whiteSpace: "pre-wrap" }}>
                {ticket.description}
              </p>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-3" role="tablist">
              {[
                { id: "comments", label: `${t("tickets.comments")}${comments.length ? ` (${comments.length})` : ""}` },
                { id: "history", label: t("tickets.history") },
                { id: "attachments", label: `${t("tickets.attachmentsTab")}${ticket.attachments?.length ? ` (${ticket.attachments.length})` : ""}` },
              ].map((tb) => (
                <li className="nav-item" key={tb.id}>
                  <button
                    className={`nav-link ${tab === tb.id ? "active" : ""}`}
                    onClick={() => setTab(tb.id)}
                    role="tab"
                    aria-selected={tab === tb.id}
                  >
                    {tb.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* Comments */}
            {tab === "comments" && (
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
            )}

            {/* History */}
            {tab === "history" && (
              <div className={styles.historyList}>
                {(ticket.history || []).length === 0 ? (
                  <EmptyState icon="fa-regular fa-clock-rotate-left" title={t("tickets.noHistory")} description={t("tickets.activityHere")} />
                ) : (
                  (ticket.history || []).slice().reverse().map((h, idx) => {
                    // t() returns the KEY itself when a translation is missing —
                    // wrap it so we can pass a real per-entry fallback.
                    const tr = (key, fb) => (t(key) === key ? fb : t(key));
                    // Localize enum values (status/priority); names & dates pass through.
                    const val = (v) => {
                      if (v == null || v === "") return "";
                      const s = String(v);
                      return tr(`status.${s}`, s);
                    };
                    return (
                      <div key={idx} className={styles.historyItem}>
                        <div className={styles.historyDot}></div>
                        <div>
                          <strong>{h.by?.name || tr("history.system", "System")}</strong>{" "}
                          <span className="text-muted">{tr(`history.${h.action}`, h.action.replace(/_/g, " "))}</span>
                          {h.field && <span> · <strong>{tr(`tickets.${h.field}`, h.field)}</strong></span>}
                          {h.oldValue != null && h.oldValue !== "" && <span> {tr("history.from", "from")} <code>{val(h.oldValue)}</code></span>}
                          {h.newValue != null && h.newValue !== "" && <span> {tr("history.to", "to")} <code>{val(h.newValue)}</code></span>}
                          {h.note && <div className="text-muted small">{h.note}</div>}
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {formatDateTime(h.createdAt, lang)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Attachments — image thumbnails + file list */}
            {tab === "attachments" && (
              <div>
                {(ticket.attachments || []).length === 0 ? (
                  <EmptyState icon="fa-regular fa-folder-open" title={t("tickets.noAttachments")} description={t("tickets.noAttachmentsHint")} />
                ) : (
                  <>
                    {ticket.attachments.filter(isImage).length > 0 && (
                      <div className={styles.thumbGrid}>
                        {ticket.attachments.filter(isImage).map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.thumbItem}
                            title={att.filename}
                          >
                            <img src={att.url} alt={att.filename} loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={styles.attachmentsList}>
                      {ticket.attachments.map((att, idx) => (
                        <div key={idx} className={styles.attachmentItem}>
                          <i className={`${isImage(att) ? "fa-regular fa-file-image" : "fa-regular fa-file"} me-2`} aria-hidden="true"></i>
                          <a
                            href={att.url}
                            download={att.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.attachmentLink}
                          >
                            {att.filename}
                          </a>
                          <span className="text-muted ms-2" style={{ fontSize: "0.75rem" }}>
                            ({(att.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: facts + controls + CSAT ── */}
        <div className="col-12 col-lg-4">
          <div className={`${styles.card} mb-3`}>
            <h2 className={styles.detailSectionTitle}>{t("tickets.facts")}</h2>
            <dl className={styles.factList}>
              {/* One-line grid rows (label: auto | value: minmax(0,1fr)),
                  baseline-aligned, values ellipsize at the inline END with the
                  full string in title — fixes qa6-4/16/17/18/19/20/21. */}
              {facts.map((f) => (
                <div key={f.label} className={styles.factRow}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd
                    className={styles.factValue}
                    title={f.value == null ? undefined : String(f.value)}
                  >
                    <span className={styles.factText} dir="auto">{f.value}</span>
                    {f.presenceId && (
                      <span
                        className={`presence-dot ${onlineStaff.includes(f.presenceId) ? "online" : ""}`}
                        title={onlineStaff.includes(f.presenceId) ? t("common.online") : t("common.offline")}
                      ></span>
                    )}
                  </dd>
                </div>
              ))}
              {(ticket.tags || []).length > 0 && (
                <div className={styles.factRow}>
                  <dt className={styles.factLabel}>{t("tickets.tags")}</dt>
                  <dd className={styles.factTags}>
                    {ticket.tags.map((tag) => (
                      <span key={tag} className="badge bg-light text-dark border" style={{ fontSize: "0.7rem" }}>{tag}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Staff controls */}
          {isStaff && (
            <div className={`${styles.card} mb-3`}>
              <h2 className={styles.detailSectionTitle}>{t("tickets.adminControls")}</h2>
              <div className="d-flex flex-column gap-2">
                <div>
                  <label htmlFor="detail-status" className="form-label">{t("tickets.status")}</label>
                  <select id="detail-status" className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{t(`status.${s.value}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="detail-priority" className="form-label">{t("tickets.priority")}</label>
                  <select id="detail-priority" className="form-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{t(`status.${p.value}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="detail-assign" className="form-label">{t("tickets.assignTo")}</label>
                  <select id="detail-assign" className="form-select" value={selectedAdmin} onChange={(e) => setSelectedAdmin(e.target.value)}>
                    <option value="">{t("common.notAssigned")}</option>
                    {staffList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {onlineStaff.includes(a.id) ? "🟢 " : ""}{a.name}{a.team ? ` (${a.team})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className={`btn ${styles.btnModalSave}`}
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? <Spinner size="sm" /> : t("common.save")}
                </button>
              </div>
            </div>
          )}

          {/* CSAT — requester only, after resolution */}
          {rateable && (
            <div className={`${styles.card} mb-3`}>
              <CsatWidget ticket={ticket} onRated={() => onSaved?.()} />
            </div>
          )}

          {/* Requester close-the-loop CTA */}
          {canClose && (
            <div className={`${styles.card} mb-3 text-center`}>
              <p className="text-muted mb-2" style={{ fontSize: "0.85rem" }}>
                {t("tickets.closePrompt")}
              </p>
              <button className="btn btn-outline-primary btn-sm w-100" onClick={handleCloseTicket}>
                <i className="fa-solid fa-circle-check me-1" aria-hidden="true"></i>
                {t("tickets.closeTicket")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketDetailView;
