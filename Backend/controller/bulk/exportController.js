/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Read-only reporting handlers — CSV export + activity feed.
// Split out of bulkController.js: these are data-out endpoints, distinct
// from the bulk mutation operations in bulkOpsController.js.
const Ticket = require("../../models/Ticket");
const { buildCsv } = require("../../utils/csv");
const { isStaff } = require("../../utils/roles");

const CSV_ROW_CAP = 1000;
const ACTIVITY_FEED_MAX = 100;

// Query-string filters shared by the export endpoint (same keys the list
// view uses, so staff can export exactly what they are looking at).
// ADD(QA-rec-4): from/to date range on createdAt, same semantics as the
// list endpoint (from inclusive, to exclusive — the client sends to = day+1).
const buildExportFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (query.company) filter.company = query.company;
  if (query.companyId) filter.companyId = query.companyId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lt = new Date(query.to);
  }
  return filter;
};

// ---------------------------------------------------------------------
// CSV export — returns CSV text for tickets matching filter.
// SECURITY: every cell passes through utils/csv escapeCsv, which neutralizes
// CSV FORMULA INJECTION (leading =, +, -, @, TAB, CR) — see utils/csv.js.
// Caps at 1000 rows.
// ---------------------------------------------------------------------
const exportCsv = async (req, res, next) => {
  try {
    const filter = buildExportFilter(req.query);

    const tickets = await Ticket.find(filter)
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .limit(CSV_ROW_CAP);

    const headers = [
      "TicketNumber", "Status", "Priority", "Category", "Product", "Company",
      "Employee", "RequesterEmail", "AssignedTo", "CreatedAt", "ResolvedAt", "SLABreached", "CSAT",
    ];
    const rows = tickets.map((t) => [
      t.ticketNumber,
      t.status,
      t.priority,
      t.category,
      t.product,
      t.company,
      t.employee,
      t.user?.email || "",
      t.assignedTo?.email || "",
      t.createdAt?.toISOString() || "",
      t.endDate?.toISOString() || "",
      t.slaBreached ? "yes" : "no",
      t.csat?.rating ?? "",
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tickets-${Date.now()}.csv"`);
    res.status(200).send(buildCsv(headers, rows));
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------
// Activity feed — recent activity across the system (admin) or per-user.
// ---------------------------------------------------------------------
const getActivityFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), ACTIVITY_FEED_MAX);
    const filter = isStaff(req.userRole) ? {} : { user: req.user };
    const tickets = await Ticket.find(filter)
      .populate("user", "name email profileImage")
      .populate("assignedTo", "name email")
      .populate("history.by", "name email")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("ticketNumber product status history user assignedTo updatedAt");

    const activities = [];
    tickets.forEach((t) => {
      (t.history || []).slice(-5).forEach((h) => {
        activities.push({
          ticketId: t._id,
          ticketNumber: t.ticketNumber,
          product: t.product,
          status: t.status,
          action: h.action,
          field: h.field,
          oldValue: h.oldValue,
          newValue: h.newValue,
          note: h.note,
          by: h.by,
          at: h.createdAt,
        });
      });
    });

    activities.sort((a, b) => new Date(b.at) - new Date(a.at));
    res.status(200).json({ success: true, data: { activities: activities.slice(0, limit) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { exportCsv, getActivityFeed, buildExportFilter };
