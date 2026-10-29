/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// AgentQueue — the agent's home screen: a triage strip (assigned to me /
// unassigned / at-risk counts) + the ticket list preset to "mine".
// Agents live here; the old UX dumped them into a blank create-ticket form.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { ticketService } from "../../services/ticketService";
import { useI18n } from "../../i18n";
import { usePageTitle } from "../../hooks";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { formatDate, formatSlaCountdown } from "../../utils/format";
import { getStatusInfo, getPriorityInfo } from "../TicketsList/ticketConstants";
import styles from "./AgentQueue.module.css";

function AgentQueue() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  usePageTitle(t("nav.queue"));

  const [view, setView] = useState("mine"); // mine | unassigned | at-risk
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ mine: 0, unassigned: 0, atRisk: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    try {
      const [mine, unassigned, atRisk] = await Promise.allSettled([
        ticketService.list({ assignedTo: "me", limit: 1 }),
        ticketService.list({ unassigned: true, limit: 1 }),
        ticketService.list({ slaAtRisk: true, limit: 1 }),
      ]);
      setCounts({
        mine: mine.status === "fulfilled" ? mine.value.data.pagination?.total ?? 0 : 0,
        unassigned: unassigned.status === "fulfilled" ? unassigned.value.data.pagination?.total ?? 0 : 0,
        atRisk: atRisk.status === "fulfilled" ? atRisk.value.data.pagination?.total ?? 0 : 0,
      });
    } catch {
      /* counts are decorative — silent */
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 25, sort: "createdAt", order: "desc" };
      if (view === "mine") params.assignedTo = "me";
      if (view === "unassigned") params.unassigned = true;
      if (view === "at-risk") params.slaAtRisk = true;
      const res = await ticketService.list(params);
      setTickets(res.data.tickets || []);
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [view, t]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const chips = [
    { key: "mine", icon: "fa-user-check", color: "var(--primary)", count: counts.mine },
    { key: "unassigned", icon: "fa-inbox", color: "var(--prio-medium)", count: counts.unassigned },
    { key: "at-risk", icon: "fa-triangle-exclamation", color: "var(--prio-urgent)", count: counts.atRisk },
  ];

  const slaOverdue = (tk) =>
    tk.slaDueDate && new Date(tk.slaDueDate) < new Date() && !["resolved", "closed"].includes(tk.status);

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className={`${styles.head} d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2`}>
          <div>
            <h1 className={styles.title}>
              <i className="fa-solid fa-inbox me-2" aria-hidden="true"></i>
              {t("queue.title")}
            </h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              {t("queue.hello", { a: user?.name?.split(" ")[0] || "" })} — {t("queue.subtitle")}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/ticketslist")}>
            {t("tickets.title")} <i className={`fa-solid ${lang === "ar" ? "fa-arrow-left" : "fa-arrow-right"} ms-1`} aria-hidden="true"></i>
          </button>
        </div>

        {/* Triage chips */}
        <div className="row g-3 mb-4">
          {chips.map((chip) => (
            <div className="col-12 col-md-4" key={chip.key}>
              <button
                className={`${styles.chip} ${view === chip.key ? styles.chipActive : ""}`}
                onClick={() => setView(chip.key)}
                aria-pressed={view === chip.key}
                style={{ borderTopColor: chip.color }}
              >
                <div className={styles.chipIcon} style={{ color: chip.color }}>
                  <i className={`fa-solid ${chip.icon}`} aria-hidden="true"></i>
                </div>
                <div className="text-start">
                  <div className={styles.chipCount}>{chip.count}</div>
                  <div className={styles.chipLabel}>{t(`queue.${chip.key.replace("-", "_")}`)}</div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Ticket rows */}
        <div className={styles.card}>
          {loading ? (
            <div className="p-3 d-flex flex-column gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="3.5rem" />)}
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-mug-hot"
              title={t(`queue.empty_${view.replace("-", "_")}`)}
              description={t("queue.emptyHint")}
            />
          ) : (
            tickets.map((tk) => {
              const statusInfo = getStatusInfo(tk.status);
              const priorityInfo = getPriorityInfo(tk.priority);
              return (
                <button
                  key={tk._id}
                  className={styles.row}
                  onClick={() => navigate(`/tickets/${tk._id}`)}
                >
                  <span className={styles.rowStatus} style={{ background: statusInfo.color }} title={t(`status.${tk.status}`)}>
                    <span className="visually-hidden">{t(`status.${tk.status}`)}</span>
                  </span>
                  <span className={styles.rowNumber}>{tk.ticketNumber}</span>
                  <span className={styles.rowSubject}>{tk.subject || tk.product}</span>
                  {/* QA-uiux (WCAG 1.4.3): ink shade — the vivid base color
                      measured 2.1–3.8:1 as 12px text on the card. */}
                  <span className={styles.rowPriority} style={{ color: priorityInfo.ink, fontWeight: 600 }}>
                    {t(`priority.${tk.priority}`)}
                  </span>
                  {tk.slaDueDate && !["resolved", "closed"].includes(tk.status) && (
                    <span className={slaOverdue(tk) ? styles.rowSlaLate : styles.rowSla}>
                      <i className="fa-regular fa-clock me-1" aria-hidden="true"></i>
                      {/* FIX(QA-rec-3): real remaining/overdue time, not just a flag */}
                      {formatSlaCountdown(tk.slaDueDate, t("common.overdue"))}
                    </span>
                  )}
                  <span className={styles.rowDate}>{formatDate(tk.createdAt, lang)}</span>
                  <i className={`fa-solid ${lang === "ar" ? "fa-chevron-left" : "fa-chevron-right"} ${styles.rowChevron}`} aria-hidden="true"></i>
                </button>
              );
            })
          )}
          {/* QA-deep: short queues left a bare card floating in white space —
              a summary footer anchors the card and always offers the escape
              hatch to the full (filterable) tickets list. */}
          {!loading && tickets.length > 0 && (
            <div className={styles.listFooter}>
              <span className={styles.listFooterText}>
                {t("queue.showing", { a: tickets.length })}
              </span>
              <button className={styles.listFooterBtn} onClick={() => navigate("/ticketslist")}>
                {t("queue.openFullList")}
                <i className={`fa-solid ${lang === "ar" ? "fa-arrow-left" : "fa-arrow-right"} ms-1`} aria-hidden="true"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AgentQueue;
