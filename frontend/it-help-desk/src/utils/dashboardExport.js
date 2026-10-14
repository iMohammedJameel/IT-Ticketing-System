/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard CSV report export — moved out of the dashboard page so the
// command palette ("Export dashboard report") can trigger it too. Numbers
// only, but every cell is CSV-escaped (=+-@ formula-injection guard).
import { ticketService } from "../services/ticketService";
import { tPlain } from "../i18n/plain";
import { toast } from "sonner";

export async function exportDashboardReport() {
  try {
    const res = await ticketService.getStats();
    const d = res?.data?.data || {};
    const stats = d.counts || {};
    const byPriority = d.byPriority || {};
    const byCategory = d.byCategory || {};
    const chartData = d.chartData || [];

    const esc = (v) => {
      const s = String(v ?? "");
      return /^[=+\-@]/.test(s) ? `'${s}` : s;
    };
    const rows = [
      ["Section", "Metric", "Value"],
      ...Object.entries({
        [tPlain("dashboard.totalTickets")]: stats.total,
        [tPlain("dashboard.open")]: stats.open,
        [tPlain("dashboard.inProgress")]: stats.inProgress,
        [tPlain("dashboard.resolved")]: stats.resolved,
        [tPlain("dashboard.closed")]: stats.closed,
        [tPlain("dashboard.slaBreached")]: stats.breached,
      }).map(([k, v]) => [tPlain("dashboard.title"), esc(k), v]),
      ...Object.entries(byPriority).map(([k, v]) => [tPlain("dashboard.byPriority"), esc(k), v]),
      ...Object.entries(byCategory).map(([k, v]) => [tPlain("dashboard.byCategory"), esc(k), v]),
      ...chartData.map((m) => [
        tPlain("dashboard.monthlyTrends"),
        m.month,
        (m.Open || 0) + (m.InProgress || 0) + (m.Resolved || 0) + (m.Closed || 0),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(tPlain("tickets.csvExported"));
  } catch {
    toast.error(tPlain("errors.network") || "Export failed");
  }
}
