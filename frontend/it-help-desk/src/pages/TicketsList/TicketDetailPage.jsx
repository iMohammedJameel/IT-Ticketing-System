/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketDetailPage — a REAL page (not the old 90vh modal): shareable URL,
// working back button, refresh-safe. Renders TicketDetailView.
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useI18n } from "../../i18n";
import { usePageTitle } from "../../hooks";
import { ticketService } from "../../services/ticketService";
import { authService } from "../../services/authService";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import TicketDetailView from "./TicketDetailView";
import styles from "./TicketsList.module.css";

function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();
  const { onlineStaff } = useNotifications();
  // isRtl — the back arrow must POINT WITH the reading direction:
  // LTR back = left arrow, RTL back = right arrow (same pattern as
  // KBArticlePage). Previously hardcoded fa-arrow-left, which pointed
  // FORWARD in the Arabic UI (QA-visual finding).
  const { t, isRtl } = useI18n();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [staffList, setStaffList] = useState([]);

  usePageTitle(ticket ? `${ticket.ticketNumber}${ticket.subject ? ` — ${ticket.subject}` : ""}` : t("tickets.detailsTab"));

  // Fetch the ticket (and staff list for the assign dropdown)
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await ticketService.getById(id);
      setTicket(res.data.ticket);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  useEffect(() => {
    if (!isStaff) return;
    // FIX(QA-004..007): /auth/users is admin-only and 403'd for agents —
    // the staff-directory endpoint is allowed for admin + agent and returns
    // only the minimal fields the assign dropdown needs.
    authService
      .getStaffDirectory()
      .then((res) => setStaffList(res.data.users || []))
      .catch(() => {});
  }, [isStaff]);

  // Silent refresh (live WS activity already updates comments; this re-pulls
  // the ticket record so status/priority changes made by others appear too)
  const handleRefreshed = useCallback(() => {
    ticketService.getById(id).then((res) => setTicket(res.data.ticket)).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <section className="p-4">
        <div className="container-fluid">
          <div className={styles.detailPageHead}>
            <Skeleton width="8rem" height="1.2rem" />
            <Skeleton width="16rem" height="2rem" />
          </div>
          <Skeleton height="3rem" />
          <div className="row g-4 mt-1">
            <div className="col-12 col-lg-8"><Skeleton height="320px" /></div>
            <div className="col-12 col-lg-4"><Skeleton height="320px" /></div>
          </div>
        </div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="p-4">
        <div className="container-fluid">
          <div className={styles.card}>
            <EmptyState
              icon="fa-solid fa-ticket-simple"
              title={t("tickets.notFound")}
              description={t("tickets.notFoundHint")}
              action={
                <Link className="btn btn-primary btn-sm" to="/ticketslist">
                  {t("tickets.title")}
                </Link>
              }
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 print-area">
      <div className="container-fluid">
        {/* Page head — back + print (hidden when printing) */}
        <div className={`d-flex justify-content-between align-items-center mb-3 no-print ${styles.detailPageHead}`}>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate(-1)}
          >
            <i className={`fa-solid ${isRtl ? "fa-arrow-right" : "fa-arrow-left"} me-1`} aria-hidden="true"></i>
            <span className="visually-hidden">&nbsp;</span>
            {t("common.back")}
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => window.print()}
            aria-label={t("common.print")}
          >
            <i className="fa-solid fa-print me-1" aria-hidden="true"></i>
            {t("common.print")}
          </button>
        </div>

        <TicketDetailView
          ticket={ticket}
          isStaff={isStaff}
          currentUserId={user?.id}
          staffList={staffList}
          onlineStaff={onlineStaff}
          onSaved={handleRefreshed}
        />
      </div>
    </section>
  );
}

export default TicketDetailPage;
