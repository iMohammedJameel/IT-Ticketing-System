/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketDetailView — ORCHESTRATOR ONLY for the full ticket experience:
// header, status stepper, live WS wiring and layout. The heavy blocks live
// in ./detail/* (was a single 661-line file):
//   detail/CsatWidget.jsx    — requester rating (re-exported below)
//   detail/StatusStepper.jsx — open → in-progress → resolved → closed flow
//   detail/CommentsTab.jsx   — conversation + internal notes + canned replies
//   detail/HistoryTab.jsx    — audit timeline
//   detail/AttachmentsTab.jsx— image thumbnails + file list
//   detail/TicketFacts.jsx   — facts sidebar + tags
//   detail/StaffControls.jsx — status / priority / assign controls
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNotifications } from "../../context/NotificationContext";
import { useI18n } from "../../i18n";
import { ticketService } from "../../services/ticketService";
import { formatSlaCountdown } from "../../utils/format";
import { getStatusInfo, getPriorityInfo } from "./ticketConstants";
import styles from "./TicketsList.module.css";
import StatusStepper from "./detail/StatusStepper";
import CommentsTab from "./detail/CommentsTab";
import HistoryTab from "./detail/HistoryTab";
import AttachmentsTab from "./detail/AttachmentsTab";
import TicketFacts from "./detail/TicketFacts";
import StaffControls from "./detail/StaffControls";
import CsatWidgetBase from "./detail/CsatWidget";

// Kept as a named export — external code imports CsatWidget from here.
export const CsatWidget = CsatWidgetBase;

function TicketDetailView({
  ticket,
  isStaff,
  currentUserId,
  staffList = [],
  onlineStaff = [],
  onSaved,
  onCloseTicket,
}) {
  const { t } = useI18n();
  const { joinTicket, leaveTicket, subscribeTicketActivity } = useNotifications();

  // QA-td3: the initial state was "details" — an id that no longer exists in
  // the tab list (comments/history/attachments), so on first render NO tab
  // was active and the whole activity area below the tabs stayed empty until
  // the user clicked one. Default to the conversation, which is the primary
  // activity, so the page renders complete content immediately.
  const [tab, setTab] = useState("comments");
  // Bumped by the ticket's WS room — CommentsTab refetches when it changes
  const [activityKey, setActivityKey] = useState(0);
  // Comment count lives inside CommentsTab; mirrored here for the tab badge
  const [commentCount, setCommentCount] = useState(0);

  // Join the ticket's WS room while open → live updates
  useEffect(() => {
    if (!ticket?._id) return;
    joinTicket(ticket._id);
    const unsub = subscribeTicketActivity((evt) => {
      if (evt.ticketId === ticket._id) {
        setActivityKey((k) => k + 1);
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

  if (!ticket) return null;

  const isRequester = String(ticket.user?._id || ticket.user) === String(currentUserId);
  const rateable = ["resolved", "closed"].includes(ticket.status) && isRequester;
  const canClose = ticket.status === "resolved" && isRequester;

  const statusInfo = getStatusInfo(ticket.status);
  const priorityInfo = getPriorityInfo(ticket.priority);
  const slaLeft = formatSlaCountdown(ticket.slaDueDate, t("common.overdue"));
  const slaActive = !["resolved", "closed"].includes(ticket.status);

  // QA-td4: counts render as a separate span so ≤576px can drop them —
  // "Comments (3) / History / Attachments" otherwise needs ~63px more than
  // the mobile card offers and the strip starts scrolling.
  const countLabel = (n) => (n ? <span className={styles.tabCount}> ({n})</span> : null);

  const tabs = [
    { id: "comments", label: <>{t("tickets.comments")}{countLabel(commentCount)}</> },
    { id: "history", label: t("tickets.history") },
    { id: "attachments", label: <>{t("tickets.attachmentsTab")}{countLabel(ticket.attachments?.length)}</> },
  ];

  return (
    <div className={styles.detailWrap}>
      {/* ── Header ── */}
      <div className={`d-flex flex-wrap align-items-center gap-2 mb-3 ${styles.detailHeader}`}>
        <h1 className={styles.detailTitle}>
          <span className={styles.detailNumber}>{ticket.ticketNumber}</span>
          {ticket.subject || ticket.product}
        </h1>
        {/* QA-uiux (WCAG 1.4.3): tinted chip + theme-aware ink (was solid
            vivid bg + white text at 1.7–3.8:1). Matches the tickets-table
            badge language now. */}
        <span
          className={styles.statusBadge}
          style={{
            backgroundColor: `color-mix(in srgb, ${statusInfo.color} 15%, transparent)`,
            color: statusInfo.ink,
            border: `1px solid color-mix(in srgb, ${statusInfo.color} 45%, transparent)`,
          }}
        >
          {t(`status.${ticket.status}`)}
        </span>
        <span
          className={styles.priorityBadge}
          style={{
            backgroundColor: `color-mix(in srgb, ${priorityInfo.color} 15%, transparent)`,
            color: priorityInfo.ink,
            border: `1px solid color-mix(in srgb, ${priorityInfo.color} 45%, transparent)`,
          }}
        >
          {t(`priority.${ticket.priority}`)}
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
          <div className={`${styles.card} ${styles.detailCard} h-100`}>
            {/* Description always visible */}
            <div className="mb-3">
              <h2 className={styles.detailSectionTitle}>{t("tickets.problemDescription")}</h2>
              {/* QA-td2: direction picked from the content itself (see CSS) */}
              <p className={`${styles.detailDescription} text-muted mt-2`}>{ticket.description}</p>
            </div>

            {/* Tabs — QA-td4: one row at every size (see .detailTabs in CSS) */}
            <ul className={`nav nav-tabs mb-3 ${styles.detailTabs}`} role="tablist">
              {tabs.map((tb) => (
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

            {tab === "comments" && (
              <CommentsTab
                ticket={ticket}
                isStaff={isStaff}
                activityKey={activityKey}
                onCountChange={setCommentCount}
              />
            )}
            {tab === "history" && <HistoryTab history={ticket.history} />}
            {tab === "attachments" && <AttachmentsTab attachments={ticket.attachments} />}
          </div>
        </div>

        {/* ── Right column: facts + controls + CSAT ── */}
        <div className="col-12 col-lg-4">
          <TicketFacts ticket={ticket} onlineStaff={onlineStaff} />

          {/* Staff controls */}
          {isStaff && (
            <StaffControls ticket={ticket} staffList={staffList} onlineStaff={onlineStaff} onSaved={onSaved} />
          )}

          {/* CSAT — requester only, after resolution */}
          {rateable && (
            <div className={`${styles.card} ${styles.detailCard} mb-3`}>
              <CsatWidgetBase ticket={ticket} onRated={() => onSaved?.()} />
            </div>
          )}

          {/* Requester close-the-loop CTA */}
          {canClose && (
            <div className={`${styles.card} ${styles.detailCard} mb-3 text-center`}>
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
