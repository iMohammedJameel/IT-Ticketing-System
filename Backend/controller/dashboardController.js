/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dashboard controller — extracted from ticketController (was a 147-line
// handler mixing 7 aggregation pipelines with response shaping, pushing
// that file past 730 lines). Owns GET /tickets/stats: counts, monthly
// chart data, top performers, FRT/resolution/SLA/CSAT service metrics.
const Ticket = require("../models/Ticket");
const { TICKET_PRIORITIES } = require("./validation/TicketValidation");

const MONTH_NAMES = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

const getDashboardStats = async (req, res, next) => {
  try {
    const yearStart = new Date(`${new Date().getFullYear()}-01-01`);
    const yearEnd = new Date(`${new Date().getFullYear() + 1}-01-01`);

    const [counts, chartAgg, topEmployees, priorityAgg, categoryAgg, responseAgg, csatAgg] = await Promise.all([
      Ticket.aggregate([
        { $facet: {
          total: [{ $count: "n" }],
          open: [{ $match: { status: "open" } }, { $count: "n" }],
          inProgress: [{ $match: { status: "in-progress" } }, { $count: "n" }],
          resolved: [{ $match: { status: "resolved" } }, { $count: "n" }],
          closed: [{ $match: { status: "closed" } }, { $count: "n" }],
          breached: [{ $match: { slaBreached: true } }, { $count: "n" }],
        }},
      ]),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: yearStart, $lt: yearEnd } } },
        { $group: {
          _id: { month: { $month: "$createdAt" }, status: "$status" },
          count: { $sum: 1 },
        }},
        { $group: {
          _id: "$_id.month",
          statuses: { $push: { status: "$_id.status", count: "$count" } },
        }},
        { $sort: { _id: 1 } },
      ]),
      Ticket.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { _id: 0, id: "$user._id", name: "$user.name", email: "$user.email", count: 1, resolved: 1 } },
      ]),
      Ticket.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      // FRT + resolution time + SLA compliance, in one pass
      Ticket.aggregate([
        { $facet: {
          frt: [
            { $match: { firstResponseAt: { $ne: null } } },
            { $group: { _id: null, avgMinutes: { $avg: { $divide: [{ $subtract: ["$firstResponseAt", "$createdAt"] }, 60000] } }, count: { $sum: 1 } } },
          ],
          resolution: [
            { $match: { endDate: { $ne: null } } },
            { $group: { _id: null, avgMinutes: { $avg: { $divide: [{ $subtract: ["$endDate", "$createdAt"] }, 60000] } }, count: { $sum: 1 } } },
          ],
          sla: [
            { $match: { endDate: { $ne: null } } },
            { $group: {
              _id: null,
              completed: { $sum: 1 },
              withinSla: { $sum: { $cond: [{ $eq: ["$slaBreached", false] }, 1, 0] } },
            } },
          ],
        }},
      ]),
      // CSAT average + response count
      Ticket.aggregate([
        { $match: { "csat.rating": { $ne: null } } },
        { $group: {
          _id: null,
          avgRating: { $avg: "$csat.rating" },
          count: { $sum: 1 },
          promoters: { $sum: { $cond: [{ $gte: ["$csat.rating", 4] }, 1, 0] } },
          detractors: { $sum: { $cond: [{ $lte: ["$csat.rating", 2] }, 1, 0] } },
        }},
      ]),
    ]);

    const chartData = MONTH_NAMES.map((m, i) => {
      const found = chartAgg.find((c) => c._id === i + 1) || { statuses: [] };
      const statuses = found.statuses.reduce((acc, s) => {
        acc[s.status] = s.count;
        return acc;
      }, {});
      return {
        month: m,
        Open: statuses["open"] || 0,
        InProgress: statuses["in-progress"] || 0,
        Resolved: statuses["resolved"] || 0,
        Closed: statuses["closed"] || 0,
      };
    });

    const priorityMap = Object.fromEntries(TICKET_PRIORITIES.map((p) => [p, 0]));
    priorityAgg.forEach((p) => { priorityMap[p._id] = p.count; });

    const categoryMap = {};
    categoryAgg.forEach((c) => { categoryMap[c._id] = c.count; });

    const c = counts[0];
    const r = responseAgg[0] || {};
    const csat = csatAgg[0] || {};
    const sla = (r.sla && r.sla[0]) || { completed: 0, withinSla: 0 };

    res.status(200).json({
      success: true,
      data: {
        counts: {
          total: c.total[0]?.n || 0,
          open: c.open[0]?.n || 0,
          inProgress: c.inProgress[0]?.n || 0,
          resolved: c.resolved[0]?.n || 0,
          closed: c.closed[0]?.n || 0,
          breached: c.breached[0]?.n || 0,
        },
        chartData,
        topEmployees,
        byPriority: priorityMap,
        byCategory: categoryMap,
        // New service metrics
        metrics: {
          firstResponse: {
            avgMinutes: Math.round(r.frt?.[0]?.avgMinutes ?? -1),
            responded: r.frt?.[0]?.count || 0,
          },
          resolution: {
            avgMinutes: Math.round(r.resolution?.[0]?.avgMinutes ?? -1),
            resolved: r.resolution?.[0]?.count || 0,
          },
          slaCompliance: {
            withinSla: sla.withinSla,
            completed: sla.completed,
            percent: sla.completed ? Math.round((sla.withinSla / sla.completed) * 100) : null,
          },
          csat: {
            avgRating: csat.avgRating ? Math.round(csat.avgRating * 10) / 10 : null,
            responses: csat.count || 0,
            promoters: csat.promoters || 0,
            detractors: csat.detractors || 0,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats };
