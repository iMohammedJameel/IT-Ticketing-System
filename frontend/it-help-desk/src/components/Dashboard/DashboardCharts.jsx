/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard charts row — category donut with side legend, priority bars,
// monthly multi-line trends (In Progress carries a soft area fill).
// Y-axes snap to 5/10 multiples like the reference design.
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Area, CartesianGrid, LabelList,
} from "recharts";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { useI18n } from "../../i18n";
import { useTheme } from "../../context/ThemeContext";
import styles from "./DashboardContent.module.css";
import { IconTicket, IconList, IconBars } from "./icons";

/* QA-uiux (WCAG 1.4.3 + theme polish): recharts SVG fills can't consume CSS
   vars, so tick/label/grid colors are computed from the resolved theme.
   Old #8A93B2 ticks were 3.1:1 on white cards; new shades pass in both
   themes (light 5.0:1 / dark 6.1:1). Grid lines are decorative but now
   match each theme's surface too. */
const useChartColors = () => {
  const { theme } = useTheme();
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  return {
    tickFill: dark ? "#9aa2c2" : "#5D6485",
    labelFill: dark ? "#b8bed8" : "#4F5D75",
    gridStroke: dark ? "rgba(255,255,255,0.08)" : "#E8EAF4",
  };
};

/* Category donut — reference palette (hardware blue, software red,
   network green, access amber, other light blue) + % side legend */
const CATEGORY_COLORS = {
  hardware: "#3B82F6", software: "#EF4444", network: "#82D6B4",
  access: "#F59E0B", other: "#93C5FD",
};

/* Priority bars — vertical, per-priority colors from the reference */
const PRIORITY_BAR = [
  { key: "low", color: "#10B981" },
  { key: "medium", color: "#F59E0B" },
  { key: "high", color: "#EF4444" },
  { key: "urgent", color: "#A855F7" },
];

/* Reference Y-axes: bars end at a 5-multiple (0–15 for a 12-max bar),
   the trends line chart ends at a 10-multiple (0–40) — measured. */
const snapTo = (step) => (vals) => {
  const max = Math.max(0, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
};
const snap5 = snapTo(5);
const snap10 = snapTo(10);

export const CategoryDonut = ({ byCategory, loading, isMobile, chartH }) => {
  const { t } = useI18n();

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

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <div className={styles.cardHead}>
        <h6 className={styles.cardTitle}>
          <span className={styles.titleIcon}><IconTicket /></span>
          {t("dashboard.byCategory")}
        </h6>
      </div>
      {loading ? (
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
                  /* QA-uiux (WCAG 1.4.3): on-segment white % labels measured
                     1.7–3.8:1 on the pastel palette AND duplicated the side
                     legend — removed for a cleaner chart; the legend's
                     legendPct carries the same numbers at compliant contrast. */
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
  );
};

export const PriorityBars = ({ byPriority, loading, chartH }) => {
  const { t } = useI18n();
  const { tickFill, labelFill, gridStroke } = useChartColors();

  const priorityBarData = PRIORITY_BAR.map((p) => ({
    name: t(`priority.${p.key}`),
    value: byPriority[p.key] || 0,
    color: p.color,
  }));
  const barY = snap5(priorityBarData.map((d) => d.value));

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <div className={styles.cardHead}>
        <h6 className={styles.cardTitle}>
          <span className={styles.titleIcon}><IconList /></span>
          {t("dashboard.byPriority")}
        </h6>
      </div>
      {loading ? (
        <Skeleton height="190px" />
      ) : priorityBarData.every((d) => d.value === 0) ? (
        <EmptyState icon="fa-solid fa-chart-simple" title={t("dashboard.noData")} />
      ) : (
        <ResponsiveContainer width="100%" height={chartH}>
          {/* QA-deep: top margin keeps the value LabelList from clipping
              against the container edge; bottom margin gives X tick labels
              breathing room (they were touching the card bottom). */}
          <BarChart data={priorityBarData} barSize={26} margin={{ top: 18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: tickFill }}
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
                /* QA-uiux (WCAG 1.4.3): recharts clones per-Cell labels that
                   inherit the CELL fill (2.1–3.8:1 on white) — the `fill` PROP
                   (not just style) forces the theme-aware ink on every label. */
                fill={labelFill}
                style={{ fontSize: 11, fontWeight: 600 }}
              />
              {priorityBarData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export const MonthlyTrends = ({ chartData, loading, chartH }) => {
  const { t, lang } = useI18n();
  const { tickFill, gridStroke } = useChartColors();

  /* Localized month labels — the backend sends fixed English "JAN..DEC".
     QA-visual finding: the Arabic dashboard showed English months; resolve
     them by INDEX here so both languages render native month names while
     the API contract stays untouched. */
  const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  /* Monthly trends — Created (all) / Resolved / In Progress lines.
     RTL (QA-visual finding): recharts always lays the X axis left→right,
     so in the Arabic UI time appeared to flow backwards. Reversing the
     array for Arabic puts the OLDEST month on the RIGHT and the NEWEST
     on the LEFT — the natural reading direction for an RTL audience. */
  const monthlyData = chartData.map((m, i) => ({
    month: lang === "ar"
      ? MONTHS_AR[i]
      : m.month
        ? m.month[0] + m.month.slice(1).toLowerCase()
        : "",
    Created: (m.Open || 0) + (m.InProgress || 0) + (m.Resolved || 0) + (m.Closed || 0),
    Resolved: m.Resolved || 0,
    InProgress: m.InProgress || 0,
  }));
  const rtlOrderedData = lang === "ar" ? [...monthlyData].reverse() : monthlyData;
  const lineY = snap10(monthlyData.map((m) => Math.max(m.Created, m.Resolved, m.InProgress)));

  return (
    <div className={`${styles.card} ${styles.chartCard} ${styles.trendsCard}`}>
      <div className={styles.cardHead}>
        <h6 className={styles.cardTitle}>
          <span className={styles.titleIcon}><IconBars /></span>
          {t("dashboard.monthlyTrends")}
        </h6>
      </div>
      {loading ? (
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
            {/* QA-uiux: left margin 6px — the first (RTL: last) month label
                was crowding the Y-axis "0" tick by 6x5px at the corner. */}
            <ComposedChart data={rtlOrderedData} margin={{ top: 4, right: 8, bottom: 8, left: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                tickMargin={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: tickFill }}
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
  );
};
