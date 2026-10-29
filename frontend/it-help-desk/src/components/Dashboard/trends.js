/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Trend math for the dashboard stat cards — month-over-month delta
// computed from the monthly chart data. (Kept out of StatCard.jsx so that
// file exports only components, per react-refresh/only-export-components.)

const monthTotal = (m) =>
  m ? (m.Open || 0) + (m.InProgress || 0) + (m.Resolved || 0) + (m.Closed || 0) : 0;

export const computeTrend = (chartData, key) => {
  if (!chartData || chartData.length < 2) return null;
  const last = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const lastVal = key === "total" ? monthTotal(last) : last?.[key] || 0;
  const prevVal = key === "total" ? monthTotal(prev) : prev?.[key] || 0;
  if (prevVal === 0) return null;
  const pct = Math.round(((lastVal - prevVal) / prevVal) * 100);
  return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
};
