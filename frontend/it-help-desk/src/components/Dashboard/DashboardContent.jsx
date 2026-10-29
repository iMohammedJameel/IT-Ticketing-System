/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard content — ORCHESTRATOR ONLY. The heavy visual blocks live in
// their own modules (was a single 862-line file):
//   icons.jsx             — inline stroke SVG set
//   StatCard.jsx          — stat cards + month-over-month trend math
//   OnboardingChecklist   — dismissible first-run setup checklist
//   DashboardTables.jsx   — Recent Tickets table + Top Performers
//   DashboardCharts.jsx   — category donut / priority bars / monthly trends
//   RightPanel.jsx        — profile menu, quick actions, need help
// `variant="reports"` reuses the same analytics layout under a Reports title.
import { useAsync, useIsMobile, usePageTitle } from "../../hooks";
import { ticketService } from "../../services/ticketService";
import { useI18n } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import styles from "./DashboardContent.module.css";
import OnboardingChecklist from "./OnboardingChecklist";
import RightPanel from "./RightPanel";
import StatCard from "./StatCard";
import { computeTrend } from "./trends";
import { RecentTickets, TopPerformers } from "./DashboardTables";
import { CategoryDonut, PriorityBars, MonthlyTrends } from "./DashboardCharts";
import {
  IconTicket, IconAlertCircle, IconHourglass, IconCheckCircle, IconWarning,
} from "./icons";

function DashboardContent({ variant }) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
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

  const chartH = isMobile ? 180 : 190;

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
            <RecentTickets recentTickets={recentTickets} loading={ticketsLoading} />
            <TopPerformers topEmployees={topEmployees} loading={statsLoading} />
          </div>

          {/* ---------- Charts row ---------- */}
          <div className={styles.chartRow}>
            <CategoryDonut byCategory={byCategory} loading={statsLoading} isMobile={isMobile} chartH={chartH} />
            <PriorityBars byPriority={byPriority} loading={statsLoading} chartH={chartH} />
            <MonthlyTrends chartData={chartData} loading={statsLoading} chartH={chartH} />
          </div>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <RightPanel />
      </div>
    </section>
  );
}

export default DashboardContent;
