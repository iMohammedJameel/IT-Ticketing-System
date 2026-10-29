/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Notifications page — full list with mark-read, type icons, localized time
import { useNotifications } from "../../context/NotificationContext";
import EmptyState from "../../components/common/EmptyState";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n";
import { usePageTitle } from "../../hooks";
import { formatRelativeTime } from "../../utils/format";
import { getNotifMeta } from "../TicketsList/ticketConstants";
import styles from "./Notifications.module.css";

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  usePageTitle(t("nav.notifications"));

  const handleClick = (n) => {
    if (!n.read) markAsRead(n._id);
    if (n.ticket) navigate(`/tickets/${n.ticket._id || n.ticket}`);
  };

  return (
    <section className="p-4">
      <div className="container-fluid" style={{ maxWidth: "900px" }}>
        {/* Header */}
        <div className={styles.tabBar}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-bell" aria-hidden="true"></i>
            <span>{t("nav.notifications")}</span>
          </div>
          {notifications.some((n) => !n.read) && (
            <button className="btn btn-outline-primary btn-sm" onClick={markAllAsRead}>
              <i className="fa-solid fa-check-double me-1" aria-hidden="true"></i>
              {t("common.markAllRead")}
            </button>
          )}
        </div>

        {/* Content Card */}
        <div className={styles.contentCard}>
          {notifications.length === 0 ? (
            <EmptyState
              icon="fa-regular fa-bell-slash"
              title={t("common.noNotifications")}
              description={t("notifications.hint")}
            />
          ) : (
            <div className="d-flex flex-column gap-2">
              {notifications.map((n) => {
                const meta = getNotifMeta(n.type);
                return (
                  <button
                    key={n._id}
                    onClick={() => handleClick(n)}
                    className={`${styles.notificationItem} ${!n.read ? styles.unread : ""}`}
                  >
                    <div
                      className={styles.notifIcon}
                      style={{ background: meta.color }}
                      aria-hidden="true"
                    >
                      <i className={`fa-solid ${meta.icon}`}></i>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {/* QA-deep (bidi): notifications are stored per-event in
                          whatever language the actor used — dir="auto" renders
                          each entry in its own script direction (EN titles no
                          longer mirror their punctuation inside RTL rows). */}
                      <div className={styles.notifTitle} dir="auto">{n.title}</div>
                      <div className={styles.notifMessage} dir="auto">{n.message}</div>
                      <div className={styles.notifTime}>{formatRelativeTime(n.createdAt, lang)}</div>
                    </div>
                    {!n.read && <span className={styles.unreadDot} aria-label="unread" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
