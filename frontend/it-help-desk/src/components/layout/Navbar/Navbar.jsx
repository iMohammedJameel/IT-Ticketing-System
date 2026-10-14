/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Navbar — WebSocket notifications, theme + language toggles, palette trigger.
// The old always-visible search box is replaced by a "Search… (⌘K)" trigger
// that opens the command palette (unified search: tickets + KB + actions) —
// one search to rule them all instead of two overlapping search UIs.
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useNotifications } from "../../../context/NotificationContext";
import { useI18n } from "../../../i18n";
import { formatRelativeTime } from "../../../utils/format";
import { paletteShortcutLabel } from "../../../utils/platform";
import { getNotifMeta } from "../../../pages/TicketsList/ticketConstants";
import styles from "./Navbar.module.css";

/* Stroke icon set (24px, stroke 2 — Lucide style, mirrors Sidebar +
   DashboardContent). The reference navbar is all outline icons; the
   Font Awesome solid fills don't match that look. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
const IconMenu = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" {...stroke} aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" {...stroke} aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" {...stroke} aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...stroke} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function Navbar({ onMenuClick, onOpenPalette }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const { t, toggleLang, lang } = useI18n();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const handleNotifClick = (n) => {
    if (!n.read) markAsRead(n._id);
    if (n.ticket) navigate(`/tickets/${n.ticket._id || n.ticket}`);
    setShowNotifications(false);
  };

  const userName = user?.name || "User";

  return (
    <nav className={`${styles.nav} app-navbar d-flex justify-content-between align-items-center`} role="navigation">
      <div className="d-flex align-items-center gap-3">
        <button
          className={styles.hamburger}
          onClick={onMenuClick}
          aria-label={t("nav.openMenu")}
        >
          <IconMenu />
        </button>

        {/* Command palette trigger — replaces the old search box */}
        <button
          type="button"
          className={`${styles.searchBox} d-flex align-items-center`}
          onClick={onOpenPalette}
          aria-label={t("palette.placeholder")}
        >
          <IconSearch />
          {/* dir="auto" + min-width:0 (module CSS) so the placeholder
              truncates with an ellipsis at the inline END in both RTL/LTR
              instead of hard-clipping at the start (BUG-qa6-13). */}
          <span className={styles.searchText} dir="auto">{t("palette.placeholder")}…</span>
          {/* Shared helper with the palette placeholder — one label per OS. */}
          <kbd className="kbd" aria-hidden="true">{paletteShortcutLabel()}</kbd>
        </button>
      </div>

      <div className="d-flex justify-content-center align-items-center gap-2 gap-md-3">
        {/* Language toggle — EN ⇄ AR (RTL flips the whole app) */}
        <button
          className={styles.iconButton}
          onClick={toggleLang}
          aria-label={lang === "ar" ? t("nav.switchToEn") : t("nav.switchToAr")}
          title={t("common.language")}
          style={{ fontWeight: 700, fontSize: "0.8rem" }}
        >
          {t("common.language")}
        </button>

        {/* Theme toggle */}
        <button
          className={styles.iconButton}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? t("nav.toLight") : t("nav.toDark")}
          title={t("nav.toggleTheme")}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className={styles.notificationSection}>
          <button
            className={styles.iconButton}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={t("nav.notificationsCount", { a: unreadCount })}
            aria-expanded={showNotifications}
          >
            <IconBell />
            {unreadCount > 0 && <span className={styles.countNoti}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className={styles.notifDropdown} onClick={(e) => e.stopPropagation()} role="menu">
              <div className={styles.notifHeader}>
                <span>{t("nav.notifications")}</span>
                {unreadCount > 0 && (
                  <button
                    className={styles.notifMarkAllBtn}
                    onClick={() => markAllAsRead()}
                  >
                    {t("common.markAllRead")}
                  </button>
                )}
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    <i className="fa-regular fa-bell-slash" aria-hidden="true"></i>
                    <p>{t("common.noNotifications")}</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    const meta = getNotifMeta(n.type);
                    return (
                      <button
                        key={n._id}
                        className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}
                        onClick={() => handleNotifClick(n)}
                        role="menuitem"
                      >
                        <div className={styles.notifAvatar} style={{ background: meta.color }}>
                          <i className={`fa-solid ${meta.icon}`} aria-hidden="true"></i>
                        </div>
                        <div className={styles.notifContent}>
                          <p>{n.title}</p>
                          <span>{formatRelativeTime(n.createdAt, lang)}</span>
                        </div>
                        {!n.read && <div className={styles.notifDot} aria-label={t("common.unread")}></div>}
                      </button>
                    );
                  })
                )}
              </div>
              <div className={styles.notifFooter}>
                <button onClick={() => { navigate("/notifications"); setShowNotifications(false); }}>
                  {t("common.seeAll")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar & Profile Dropdown — reference design: avatar + name/role
            stack + chevron, all one clickable chip opening the menu */}
        <div
          ref={avatarRef}
          className="d-flex justify-content-center align-items-center gap-3"
          style={{ position: "relative" }}
        >
          <button
            className={styles.userChip}
            onClick={() => setShowDropdown(!showNotifications && !showDropdown)}
            aria-label={t("nav.profileMenu")}
            aria-expanded={showDropdown}
            aria-haspopup="menu"
          >
            <span className={styles.avatar} aria-hidden="true">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  loading="lazy"
                />
              ) : (
                userName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0].toUpperCase())
                  .join("") || userName.charAt(0).toUpperCase()
              )}
            </span>
            <span className={styles.userMeta}>
              <span className={styles.userName}>{userName}</span>
              <span className={styles.userRole}>{t(`role.${user?.role || "user"}`)}</span>
            </span>
            <IconChevronDown />
          </button>

          {showDropdown && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownUser} aria-hidden="true">
                <strong>{userName}</strong>
                <small>{user?.email}</small>
              </div>
              <button
                className={styles.dropdownItem}
                onClick={() => { navigate("/settings"); setShowDropdown(false); }}
                role="menuitem"
              >
                <i className="fa-solid fa-gear" aria-hidden="true"></i>
                <span>{t("nav.settings")}</span>
              </button>
              <button
                className={styles.dropdownItem}
                onClick={handleLogout}
                role="menuitem"
              >
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
