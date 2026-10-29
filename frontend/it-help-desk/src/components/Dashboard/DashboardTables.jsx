/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard middle row — Recent Tickets table + Top Performers card.
import { useNavigate } from "react-router-dom";
import { Skeleton, SkeletonCard } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { useI18n } from "../../i18n";
import { formatDateTimeYear } from "../../utils/format";
import { CHART_COLORS } from "../../pages/TicketsList/ticketConstants";
import styles from "./DashboardContent.module.css";
import { IconTicket, IconArrowRight, IconChevronRight, IconTrophy, IconCrown } from "./icons";

/* Reference dot palette — the recent-tickets ID dots are CATEGORY
   coded (measured off the reference: software teal, hardware blue,
   network magenta, access indigo), not status coded. */
const CATEGORY_DOTS = {
  software: "#2FA37E",
  hardware: "#497BD3",
  network: "#A6448C",
  access: "#497ACD",
  other: "#9CA3AF",
};

/* Performer avatar tints alternate like the reference (blue →
   lavender → purple → purple-blue), then repeat. */
const AVATAR_TINTS = ["", "perfAlt2", "perfAlt3", "perfAlt4"];

export const RecentTickets = ({ recentTickets, loading }) => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  return (
    <div className={`${styles.card} ${styles.tableCard}`}>
      <div className={styles.cardHead}>
        <h6 className={styles.cardTitle}>
          <span className={styles.titleIcon}><IconTicket /></span>
          {t("dashboard.recentTickets")}
        </h6>
        <button className={styles.viewAll} onClick={() => navigate("/ticketslist")}>
          {t("dashboard.viewAll")}
          <IconArrowRight />
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : recentTickets.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-ticket"
          title={t("dashboard.noData")}
          description={t("dashboard.noTicketsHint")}
          action={
            <button className={styles.emptyBtn} onClick={() => navigate("/tickets")}>
              {t("tickets.createTicket")}
            </button>
          }
        />
      ) : (
        <div className={styles.tableScroll}>
          {/* table-cards — the app-wide stacked-card pattern for <768px so
              phones get readable labelled cards instead of a 560px-wide
              horizontally-scrolled table with clipped headers (QA-deep). */}
          <table className={`${styles.table} table-cards`}>
            <thead>
              <tr>
                <th>{t("dashboard.id")}</th>
                <th>{t("tickets.subject")}</th>
                <th>{t("tickets.priority")}</th>
                <th>{t("tickets.status")}</th>
                <th className={styles.thDate}>{t("tickets.created")}</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.map((tk) => (
                <tr
                  key={tk._id}
                  className={styles.row}
                  onClick={() => navigate(`/tickets/${tk._id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/tickets/${tk._id}`); }}
                >
                  <td data-label={t("dashboard.id")}>
                    <span
                      className={styles.statusDot}
                      style={{ background: CATEGORY_DOTS[tk.category] || CHART_COLORS[tk.status] || "#999" }}
                      aria-hidden="true"
                    ></span>
                    <span className={styles.ticketId}>
                      #{tk.ticketNumber || tk._id.slice(-5)}
                    </span>
                  </td>
                  <td className={styles.subject} data-label={t("tickets.subject")}>{tk.subject || tk.product}</td>
                  <td data-label={t("tickets.priority")}>
                    <span className={`${styles.pill} ${styles[`prio-${tk.priority}`] || ""}`}>
                      {t(`priority.${tk.priority}`)}
                    </span>
                  </td>
                  <td data-label={t("tickets.status")}>
                    <span className={`${styles.pill} ${styles[`stat-${tk.status}`] || ""}`}>
                      {t(`status.${tk.status}`)}
                    </span>
                  </td>
                  <td className={styles.dateCell} data-label={t("tickets.created")}>{formatDateTimeYear(tk.createdAt, lang)}</td>
                  <td className={`${styles.chevCell} no-label`} aria-hidden="true">
                    <span className={styles.rowChev}><IconChevronRight /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const TopPerformers = ({ topEmployees, loading }) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h6 className={styles.cardTitle}>
          <span className={styles.trophyIcon}><IconTrophy /></span>
          {t("dashboard.topPerformers")}
        </h6>
        <button className={styles.viewAll} onClick={() => navigate("/users")}>
          {t("dashboard.viewAll")}
          <IconArrowRight />
        </button>
      </div>
      {loading ? (
        <div className={styles.skeletonStack}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2.6rem" />)}
        </div>
      ) : topEmployees.length === 0 ? (
        <EmptyState icon="fa-solid fa-trophy" title={t("dashboard.noData")} description={t("dashboard.performersHint")} />
      ) : (
        <div className={styles.performerList}>
          {topEmployees.slice(0, 4).map((e, i) => (
            <div key={e.id || i} className={styles.performer}>
              <span className={styles.rank}>
                {i === 0 && (
                  <span className={styles.rankCrown} aria-hidden="true"><IconCrown /></span>
                )}
                {i + 1}
              </span>
              <span
                className={`${styles.performerAvatar} ${styles[AVATAR_TINTS[i % 4]] || ""}`}
                aria-hidden="true"
              >
                {e.name?.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"}
              </span>
              <span className={styles.performerMeta}>
                <span className={styles.performerName}>{e.name}</span>
                <span className={styles.performerEmail}>{e.email}</span>
              </span>
              <span className={styles.scoreBox}>
                <span className={styles.scoreVal}>{e.count}</span>
                <span className={styles.scoreLabel}>{t("status.resolved").toLowerCase()}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
