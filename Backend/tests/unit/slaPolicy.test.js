/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Unit tests for the SLA policy service — business-hours arithmetic and the
// configurable-policy fallback behaviour (defaults when collection is empty).
import { describe, it, expect } from "vitest";
import { addBusinessHours, computeSlaDueDate, DEFAULT_POLICIES } from "../../services/slaPolicyService";

// Deterministic test config — UTC, Mon-Fri, 09:00-17:00
const CFG = {
  startHour: 9,
  endHour: 17,
  days: [1, 2, 3, 4, 5],
  tzOffsetMinutes: 0,
};

const utc = (s) => new Date(`${s}Z`);

describe("slaPolicyService.addBusinessHours", () => {
  it("adds hours inside the same work window", () => {
    // Monday 2026-03-02 10:00 UTC + 3h → same day 13:00
    const res = addBusinessHours(utc("2026-03-02T10:00:00"), 3, CFG);
    expect(res.toISOString()).toBe("2026-03-02T13:00:00.000Z");
  });

  it("rolls over to the next workday when the window is exceeded", () => {
    // Monday 15:00 + 4h → only 2h left that day, remaining 2h on Tuesday 09:00-11:00
    const res = addBusinessHours(utc("2026-03-02T15:00:00"), 4, CFG);
    expect(res.toISOString()).toBe("2026-03-03T11:00:00.000Z");
  });

  it("skips the weekend entirely", () => {
    // Friday 2026-03-06 16:00 + 3h → 1h Friday + 2h Monday 09:00-11:00
    const res = addBusinessHours(utc("2026-03-06T16:00:00"), 3, CFG);
    expect(res.toISOString()).toBe("2026-03-09T11:00:00.000Z");
  });

  it("starts counting from the window start when `from` is before it", () => {
    // Monday 07:00 + 2h → Monday 09:00-11:00
    const res = addBusinessHours(utc("2026-03-02T07:00:00"), 2, CFG);
    expect(res.toISOString()).toBe("2026-03-02T11:00:00.000Z");
  });

  it("moves to the next morning when `from` is after the window", () => {
    // Monday 20:00 + 1h → Tuesday 09:00-10:00
    const res = addBusinessHours(utc("2026-03-02T20:00:00"), 1, CFG);
    expect(res.toISOString()).toBe("2026-03-03T10:00:00.000Z");
  });

  it("handles a non-working `from` day (Saturday)", () => {
    // Saturday + 1h → Monday 09:00-10:00
    const res = addBusinessHours(utc("2026-03-07T12:00:00"), 1, CFG);
    expect(res.toISOString()).toBe("2026-03-09T10:00:00.000Z");
  });

  it("respects a timezone offset (Cairo UTC+3)", () => {
    const cairo = { ...CFG, tzOffsetMinutes: 180 };
    // 2026-03-02 06:00 UTC = 09:00 Cairo (window start) + 2h → 08:00 UTC
    const res = addBusinessHours(utc("2026-03-02T06:00:00"), 2, cairo);
    expect(res.toISOString()).toBe("2026-03-02T08:00:00.000Z");
  });
});

describe("slaPolicyService defaults", () => {
  it("keeps the historical 72/48/24/4h table as fallback", () => {
    const map = Object.fromEntries(DEFAULT_POLICIES.map((p) => [p.priority, p.hours]));
    expect(map).toEqual({ low: 72, medium: 48, high: 24, urgent: 4 });
  });

  it("falls back to defaults when the collection is unreachable (test DB)", async () => {
    // No SLAPolicy docs seeded here — computeSlaDueDate must still resolve
    const due = await computeSlaDueDate("urgent");
    const diffHours = (due - Date.now()) / 3600000;
    expect(diffHours).toBeGreaterThan(3.9);
    expect(diffHours).toBeLessThan(4.1);
  });
});
