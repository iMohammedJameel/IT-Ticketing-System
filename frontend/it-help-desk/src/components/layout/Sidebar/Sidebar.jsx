/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Sidebar — pixel-true rebuild of the approved reference design
// ("Jameel IT Support" navy sidebar, 1536×1024 reference):
//   · solid navy #0A1F40, 238px wide, 1px light separator on the content side
//   · white+gold Jameel logo mark (extracted from the reference) + brand name
//     + letterspaced sub-line
//   · nav items: 48px tall, 8px-radius pill, Lucide-style 20px stroke icons,
//     14px labels; ACTIVE item = royal-blue gradient pill + white filled house
//   · Tickets item carries a blue circle badge with the active-ticket count
//     (admin/agent only — the stats endpoint is staff-scoped; silent no-badge
//     for employees or when the count is unavailable/zero)
//   · bottom: gold pyramids/sphinx line-art (extracted from the reference) +
//     3-line tagline with a gold accent bar — all bottom-anchored
// Role-aware items keep the app's routing intact (admin/agent/user filters).
// RTL: logical properties mirror the layout; the extracted art stays unmirrored
// (decorative, direction-neutral) exactly like the unified login rule.
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import LogoMark from "../../../assets/sidebar-logo-mark.png";
import SidebarArt from "../../../assets/sidebar-art.png";
import { useAuth } from "../../../context/AuthContext";
import { useI18n } from "../../../i18n";
import { ticketService } from "../../../services/ticketService";
import styles from "./Sidebar.module.css";

/* ── Lucide-style stroke icons (24 viewBox, stroke 2, round caps) ──
   Rendered at 24px — the reference icons measure ~22-23px visual. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const IconHome = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

/* ACTIVE dashboard icon — the reference's FILLED house (roof + right-slope
   chimney + arched door cutout), drawn with evenodd so the door stays navy. */
const IconHomeFilled = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" fillRule="evenodd" aria-hidden="true">
    <path d="M12 2.6 17.4 7.1V3.4h3.3v6.3l1.8 1.5v10.2H1.5V11.2L12 2.6ZM9.4 21.4v-3.7a2.6 2.6 0 0 1 5.2 0v3.7H9.4Z" />
  </svg>
);

const IconTicket = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

const IconInbox = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IconList = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </svg>
);

const IconPlusCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </svg>
);

const IconBookOpen = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ICONS = {
  home: IconHome,
  homeFilled: IconHomeFilled,
  ticket: IconTicket,
  inbox: IconInbox,
  list: IconList,
  plus: IconPlusCircle,
  book: IconBookOpen,
  chart: IconChart,
  settings: IconSettings,
};

function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isStaff } = useAuth();
  const { t } = useI18n();
  const [activeTickets, setActiveTickets] = useState(null);

  // Open-ticket badge on the Tickets item. Staff-only (the stats endpoint is
  // admin/agent scoped) + silent failure → employees / offline simply see no
  // badge, exactly like the reference when there is nothing to count.
  useEffect(() => {
    if (!isStaff) return undefined;
    let alive = true;
    ticketService
      .getStats()
      .then((res) => {
        const counts = res?.data?.counts;
        if (alive && counts) {
          setActiveTickets((counts.open || 0) + (counts.inProgress || 0));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isStaff]);

  const links = [
    // Admin-only: analytics dashboard (reference nav has exactly 7 items;
    // user management stays reachable via ⌘K palette + Top Performers "View All")
    { icon: "home", title: t("nav.dashboard"), path: "/dashboard", adminOnly: true },
    // Everyone: all tickets (badge = active ticket count)
    { icon: "ticket", title: t("nav.tickets"), path: "/ticketslist", badge: activeTickets },
    // Agents: personal queue
    { icon: "inbox", title: t("nav.queue"), path: "/queue", staffOnly: true },
    // Employees: their tickets home
    { icon: "list", title: t("nav.myTickets"), path: "/home", userOnly: true },
    // Everyone: create + KB + reports (admin) + settings
    { icon: "plus", title: t("nav.newTicket"), path: "/tickets" },
    { icon: "book", title: t("nav.knowledgeBase"), path: "/kb" },
    { icon: "chart", title: t("nav.reports"), path: "/reports", adminOnly: true },
    { icon: "settings", title: t("nav.settings"), path: "/settings" },
  ];

  const visible = links.filter(
    (item) =>
      (!item.adminOnly || isAdmin) &&
      (!item.staffOnly || isStaff) &&
      (!item.userOnly || !isStaff)
  );

  return (
    <aside
      className={`${styles.sidebar} app-sidebar ${isOpen ? styles.open : ""}`}
      aria-label="Main navigation"
    >
      {/* brand — extracted reference mark + live i18n name/sub-line */}
      <div className={styles.logo}>
        <img className={styles.logoMark} src={LogoMark} alt="" width={50} height={85} />
        <div className={styles.logoText}>
          <span className={styles.brandName}>{t("nav.brandName")}</span>
          <span className={styles.brandSub}>{t("nav.brandSub")}</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {visible.map((item) => {
          const Icon = ICONS[item.icon] || ICONS.ticket;
          return (
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
              key={item.path}
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <span className={styles.navIcon}>
                    {item.icon === "home" && isActive ? <IconHomeFilled /> : <Icon />}
                  </span>
                  <span className={styles.navLabel}>{item.title}</span>
                  {item.badge ? (
                    <span className={styles.badge}>{item.badge}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* bottom decoration — extracted reference art + tagline + gold bar */}
      <img
        className={styles.sidebarArt}
        src={SidebarArt}
        alt=""
        width={238}
        height={254}
        aria-hidden="true"
      />
      <p className={styles.tagline}>
        <span>{t("nav.tagline1")}</span>
        <span>{t("nav.tagline2")}</span>
        <span>{t("nav.tagline3")}</span>
      </p>
      <span className={styles.goldBar} aria-hidden="true" />
    </aside>
  );
}

export default Sidebar;
