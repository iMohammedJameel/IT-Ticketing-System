// Dashboard content — uses ticketService.getStats() + ticketService.list() (not raw api),
// new schema fields (ticketNumber, createdAt, category, priority), useAsync hook,
// useIsMobile hook (no manual resize listener), Skeleton loaders, sonner toasts,
// removed client-side aggregation (uses backend aggregations instead).
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { ticketService } from "../../services/ticketService";
import { useAsync, useIsMobile } from "../../hooks";
import { Skeleton, SkeletonCard } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import styles from "./DashboardContent.module.css";

const STATUS_COLORS = {
  open: "#ef4444",
  "in-progress": "#f97316",
  resolved: "#22c55e",
  closed: "#9ca3af",
};

const PRIORITY_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

const CATEGORY_LABELS = {
  hardware: "Hardware",
  software: "Software",
  network: "Network",
  access: "Access",
  other: "Other",
};

function DashboardContent() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch stats + recent tickets via useAsync hook (no manual mount guards)
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

  const statCards = [
    { label: "Total Tickets", value: stats.total, color: "#4A4E8C", icon: "fa-ticket" },
    { label: "Open", value: stats.open, color: "#ef4444", icon: "fa-circle-exclamation" },
    { label: "In Progress", value: stats.inProgress, color: "#f97316", icon: "fa-spinner" },
    { label: "Resolved", value: stats.resolved, color: "#22c55e", icon: "fa-circle-check" },
    { label: "SLA Breached", value: stats.breached, color: "#dc2626", icon: "fa-triangle-exclamation" },
  ];

  // Build pie chart data for status breakdown
  const statusPieData = [
    { name: "Open", value: stats.open, color: STATUS_COLORS.open },
    { name: "In Progress", value: stats.inProgress, color: STATUS_COLORS["in-progress"] },
    { name: "Resolved", value: stats.resolved, color: STATUS_COLORS.resolved },
    { name: "Closed", value: stats.closed, color: STATUS_COLORS.closed },
  ].filter((d) => d.value > 0);

  // Build bar chart data for priority breakdown
  const priorityBarData = Object.entries(byPriority).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: PRIORITY_COLORS[key],
  }));

  // Build bar chart data for category breakdown
  const categoryBarData = Object.entries(byCategory).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
  }));

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Stats cards */}
        <div className="row mb-4">
          {statCards.map((card, i) => (
            <div className="col-6 col-lg mb-3" key={card.label}>
              <div
                className={styles.card}
                style={{ borderTop: `4px solid ${card.color}` }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.78rem" }}>{card.label}</div>
                    <div className="fw-bold" style={{ fontSize: "1.75rem", color: "var(--text-dark)" }}>
                      {statsLoading ? <Skeleton width="2rem" /> : card.value}
                    </div>
                  </div>
                  <i
                    className={`fa-solid ${card.icon}`}
                    style={{ color: card.color, opacity: 0.7, fontSize: "1.75rem" }}
                    aria-hidden="true"
                  ></i>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row align-items-stretch">
          {/* Recent Tickets */}
          <div className="col-12 col-lg-6 mb-4">
            <div className={`${styles.card} ${styles.lastTicketsCard}`}>
              <h6 className={styles.cardTitle}>
                <i className="fa-solid fa-ticket" aria-hidden="true"></i> Recent Tickets
              </h6>
              {ticketsLoading ? (
                <div className="d-flex flex-column gap-2">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : recentTickets.length === 0 ? (
                <EmptyState
                  icon="🎫"
                  title="No tickets yet"
                  description="New tickets will appear here once created."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets")}>
                      Create Ticket
                    </button>
                  }
                />
              ) : (
                <div className={styles.ticketList}>
                  {recentTickets.map((t) => (
                    <div
                      key={t._id}
                      className={styles.ticketItem}
                      onClick={() => navigate(`/ticketslist?id=${t._id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") navigate(`/ticketslist?id=${t._id}`); }}
                    >
                      <div className={styles.ticketTop}>
                        <span
                          className={styles.statusBadge}
                          style={{ background: STATUS_COLORS[t.status] || "#999" }}
                        >
                          {t.status}
                        </span>
                        <span className={styles.ticketId}>{t.ticketNumber || `#${t._id.slice(-5)}`}</span>
                      </div>
                      <div className={styles.ticketBody}>
                        <div className={styles.avatar}>
                          <i className="fa-solid fa-user" aria-hidden="true"></i>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className={styles.ticketName}>{t.user?.name || t.employee}</div>
                          <div className={styles.ticketDesc}>{t.product} — {t.description.slice(0, 80)}</div>
                        </div>
                      </div>
                      <div className={styles.ticketDate}>
                        <i className="fa-regular fa-calendar me-1" aria-hidden="true"></i>
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                className={`${styles.showAllBtn} btn btn-primary w-100 mt-3`}
                onClick={() => navigate("/ticketslist")}
              >
                Show All Tickets
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="col-12 col-lg-6">
            {/* Top employees */}
            <div className="mb-4">
              <div className={styles.card}>
                <h6 className={styles.cardTitle}>
                  <i className="fa-solid fa-trophy" aria-hidden="true"></i> Top Performers
                </h6>
                {statsLoading ? (
                  <div className="d-flex flex-column gap-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2rem" />)}
                  </div>
                ) : topEmployees.length === 0 ? (
                  <EmptyState icon="🏆" title="No data" description="Assigned tickets will show here." />
                ) : (
                  topEmployees.map((e, i) => (
                    <div key={e.id || i} className={styles.listRow}>
                      <div className={styles.rankBadge}>{i + 1}</div>
                      <div className={styles.avatar}>
                        <i className="fa-solid fa-user" aria-hidden="true"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className={styles.listName}>{e.name}</div>
                        <small className="text-muted">{e.email}</small>
                      </div>
                      <div className="text-end">
                        <div className={styles.listCount}>{e.count}</div>
                        <small className="text-muted">{e.resolved} resolved</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Monthly chart */}
            <div className="mb-4">
              <div className={styles.card}>
                <h6 className={styles.cardTitle}>Monthly Ticket Trends</h6>
                {statsLoading ? (
                  <Skeleton height="200px" />
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                    <BarChart data={chartData} barSize={isMobile ? 12 : 18}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="Open" stackId="a" fill={STATUS_COLORS.open} />
                      <Bar dataKey="InProgress" stackId="a" fill={STATUS_COLORS["in-progress"]} />
                      <Bar dataKey="Resolved" stackId="a" fill={STATUS_COLORS.resolved} />
                      <Bar dataKey="Closed" stackId="a" fill={STATUS_COLORS.closed} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Status pie + priority bar */}
            <div className="row">
              <div className="col-12 col-md-6 mb-4">
                <div className={styles.card}>
                  <h6 className={styles.cardTitle}>By Status</h6>
                  {statsLoading ? (
                    <Skeleton height="180px" />
                  ) : statusPieData.length === 0 ? (
                    <EmptyState icon="📊" title="No data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={isMobile ? 50 : 70}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-6 mb-4">
                <div className={styles.card}>
                  <h6 className={styles.cardTitle}>By Priority</h6>
                  {statsLoading ? (
                    <Skeleton height="180px" />
                  ) : priorityBarData.length === 0 ? (
                    <EmptyState icon="📊" title="No data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                      <BarChart data={priorityBarData} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {priorityBarData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div>
              <div className={styles.card}>
                <h6 className={styles.cardTitle}>By Category</h6>
                {statsLoading ? (
                  <Skeleton height="180px" />
                ) : categoryBarData.length === 0 ? (
                  <EmptyState icon="📊" title="No data" />
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                    <BarChart data={categoryBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#4A4E8C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardContent;
