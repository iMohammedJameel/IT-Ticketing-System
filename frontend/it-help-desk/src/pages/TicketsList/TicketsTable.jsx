/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketsTable — rows are keyboard-openable (tabIndex + Enter), collapse to
// cards on mobile via data-label + .table-cards (see index.css), and show the
// ticket subject under the number when present.
import styles from "./TicketsList.module.css";
import { useI18n } from "../../i18n";
import { formatDate, formatSlaCountdown } from "../../utils/format";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { getStatusInfo, getPriorityInfo } from "./ticketConstants";

function TicketsTable({
  tickets,
  loading,
  error,
  onRetry,
  isStaff,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenTicket,
  onCreateClick,
}) {
  const { t, lang } = useI18n();
  const selected = selectedIds || new Set();

  // FIX(QA-fix-selection): "select all" state is computed against the rows
  // on THIS page, not by comparing sizes. Previously, if a user selected 5
  // tickets on page 1 and page 2 also had 5 tickets, the header checkbox
  // showed as fully checked even though NONE of page 2's rows were selected.
  const allOnPageSelected =
    tickets.length > 0 && tickets.every((tk) => selected.has(tk._id));
  const someOnPageSelected =
    tickets.some((tk) => selected.has(tk._id)) && !allOnPageSelected;

  // SLA only counts while the ticket is ACTIVE — resolved/closed tickets
  // keep their breached flag/badge but a live countdown is meaningless.
  const slaActive = (ticket) =>
    ticket.slaDueDate &&
    ticket.status !== "resolved" &&
    ticket.status !== "closed";
  const slaOverdue = (ticket) =>
    slaActive(ticket) && new Date(ticket.slaDueDate) < new Date();

  const openTicket = (ticket) => onOpenTicket(ticket);

  const colCount = isStaff ? 10 : 9;

  return (
    <div className={styles.card}>
      <div className="table-responsive">
        <table className="table table-hover table-cards mb-0">
          <thead className="table-light">
            <tr>
              {isStaff && (
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={onToggleSelectAll}
                    aria-label={t("tickets.selectAll")}
                  />
                </th>
              )}
              {/* Shared th/td class — same width hint on both so the header
                  can never drift from its data column (BUG-qa6-22). */}
              <th className={styles.colTicketId}>{t("tickets.ticketNumber")}</th>
              <th>{t("tickets.createdBy")}</th>
              <th>{t("tickets.product")}</th>
              <th>{t("tickets.company")}</th>
              <th>{t("tickets.priority")}</th>
              <th>{t("tickets.status")}</th>
              <th>{t("tickets.tags")}</th>
              <th>{t("tickets.sla")}</th>
              <th>{t("tickets.created")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={colCount}>
                    <Skeleton height="1.5rem" />
                  </td>
                </tr>
              ))
            ) : error ? (
              // FIX(QA-rec-2): a REAL error state with retry — previously a
              // failed fetch rendered the identical "no tickets" empty state,
              // misleading staff into thinking the queue was empty.
              <tr>
                <td colSpan={colCount} className="no-label">
                  <EmptyState
                    icon="fa-solid fa-triangle-exclamation"
                    title={t("tickets.loadError")}
                    description={error || t("tickets.loadErrorHint")}
                    action={
                      <button className="btn btn-outline-primary btn-sm" onClick={onRetry}>
                        <i className="fa-solid fa-rotate-right me-1" aria-hidden="true"></i>
                        {t("common.retry")}
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="no-label">
                  <EmptyState
                    icon="fa-solid fa-ticket"
                    title={t("tickets.noTickets")}
                    description={t("tickets.noTicketsHint")}
                    action={
                      <button className="btn btn-primary btn-sm" onClick={onCreateClick}>
                        {t("tickets.createTicket")}
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => {
                const statusInfo = getStatusInfo(ticket.status);
                const priorityInfo = getPriorityInfo(ticket.priority);
                const isSelected = selected.has(ticket._id);
                const overdue = slaOverdue(ticket);
                return (
                  <tr
                    key={ticket._id}
                    onClick={() => openTicket(ticket)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        openTicket(ticket);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${t("tickets.openTicket")} ${ticket.ticketNumber}`}
                    style={{ cursor: "pointer" }}
                    className={isSelected ? styles.selectedRow : ""}
                  >
                    {isStaff && (
                      <td className="no-label" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(ticket._id)}
                          aria-label={`${t("tickets.selectTicket")} ${ticket.ticketNumber}`}
                        />
                      </td>
                    )}
                    <td className={styles.colTicketId} data-label={t("tickets.ticketNumber")}>
                      {/* Ellipsis (never a mid-character cut) + full value on
                          hover — readable at every viewport (BUG-qa6-23). */}
                      <div className={styles.ticketId} title={ticket.ticketNumber}>
                        {ticket.ticketNumber || `#${ticket._id.slice(-5)}`}
                      </div>
                      {ticket.subject && (
                        <div className={styles.ticketSubject} title={ticket.subject}>
                          {ticket.subject}
                        </div>
                      )}
                    </td>
                    <td data-label={t("tickets.createdBy")}>{ticket.user?.name || ticket.employee || "—"}</td>
                    <td data-label={t("tickets.product")}>{ticket.product}</td>
                    <td data-label={t("tickets.company")}>{ticket.company}</td>
                    <td data-label={t("tickets.priority")}>
                      {/* QA-uiux (WCAG 1.4.3): badge text uses the `ink` shade
                          (4.4–6.7:1 on the 15% tint) instead of the vivid base
                          color, which measured 2.0–3.8:1. */}
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
                    </td>
                    <td data-label={t("tickets.status")}>
                      {/* QA-uiux (WCAG 1.4.3): solid vivid bg + white text was
                          1.7–3.8:1 across themes. Switched to the tinted-chip
                          pattern (15% tint + theme-aware ink) used by the
                          priority badge — one consistent badge language, and
                          4.4–8.7:1 in both themes. */}
                      <span
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: `color-mix(in srgb, ${statusInfo.color} 15%, transparent)`,
                          color: statusInfo.ink,
                          border: `1px solid color-mix(in srgb, ${statusInfo.color} 45%, transparent)`,
                        }}
                      >
                        <span className="visually-hidden">{t(`status.${ticket.status}`)}</span>
                        {t(`status.${ticket.status}`)}
                      </span>
                    </td>
                    <td data-label={t("tickets.tags")}>
                      {/* QA-deep: badges used to WRAP vertically making rows
                          unevenly tall. One fixed-height line now — the +N
                          counter already communicates overflow, and the full
                          list rides along in the title tooltip. */}
                      <div
                        className={styles.tagsCell}
                        title={(ticket.tags || []).join(" · ") || undefined}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(ticket.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className={styles.tagChip}>{tag}</span>
                        ))}
                        {(ticket.tags || []).length > 3 && (
                          <span className={`${styles.tagChip} ${styles.tagChipMore}`}>
                            +{ticket.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label={t("tickets.sla")}>
                      {/* FIX(QA-rec-3): show the actual remaining/overdue time,
                          not just a binary flag — agents can triage urgency
                          without opening the ticket. */}
                      {slaActive(ticket) ? (
                        <span className={overdue ? styles.slaOverdue : styles.slaOk}>
                          <i className="fa-solid fa-clock me-1" aria-hidden="true"></i>
                          {overdue
                            ? formatSlaCountdown(ticket.slaDueDate, t("common.overdue"))
                            : formatSlaCountdown(ticket.slaDueDate)}
                        </span>
                      ) : "—"}
                      {ticket.slaBreached && (
                        <i
                          className="fa-solid fa-triangle-exclamation ms-1"
                          style={{ color: "var(--status-open)" }}
                          title={t("tickets.slaBreached")}
                          aria-label={t("tickets.slaBreached")}
                        ></i>
                      )}
                    </td>
                    <td data-label={t("tickets.created")}>{formatDate(ticket.createdAt, lang)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TicketsTable;
