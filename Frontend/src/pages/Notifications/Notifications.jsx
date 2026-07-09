// Notifications page — full list with mark-read / delete
import { useNotifications } from "../../context/NotificationContext";
import EmptyState from "../../components/common/EmptyState";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead, loadUnread } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n) => {
    if (!n.read) markAsRead(n._id);
    if (n.ticket) navigate(`/ticketslist?id=${n.ticket._id || n.ticket}`);
  };

  const formatTime = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: "var(--primary)" }}>Notifications</h2>
        {notifications.some((n) => !n.read) && (
          <button className="btn btn-outline-primary btn-sm" onClick={markAllAsRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          description="You'll see notifications here when tickets are updated, assigned, or commented on."
        />
      ) : (
        <div className="d-flex flex-column gap-2">
          {notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleClick(n)}
              className="card text-start"
              style={{
                background: n.read ? "var(--bg-card)" : "rgba(74, 78, 140, 0.05)",
                border: `1px solid ${n.read ? "var(--border)" : "rgba(74, 78, 140, 0.2)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "16px",
                cursor: "pointer",
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong style={{ color: "var(--text-dark)" }}>{n.title}</strong>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0" }}>
                    {n.message}
                  </p>
                  <small style={{ color: "var(--text-muted)" }}>{formatTime(n.createdAt)}</small>
                </div>
                {!n.read && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--primary)",
                      marginTop: "8px",
                    }}
                    aria-label="unread"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
