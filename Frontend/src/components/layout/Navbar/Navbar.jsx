// Navbar — uses AuthContext (no localStorage polling), real notifications via WebSocket,
// theme toggle, accessible buttons with aria-labels, real search bar
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useNotifications } from "../../../context/NotificationContext";
import styles from "./Navbar.module.css";

function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notifRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/ticketslist?search=${encodeURIComponent(searchQuery)}`);
    setSearchQuery("");
  };

  const handleNotifClick = (n) => {
    if (!n.read) markAsRead(n._id);
    if (n.ticket) navigate(`/ticketslist?id=${n.ticket._id || n.ticket}`);
    setShowNotifications(false);
  };

  const formatTime = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const userName = user?.name || "User";

  return (
    <nav className={`${styles.nav} d-flex justify-content-between align-items-center`} role="navigation">
      <div className="d-flex align-items-center gap-3">
        <button
          className={styles.hamburger}
          onClick={onMenuClick}
          aria-label="Open sidebar menu"
        >
          <i className="fa-solid fa-bars" aria-hidden="true"></i>
        </button>

        {/* Real search bar */}
        <form onSubmit={handleSearch} className={`${styles.searchBox} d-flex align-items-center`} role="search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            type="search"
            placeholder="Search tickets..."
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tickets"
          />
        </form>
      </div>

      <div className="d-flex justify-content-center align-items-center gap-3">
        {/* Theme toggle */}
        <button
          className={styles.iconButton}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title="Toggle theme"
        >
          <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`} aria-hidden="true"></i>
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className={styles.notificationSection}>
          <button
            className={styles.iconButton}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={showNotifications}
          >
            <i className="fa-solid fa-bell" aria-hidden="true"></i>
            {unreadCount > 0 && <span className={styles.countNoti}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className={styles.notifDropdown} onClick={(e) => e.stopPropagation()} role="menu">
              <div className={styles.notifHeader}>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    className={styles.notifMarkAllBtn}
                    onClick={() => markAllAsRead()}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    <i className="fa-regular fa-bell-slash" aria-hidden="true"></i>
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n._id}
                      className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}
                      onClick={() => handleNotifClick(n)}
                      role="menuitem"
                    >
                      <div className={styles.notifAvatar}>
                        <i className="fa-solid fa-bell" aria-hidden="true"></i>
                      </div>
                      <div className={styles.notifContent}>
                        <p>{n.title}</p>
                        <span>{formatTime(n.createdAt)}</span>
                      </div>
                      {!n.read && <div className={styles.notifDot} aria-label="unread"></div>}
                    </button>
                  ))
                )}
              </div>
              <div className={styles.notifFooter}>
                <button onClick={() => { navigate("/notifications"); setShowNotifications(false); }}>
                  See All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar & Profile Dropdown */}
        <div
          ref={avatarRef}
          className="d-flex justify-content-center align-items-center gap-3"
          style={{ position: "relative" }}
        >
          <span aria-hidden="true">{userName}</span>
          <button
            className={styles.avatar}
            onClick={() => setShowDropdown(!showNotifications && !showDropdown)}
            aria-label="Open profile menu"
            aria-expanded={showDropdown}
            aria-haspopup="menu"
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={`${userName}'s profile`}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                loading="lazy"
              />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </button>

          {showDropdown && (
            <div className={styles.dropdown} role="menu">
              <button
                className={styles.dropdownItem}
                onClick={() => { navigate("/settings"); setShowDropdown(false); }}
                role="menuitem"
              >
                <i className="fa-solid fa-gear" aria-hidden="true"></i>
                <span>Settings</span>
              </button>
              <button
                className={styles.dropdownItem}
                onClick={handleLogout}
                role="menuitem"
              >
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
