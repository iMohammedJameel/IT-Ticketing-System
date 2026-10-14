/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// UserHome — the employee's landing page: their open tickets with SLA
// countdowns + status summary + quick actions. Employees used to land on
// a blank create-ticket form; now they land on "your stuff".
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ticketService } from "../../services/ticketService";
import { useI18n } from "../../i18n";
import { usePageTitle, useAsync } from "../../hooks";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { formatSlaCountdown, formatRelativeTime } from "../../utils/format";
import { getStatusInfo, getPriorityInfo } from "../TicketsList/ticketConstants";
import styles from "./UserHome.module.css";

function UserHome() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  usePageTitle(t("nav.myTickets"));

  const { data, loading } = useAsync(
    () => ticketService.list({ limit: 50, sort: "createdAt", order: "desc" }),
    []
  );
  // Memoize the derived array — `data?.data?.tickets || []` creates a NEW
  // array identity on every render, which would defeat the useMemo below
  // and re-run the summary computation each paint.
  const tickets = useMemo(() => data?.data?.tickets || [], [data]);

  const summary = useMemo(() => {
    const open = tickets.filter((tk) => tk.status === "open").length;
    const progress = tickets.filter((tk) => tk.status === "in-progress").length;
    const resolved = tickets.filter((tk) => ["resolved", "closed"].includes(tk.status)).length;
    return { open, progress, resolved };
  }, [tickets]);

  const active = tickets.filter((tk) => !["resolved", "closed"].includes(tk.status));

  const cards = [
    { key: "open", label: t("dashboard.open"), value: summary.open, icon: "fa-regular fa-envelope-open", color: "var(--status-open)" },
    { key: "progress", label: t("dashboard.inProgress"), value: summary.progress, icon: "fa-solid fa-spinner", color: "var(--status-progress)" },
    { key: "resolved", label: t("dashboard.resolved"), value: summary.resolved, icon: "fa-solid fa-circle-check", color: "var(--status-resolved)" },
  ];

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Greeting + quick actions */}
        <div className={`${styles.head} d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2`}>
          <div>
            <h1 className={styles.title}>{t("home.hello", { a: user?.name?.split(" ")[0] || "" })}</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>{t("home.subtitle")}</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary btn-sm" onClick={() => navigate("/kb")}>
              <i className="fa-solid fa-book me-1" aria-hidden="true"></i>
              {t("nav.knowledgeBase")}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets")}>
              <i className="fa-solid fa-plus me-1" aria-hidden="true"></i>
              {t("tickets.newTicket")}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="row g-3 mb-4">
          {cards.map((c) => (
            <div className="col-6 col-md-4" key={c.key}>
              <div className={styles.card} style={{ borderTopColor: c.color }}>
                <div className={styles.cardIcon} style={{ color: c.color }}>
                  <i className={c.icon} aria-hidden="true"></i>
                </div>
                <div>
                  <div className={styles.cardValue}>{loading ? <Skeleton width="2rem" /> : c.value}</div>
                  <div className={styles.cardLabel}>{c.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active tickets with SLA countdowns — block container (NOT the flex
            .card used by the summary tiles: reusing it laid the title + rows
            out SIDE BY SIDE, pushing rows past the viewport's left edge in RTL) */}
        <div className={styles.listCard}>
          <h2 className={styles.sectionTitle}>
            <i className="fa-regular fa-clock me-2" aria-hidden="true"></i>
            {t("home.activeTickets")}
          </h2>

          {loading ? (
            <div className="p-3 d-flex flex-column gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="3.5rem" />)}
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-mug-hot"
              title={t("home.allClear")}
              description={t("home.allClearHint")}
              action={
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets")}>
                  {t("tickets.createTicket")}
                </button>
              }
            />
          ) : (
            active.map((tk) => {
              const statusInfo = getStatusInfo(tk.status);
              const priorityInfo = getPriorityInfo(tk.priority);
              const slaLeft = formatSlaCountdown(tk.slaDueDate, t("common.overdue"));
              const late = tk.slaDueDate && new Date(tk.slaDueDate) < new Date();
              return (
                <button key={tk._id} className={styles.row} onClick={() => navigate(`/tickets/${tk._id}`)}>
                  <span className={styles.rowStatus} style={{ background: statusInfo.color }} title={t(`status.${tk.status}`)}>
                    <span className="visually-hidden">{t(`status.${tk.status}`)}</span>
                  </span>
                  <span className={styles.rowNumber}>{tk.ticketNumber}</span>
                  <span className={styles.rowSubject}>{tk.subject || tk.product}</span>
                  <span style={{ color: priorityInfo.color, fontWeight: 600, fontSize: "0.75rem" }}>
                    {t(`status.${tk.priority}`)}
                  </span>
                  {slaLeft && (
                    <span className={late ? styles.rowSlaLate : styles.rowSla}>
                      <i className="fa-regular fa-clock me-1" aria-hidden="true"></i>
                      {slaLeft}
                    </span>
                  )}
                  <span className={styles.rowDate}>{formatRelativeTime(tk.createdAt, lang)}</span>
                  <i className={`fa-solid ${lang === "ar" ? "fa-chevron-left" : "fa-chevron-right"} ${styles.rowChevron}`} aria-hidden="true"></i>
                </button>
              );
            })
          )}
        </div>

        {/* Link to all tickets */}
        <div className="text-center mt-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/ticketslist")}>
            {t("home.viewAll")} <i className="fa-solid fa-arrow-right ms-1" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </section>
  );
}

export default UserHome;
