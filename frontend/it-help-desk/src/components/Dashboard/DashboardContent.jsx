/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard content — rebuilt to match the approved reference design:
// welcome header, 5 stat cards (tinted icon + label, big value, trend row),
// Recent Tickets TABLE + Top Performers, 3 charts (category donut with side
// legend, priority bars, monthly multi-line trends) and the right panel
// (profile menu + quick actions + need help). Stroke icons are inline SVGs
// (Lucide-style) like the sidebar — Font Awesome fills don't match the
// reference's outline look.
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Area, CartesianGrid, LabelList,
} from "recharts";
import { ticketService } from "../../services/ticketService";
import { authService } from "../../services/authService";
import { companyService } from "../../services/companyService";
import { kbService } from "../../services/kbService";
import { useAsync, useIsMobile, useLocalStorage, usePageTitle } from "../../hooks";
import { Skeleton, SkeletonCard } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { useI18n } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatDateTimeYear } from "../../utils/format";
import { CHART_COLORS } from "../../pages/TicketsList/ticketConstants";
import styles from "./DashboardContent.module.css";

/* ------------------------------------------------------------------ *
 * Stroke icon set (24px, stroke 2 — Lucide style, mirrors Sidebar)
 * ------------------------------------------------------------------ */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const IconTicket = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
  </svg>
);
const IconAlertCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" /><path d="M12 16h.01" />
  </svg>
);
const IconHourglass = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="M5 22h14" /><path d="M5 2h14" />
    <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
    <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
  </svg>
);
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const IconWarning = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M5 12h14" /><path d="M12 5v14" />
  </svg>
);
const IconList = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
    <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
  </svg>
);
const IconBookOpen = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
const IconGear = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconHeadset = () => (
  <svg viewBox="0 0 24 24" width="44" height="44" {...stroke} aria-hidden="true">
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1z" />
    <path d="M21 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1z" />
    <path d="M21 17v1a4 4 0 0 1-4 4h-4" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...stroke} aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);
const IconTrendUp = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} aria-hidden="true">
    <path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
  </svg>
);
const IconTrendDown = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke} aria-hidden="true">
    <path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" />
  </svg>
);
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
const IconCrown = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path d="M5 20h14" />
  </svg>
);
const IconBars = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Trend helper — month-over-month delta from the monthly chart data
 * ------------------------------------------------------------------ */
const monthTotal = (m) =>
  m ? (m.Open || 0) + (m.InProgress || 0) + (m.Resolved || 0) + (m.Closed || 0) : 0;

const computeTrend = (chartData, key) => {
  if (!chartData || chartData.length < 2) return null;
  const last = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const lastVal = key === "total" ? monthTotal(last) : last?.[key] || 0;
  const prevVal = key === "total" ? monthTotal(prev) : prev?.[key] || 0;
  if (prevVal === 0) return null;
  const pct = Math.round(((lastVal - prevVal) / prevVal) * 100);
  return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
};

/* ------------------------------------------------------------------ *
 * First-run checklist (dismissible) — kept from the previous build;
 * renders null once setup tasks are complete, so the reference layout
 * is untouched in the steady state.
 * ------------------------------------------------------------------ */
const OnboardingChecklist = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useLocalStorage("onboarding_dismissed", false);

  const { data: agentsData } = useAsync(
    () => authService.getAllUsers({ role: "agent", limit: 1, status: "active" }), []
  );
  const { data: companiesData } = useAsync(() => companyService.list({ limit: 1 }), []);
  const { data: kbData } = useAsync(() => kbService.list({ limit: 1 }), []);
  const { data: slaData } = useAsync(() => ticketService.getSlaPolicies(), []);

  const items = [
    { label: t("onboarding.agents"), done: (agentsData?.data?.pagination?.total ?? 0) > 0, path: "/users" },
    { label: t("onboarding.companies"), done: (companiesData?.data?.companies?.length ?? 0) > 0, path: "/settings" },
    { label: t("onboarding.kbArticle"), done: (kbData?.data?.articles?.length ?? 0) > 0, path: "/kb" },
    { label: t("onboarding.slaPolicy"), done: (slaData?.data?.policies?.length ?? 0) > 0, path: "/settings" },
  ];
  const allDone = items.every((i) => i.done);

  if (dismissed || allDone) return null;

  return (
    <div className={`${styles.card} ${styles.onboard}`} role="status">
      <div className={styles.onboardHead}>
        <h6 className={styles.cardTitle}>
          <i className="fa-solid fa-rocket me-1" aria-hidden="true"></i>
          {t("onboarding.title")}
        </h6>
        <button
          className={styles.onboardClose}
          onClick={() => setDismissed(true)}
          aria-label={t("common.close")}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div className={styles.onboardItems}>
        {items.map((item) => (
          <button
            key={item.label}
            className={styles.onboardItem}
            onClick={() => navigate(item.path)}
            style={{ opacity: item.done ? 0.65 : 1 }}
          >
            <i
              className={`fa-solid ${item.done ? "fa-circle-check" : "fa-circle"} ${styles.onboardIcon}`}
              style={{ color: item.done ? "var(--status-resolved)" : "var(--text-muted)" }}
              aria-hidden="true"
            ></i>
            <span style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Right panel — profile menu card
 * ------------------------------------------------------------------ */
const ProfileCard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const menu = [
    { icon: <IconUser />, label: t("side.profile"), run: () => navigate("/settings") },
    { icon: <IconLock />, label: t("side.changePassword"), run: () => navigate("/settings") },
    {
      icon: <IconBell />, label: t("nav.notifications"), badge: unreadCount,
      run: () => navigate("/notifications"),
    },
    { icon: <IconLogout />, label: t("nav.logout"), run: () => logout(), danger: true },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.profileHead}>
        <div className={styles.profileAvatar} aria-hidden="true">
          {user?.profileImage ? (
            <img src={user.profileImage} alt="" />
          ) : (
            initials || <IconUser />
          )}
        </div>
        <div className={styles.profileMeta}>
          <div className={styles.profileName}>{userName}</div>
          <div className={styles.profileRole}>{t(`role.${user?.role || "user"}`)}</div>
        </div>
      </div>
      <div className={styles.menuDivider} aria-hidden="true"></div>
      <nav className={styles.profileMenu} aria-label={t("nav.profileMenu")}>
        {menu.map((m) => (
          <button key={m.label} className={`${styles.menuItem} ${m.danger ? styles.menuDanger : ""}`} onClick={m.run}>
            {m.icon}
            <span className={styles.menuLabel}>{m.label}</span>
            {m.badge > 0 && (
              <span className={styles.menuBadge}>{m.badge > 9 ? "9+" : m.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Right panel — quick actions + need help
 * ------------------------------------------------------------------ */
const QuickActions = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const actions = [
    { icon: <IconPlus />, label: t("side.newTicket"), cls: "qaBlue", run: () => navigate("/tickets") },
    ...(isStaff
      ? [{ icon: <IconList />, label: t("side.myQueue"), cls: "qaPurple", run: () => navigate("/queue") }]
      : []),
    { icon: <IconBookOpen />, label: t("side.knowledgeBase"), cls: "qaGreen", run: () => navigate("/kb") },
    { icon: <IconGear />, label: t("side.settings"), cls: "qaSlate", run: () => navigate("/settings") },
  ];

  return (
    <div className={styles.card}>
      <h6 className={styles.sideTitle}>{t("side.quickActions")}</h6>
      <div className={styles.qaGrid}>
        {actions.map((a) => (
          <button key={a.label} className={styles.qaTile} onClick={a.run}>
            <span className={`${styles.qaIcon} ${styles[a.cls]}`}>{a.icon}</span>
            <span className={styles.qaLabel}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const NeedHelp = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className={styles.needHelp}>
      <div className={styles.nhIcon} aria-hidden="true"><IconHeadset /></div>
      <h6 className={styles.nhTitle}>{t("side.needHelp")}</h6>
      <p className={styles.nhText}>{t("side.needHelpText")}</p>
      <button className={styles.nhBtn} onClick={() => navigate("/tickets")}>
        {t("side.contactSupport")}
        <IconArrowRight />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Stat card (reference layout: tinted icon square + label row, big
 * value, trend row with colored arrow + "vs. last week").
 * Trend COLOR is semantic like the reference — rising is GREEN for
 * good metrics (Total/Resolved) and RED for bad ones (Open/SLA),
 * falling is the inverse — so `inverted` cards flip the palette.
 * ------------------------------------------------------------------ */
const StatCard = ({ card, loading }) => {
  const { t } = useI18n();
  const good = card.trend
    ? card.inverted
      ? card.trend.dir === "down"
      : card.trend.dir === "up"
    : false;
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statIcon} style={{ background: card.tint, color: card.accent }}>
          {card.icon}
        </span>
        <span className={styles.statLabel}>{card.label}</span>
      </div>
      <div className={styles.statValue}>
        {loading ? <Skeleton width="2.4rem" /> : card.value}
      </div>
      <div className={styles.statTrend}>
        {card.trend && card.trend.dir !== "flat" && (
          <span className={`${styles.trendVal} ${good ? styles.trendGood : styles.trendBad}`}>
            {card.trend.dir === "up" ? <IconTrendUp /> : <IconTrendDown />}
            {Math.abs(card.trend.pct)}%
          </span>
        )}
        <span className={styles.statVs}>{t("dashboard.vsLastWeek")}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Reference dot palette — the recent-tickets ID dots are CATEGORY
 * coded (measured off the reference: software teal, hardware blue,
 * network magenta, access indigo), not status coded.
 * ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ *
 * Main dashboard — `variant="reports"` reuses the same analytics
 * layout under a Reports title (the reference sidebar's Reports item).
 * ------------------------------------------------------------------ */
function DashboardContent({ variant }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isReports = variant === "reports";
  usePageTitle(t(isReports ? "reports.title" : "dashboard.title"));

  const { data: statsData, loading: statsLoading } = useAsync(
    () => ticketService.getStats(),
    []
  );
  const { data: ticketsData, loading: ticketsLoading } = useAsync(
    () => ticketService.list({ limit: 5, sort: "createdAt", order: "desc" }),
    []
  );

  const stats = statsData?.data?.counts || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, breached: 0 };
  const chartData = statsData?.data?.chartData || [];
  const topEmployees = statsData?.data?.topEmployees || [];
  const byPriority = statsData?.data?.byPriority || {};
  const byCategory = statsData?.data?.byCategory || {};
  const recentTickets = ticketsData?.data?.tickets || [];

  const firstName = (user?.name || "").split(" ").filter(Boolean)[0] || "";

  const statCards = [
    {
      key: "total", label: t("dashboard.totalTickets"), value: stats.total,
      accent: "#316EF5", tint: "#E8EEFE", icon: <IconTicket />,
      trend: computeTrend(chartData, "total"),
    },
    {
      key: "open", label: t("dashboard.open"), value: stats.open,
      accent: "#EF4444", tint: "#FDEBEC", icon: <IconAlertCircle />,
      trend: computeTrend(chartData, "Open"), inverted: true,
    },
    {
      key: "inProgress", label: t("dashboard.inProgress"), value: stats.inProgress,
      accent: "#E58211", tint: "#FDF0E1", icon: <IconHourglass />,
      trend: computeTrend(chartData, "InProgress"), inverted: true,
    },
    {
      key: "resolved", label: t("dashboard.resolved"), value: stats.resolved,
      accent: "#10B981", tint: "#E3F6EE", icon: <IconCheckCircle />,
      trend: computeTrend(chartData, "Resolved"),
    },
    {
      key: "breached", label: t("dashboard.slaBreached"), value: stats.breached,
      accent: "#EF4444", tint: "#FDEBEC", icon: <IconWarning />,
      trend: null, inverted: true,
    },
  ];

  /* Category donut — reference palette (hardware blue, software red,
     network green, access amber, other light blue) + % side legend */
  const CATEGORY_COLORS = {
    hardware: "#3B82F6", software: "#EF4444", network: "#82D6B4",
    access: "#F59E0B", other: "#93C5FD",
  };
  const catTotal = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const donutData = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      key: k,
      name: t(`category.${k}`),
      value: v,
      pct: catTotal ? Math.round((v / catTotal) * 100) : 0,
      color: CATEGORY_COLORS[k] || "#93C5FD",
    }));

  /* Priority bars — vertical, per-priority colors from the reference */
  const PRIORITY_BAR = [
    { key: "low", color: "#10B981" },
    { key: "medium", color: "#F59E0B" },
    { key: "high", color: "#EF4444" },
    { key: "urgent", color: "#A855F7" },
  ];
  const priorityBarData = PRIORITY_BAR.map((p) => ({
    name: t(`status.${p.key}`),
    value: byPriority[p.key] || 0,
    color: p.color,
  }));

  /* Monthly trends — Created (all) / Resolved / In Progress lines,
     In Progress carries a soft area fill like the reference */
  const monthlyData = chartData.map((m) => ({
    month: m.month ? m.month[0] + m.month.slice(1).toLowerCase() : "",
    Created: (m.Open || 0) + (m.InProgress || 0) + (m.Resolved || 0) + (m.Closed || 0),
    Resolved: m.Resolved || 0,
    InProgress: m.InProgress || 0,
  }));

  const chartH = isMobile ? 180 : 190;

  /* Reference Y-axes: bars end at a 5-multiple (0–15 for a 12-max bar),
     the trends line chart ends at a 10-multiple (0–40) — measured. */
  const snap5 = (vals) => {
    const max = Math.max(0, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
    const top = Math.max(5, Math.ceil(max / 5) * 5);
    const ticks = [];
    for (let v = 0; v <= top; v += 5) ticks.push(v);
    return { top, ticks };
  };
  const snap10 = (vals) => {
    const max = Math.max(0, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
    const top = Math.max(10, Math.ceil(max / 10) * 10);
    const ticks = [];
    for (let v = 0; v <= top; v += 10) ticks.push(v);
    return { top, ticks };
  };
  const barY = snap5(priorityBarData.map((d) => d.value));
  const lineY = snap10(monthlyData.map((m) => Math.max(m.Created, m.Resolved, m.InProgress)));

  return (
    <section className={styles.wrap}>
      {/* ---------- Header (reference: title + welcome + description) ---------- */}
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t(isReports ? "reports.title" : "dashboard.title")}</h1>
        {!isReports && (
          <p className={styles.welcome}>
            {t("dashboard.welcome", { a: firstName })}
          </p>
        )}
        <p className={styles.description}>
          {t(isReports ? "reports.description" : "dashboard.description")}
        </p>
      </div>

      {/* First-run onboarding checklist (hidden once setup is complete) */}
      <OnboardingChecklist />

      <div className={styles.grid}>
        {/* ================= MAIN COLUMN ================= */}
        <div className={styles.mainCol}>
          {/* ---------- Stat cards row ---------- */}
          <div className={styles.statRow}>
            {statCards.map((card) => (
              <StatCard key={card.key} card={card} loading={statsLoading} />
            ))}
          </div>

          {/* ---------- Recent Tickets (table) + Top Performers ---------- */}
          <div className={styles.midRow}>
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

              {ticketsLoading ? (
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
                  <table className={styles.table}>
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
                          <td>
                            <span
                              className={styles.statusDot}
                              style={{ background: CATEGORY_DOTS[tk.category] || CHART_COLORS[tk.status] || "#999" }}
                              aria-hidden="true"
                            ></span>
                            <span className={styles.ticketId}>
                              #{tk.ticketNumber || tk._id.slice(-5)}
                            </span>
                          </td>
                          <td className={styles.subject}>{tk.subject || tk.product}</td>
                          <td>
                            <span className={`${styles.pill} ${styles[`prio-${tk.priority}`] || ""}`}>
                              {t(`status.${tk.priority}`)}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.pill} ${styles[`stat-${tk.status}`] || ""}`}>
                              {t(`status.${tk.status}`)}
                            </span>
                          </td>
                          <td className={styles.dateCell}>{formatDateTimeYear(tk.createdAt, lang)}</td>
                          <td className={styles.chevCell} aria-hidden="true">
                            <span className={styles.rowChev}><IconChevronRight /></span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

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
              {statsLoading ? (
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
          </div>

          {/* ---------- Charts row ---------- */}
          <div className={styles.chartRow}>
            {/* Tickets by Category — donut + side legend */}
            <div className={`${styles.card} ${styles.chartCard}`}>
              <div className={styles.cardHead}>
                <h6 className={styles.cardTitle}>
                  <span className={styles.titleIcon}><IconTicket /></span>
                  {t("dashboard.byCategory")}
                </h6>
              </div>
              {statsLoading ? (
                <Skeleton height="190px" />
              ) : donutData.length === 0 ? (
                <EmptyState icon="fa-solid fa-chart-pie" title={t("dashboard.noData")} />
              ) : (
                <div className={styles.donutWrap}>
                  <div className={styles.donutBox}>
                    <ResponsiveContainer width="100%" height={chartH}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          outerRadius={isMobile ? 66 : 78}
                          dataKey="value"
                          stroke="none"
                          isAnimationActive={false}
                          label={{
                            content: (props) => `${props.pct}%`,
                            fill: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                          labelLine={false}
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className={styles.donutLegend}>
                    {donutData.map((entry) => (
                      <li key={entry.key}>
                        <span className={styles.legendDot} style={{ background: entry.color }} aria-hidden="true"></span>
                        <span className={styles.legendName}>{entry.name}</span>
                        <span className={styles.legendPct}>{entry.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Tickets by Priority — vertical bars */}
            <div className={`${styles.card} ${styles.chartCard}`}>
              <div className={styles.cardHead}>
                <h6 className={styles.cardTitle}>
                  <span className={styles.titleIcon}><IconList /></span>
                  {t("dashboard.byPriority")}
                </h6>
              </div>
              {statsLoading ? (
                <Skeleton height="190px" />
              ) : priorityBarData.every((d) => d.value === 0) ? (
                <EmptyState icon="fa-solid fa-chart-simple" title={t("dashboard.noData")} />
              ) : (
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={priorityBarData} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAF4" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#8A93B2" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#8A93B2" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={30}
                      domain={[0, barY.top]}
                      ticks={barY.ticks}
                    />
                    <Tooltip cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        style={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
                      />
                      {priorityBarData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Monthly Ticket Trends — multi-line with area */}
            <div className={`${styles.card} ${styles.chartCard} ${styles.trendsCard}`}>
              <div className={styles.cardHead}>
                <h6 className={styles.cardTitle}>
                  <span className={styles.titleIcon}><IconBars /></span>
                  {t("dashboard.monthlyTrends")}
                </h6>
              </div>
              {statsLoading ? (
                <Skeleton height="190px" />
              ) : monthlyData.every((m) => !m.Created) ? (
                <EmptyState icon="fa-solid fa-chart-line" title={t("dashboard.noData")} />
              ) : (
                <>
                  <div className={styles.trendLegend} aria-hidden="true">
                    <span><i style={{ background: "#3B82F6" }}></i>{t("dashboard.legendCreated")}</span>
                    <span><i style={{ background: "#10B981" }}></i>{t("dashboard.resolved")}</span>
                    <span><i style={{ background: "#F59E0B" }}></i>{t("dashboard.inProgress")}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAF4" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: "#8A93B2" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        tickMargin={6}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#8A93B2" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={28}
                        domain={[0, lineY.top]}
                        ticks={lineY.ticks}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="InProgress"
                        stroke="none"
                        fill="#F59E0B"
                        fillOpacity={0.12}
                      />
                      <Line type="monotone" dataKey="Created" stroke="#3B82F6" strokeWidth={2.2} dot={false} />
                      <Line type="monotone" dataKey="Resolved" stroke="#10B981" strokeWidth={2.2} dot={false} />
                      <Line type="monotone" dataKey="InProgress" stroke="#F59E0B" strokeWidth={2.2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <aside className={styles.sideCol}>
          <ProfileCard />
          <QuickActions />
          <NeedHelp />
        </aside>
      </div>
    </section>
  );
}

export default DashboardContent;
