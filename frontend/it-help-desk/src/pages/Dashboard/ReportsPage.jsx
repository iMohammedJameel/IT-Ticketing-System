/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Reports page — the reference sidebar's 7th item ("Reports"). Reuses the
// dashboard's analytics layout (stat cards, recent tickets, top performers,
// charts) under a Reports header: a printable/exportable report view of the
// same data instead of a separate half-empty page.
import DashboardContent from "../../components/Dashboard/DashboardContent";

function ReportsPage() {
  return <DashboardContent variant="reports" />;
}

export default ReportsPage;
