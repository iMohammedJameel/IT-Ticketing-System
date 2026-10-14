/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketsTable — rows are keyboard-openable (tabIndex + Enter), collapse to
// cards on mobile via data-label + .table-cards (see index.css), and show the
// ticket subject under the number when present.
import styles from "./TicketsList.module.css";
import { useI18n } from "../../i18n";
import { formatDate } from "../../utils/format";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { getStatusInfo, getPriorityInfo } from "./ticketConstants";

function TicketsTable({
  tickets,
  loading,
  isStaff,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenTicket,
  onCreateClick,
}) {
  const { t, lang } = useI18n();
  const selected = selectedIds || new Set();

  const slaOverdue = (ticket) =>
    ticket.slaDueDate &&
    new Date(ticket.slaDueDate) < new Date() &&
    ticket.status !== "resolved" &&
    ticket.status !== "closed";

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
                    checked={selected.size === tickets.length && tickets.length > 0}
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
                    </td>
                    <td data-label={t("tickets.status")}>
                      <span className={styles.statusBadge} style={{ backgroundColor: statusInfo.color }}>
                        <span className="visually-hidden">{t(`status.${ticket.status}`)}</span>
                        {t(`status.${ticket.status}`)}
                      </span>
                    </td>
                    <td data-label={t("tickets.tags")}>
                      <div className="d-flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {(ticket.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="badge bg-light text-dark border" style={{ fontSize: "0.7rem" }}>
                            {tag}
                          </span>
                        ))}
                        {(ticket.tags || []).length > 3 && (
                          <span className="badge bg-light text-muted border" style={{ fontSize: "0.7rem" }}>
                            +{ticket.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label={t("tickets.sla")}>
                      {ticket.slaDueDate ? (
                        <span className={overdue ? styles.slaOverdue : styles.slaOk}>
                          <i className="fa-solid fa-clock me-1" aria-hidden="true"></i>
                          {overdue ? t("common.overdue") : t("common.onTrack")}
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
