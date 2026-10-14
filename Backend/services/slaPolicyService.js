/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// SLA policy service — resolves the effective SLA policy per priority.
//
// Replaces the hardcoded { low: 72, medium: 48, high: 24, urgent: 4 } table.
// Policies live in the SLAPolicy collection (admin-editable at runtime) with
// an in-memory cache (60s TTL) so ticket creation doesn't pay a DB round-trip
// on every request. Falls back to the historical defaults when the collection
// is empty (fresh installs, tests that never seeded policies).
const SLAPolicy = require("../models/SLAPolicy");
const logger = require("../utils/logger");

// Historical defaults — match the previous hardcoded behaviour exactly so
// existing deployments see zero change until an admin tunes the policies.
const DEFAULT_POLICIES = [
  { priority: "low", hours: 72, businessHoursOnly: false, description: "Default (72 wall-clock hours)" },
  { priority: "medium", hours: 48, businessHoursOnly: false, description: "Default (48 wall-clock hours)" },
  { priority: "high", hours: 24, businessHoursOnly: false, description: "Default (24 wall-clock hours)" },
  { priority: "urgent", hours: 4, businessHoursOnly: false, description: "Default (4 wall-clock hours)" },
];

const CACHE_TTL_MS = 60 * 1000;

let cache = { policies: null, at: 0 };

const invalidateCache = () => {
  cache = { policies: null, at: 0 };
};

const getPolicies = async () => {
  if (cache.policies && Date.now() - cache.at < CACHE_TTL_MS) return cache.policies;
  let policies = [];
  try {
    policies = await SLAPolicy.find({}).lean();
  } catch (err) {
    // DB hiccup — fall back to defaults rather than failing ticket creation
    logger.error("SLAPolicy lookup failed, using defaults", { err: err.message });
  }
  if (!policies.length) policies = DEFAULT_POLICIES;
  cache = { policies, at: Date.now() };
  return policies;
};

// Seed the default policies once (called at server boot; safe to re-run).
const ensureDefaultPolicies = async () => {
  const existing = await SLAPolicy.countDocuments();
  if (existing > 0) return { seeded: false };
  await SLAPolicy.insertMany(DEFAULT_POLICIES, { ordered: false });
  invalidateCache();
  logger.info("Seeded default SLA policies", { count: DEFAULT_POLICIES.length });
  return { seeded: true, count: DEFAULT_POLICIES.length };
};

// ---------------------------------------------------------------------
// Business-hours arithmetic
// ---------------------------------------------------------------------
const workConfig = () => ({
  startHour: Number(process.env.WORK_DAY_START_HOUR ?? 9),
  endHour: Number(process.env.WORK_DAY_END_HOUR ?? 17),
  // 0=Sunday … 6=Saturday. Default Sun–Thu (Egypt/Middle-East work week).
  days: (process.env.WORK_DAYS || "0,1,2,3,4")
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => d >= 0 && d <= 6),
  // Minutes east of UTC (Cairo = 180). DST is intentionally NOT modeled —
  // configure the offset that matches most of the year.
  tzOffsetMinutes: Number(process.env.WORK_TZ_OFFSET_MINUTES ?? 180),
});

const MS_HOUR = 3600000;

// UTC start/end of the work window on `t`'s local day (or null if non-working day)
const workWindowFor = (t, cfg) => {
  const local = new Date(t.getTime() + cfg.tzOffsetMinutes * 60000);
  const weekday = local.getUTCDay();
  if (!cfg.days.includes(weekday)) return null;

  const localMidnightUtcMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate()
  );
  return {
    start: new Date(localMidnightUtcMs + cfg.startHour * MS_HOUR - cfg.tzOffsetMinutes * 60000),
    end: new Date(localMidnightUtcMs + cfg.endHour * MS_HOUR - cfg.tzOffsetMinutes * 60000),
  };
};

// Next possible instant after `t` where work can happen (midnight of next local day)
const nextDayStart = (t, cfg) => {
  const local = new Date(t.getTime() + cfg.tzOffsetMinutes * 60000);
  const nextMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1
  );
  return new Date(nextMidnight - cfg.tzOffsetMinutes * 60000);
};

/**
 * Add `hours` of working time to `from`, skipping nights + non-working days.
 * Guarded loop (max 5,000 iterations ≈ 13+ years of work days).
 */
const addBusinessHours = (from, hours, cfgOverride) => {
  const cfg = cfgOverride || workConfig();
  let t = new Date(from.getTime());
  let remaining = hours * MS_HOUR;
  let guard = 0;

  while (remaining > 0 && guard < 5000) {
    guard++;
    const window = workWindowFor(t, cfg);
    if (!window || window.end <= t) {
      t = nextDayStart(t, cfg);
      continue;
    }
    const start = t > window.start ? t : window.start;
    const available = window.end - start;
    if (remaining <= available) return new Date(start.getTime() + remaining);
    remaining -= available;
    t = nextDayStart(window.end, cfg);
  }
  return t;
};

// ---------------------------------------------------------------------
// Due-date computation
// ---------------------------------------------------------------------
/**
 * Compute the SLA due date for a priority.
 * @param {string} priority low|medium|high|urgent
 * @param {Date} fromDate defaults to now
 * @returns {Promise<Date>}
 */
const computeSlaDueDate = async (priority, fromDate = new Date()) => {
  const policies = await getPolicies();
  const policy =
    policies.find((p) => p.priority === priority) ||
    DEFAULT_POLICIES.find((p) => p.priority === priority) ||
    DEFAULT_POLICIES[1];

  if (policy.businessHoursOnly) {
    return addBusinessHours(fromDate, policy.hours);
  }
  return new Date(fromDate.getTime() + policy.hours * MS_HOUR);
};

module.exports = {
  DEFAULT_POLICIES,
  addBusinessHours,
  computeSlaDueDate,
  ensureDefaultPolicies,
  getPolicies,
  invalidateCache,
  workConfig,
};
