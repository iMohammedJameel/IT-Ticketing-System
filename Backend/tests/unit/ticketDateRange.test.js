/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ADD(QA-rec-4): unit tests for the createdAt date-range filter —
//   ticketQuerySchema (validation) and buildTicketQuery (filter mapping)
// plus buildExportFilter so the CSV export honors the SAME range semantics.
import { describe, it, expect } from "vitest";
import { ticketQuerySchema } from "../../controller/validation/TicketValidation";
import { buildTicketQuery } from "../../controller/ticket/ticketQuery";
const { buildExportFilter } = require("../../controller/bulk/exportController");

const STAFF_CTX = { user: "user1", userRole: "admin" };
const USER_CTX = { user: "user1", userRole: "user" };

describe("ticketQuerySchema — from/to date range", () => {
  it("accepts plain ISO dates and full timestamps", () => {
    const { error, value } = ticketQuerySchema.validate({
      from: "2026-10-01",
      to: "2026-10-31T23:59:59.000Z",
    });
    expect(error).toBeUndefined();
    expect(new Date(value.from).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(new Date(value.to).toISOString()).toBe("2026-10-31T23:59:59.000Z");
  });

  it("accepts either bound alone", () => {
    expect(ticketQuerySchema.validate({ from: "2026-10-01" }).error).toBeUndefined();
    expect(ticketQuerySchema.validate({ to: "2026-10-31" }).error).toBeUndefined();
  });

  it("rejects non-ISO garbage", () => {
    expect(ticketQuerySchema.validate({ from: "yesterday-ish" }).error).toBeDefined();
    expect(ticketQuerySchema.validate({ to: "31/10/2026" }).error).toBeDefined();
  });

  it("rejects a future from (nothing can be created in the future)", () => {
    const { error } = ticketQuerySchema.validate({ from: "2999-01-01" });
    expect(error).toBeDefined();
  });
});

describe("buildTicketQuery — createdAt range mapping", () => {
  it("maps from/to to an inclusive-exclusive createdAt window", () => {
    const { query } = buildTicketQuery(
      { from: "2026-10-01", to: "2026-11-01" },
      STAFF_CTX
    );
    expect(query.createdAt).toEqual({
      $gte: new Date("2026-10-01"),
      $lt: new Date("2026-11-01"),
    });
  });

  it("maps a lone from to $gte only", () => {
    const { query } = buildTicketQuery({ from: "2026-10-01" }, STAFF_CTX);
    expect(query.createdAt).toEqual({ $gte: new Date("2026-10-01") });
  });

  it("maps a lone to to $lt only", () => {
    const { query } = buildTicketQuery({ to: "2026-11-01" }, STAFF_CTX);
    expect(query.createdAt).toEqual({ $lt: new Date("2026-11-01") });
  });

  it("narrows WITHIN the regular user's own-ticket scope (no widening)", () => {
    const { query } = buildTicketQuery(
      { from: "2026-10-01", to: "2026-11-01" },
      USER_CTX
    );
    // scope preserved AND range applied — a user cannot see others' tickets
    // by fiddling with dates.
    expect(query.user).toBe("user1");
    expect(query.createdAt).toEqual({
      $gte: new Date("2026-10-01"),
      $lt: new Date("2026-11-01"),
    });
  });

  it("leaves the query untouched when no range is supplied", () => {
    const { query } = buildTicketQuery({}, STAFF_CTX);
    expect(query.createdAt).toBeUndefined();
  });
});

describe("buildExportFilter — CSV honors the same range semantics", () => {
  it("maps from/to identically to the list endpoint", () => {
    const filter = buildExportFilter({ from: "2026-10-01", to: "2026-11-01" });
    expect(filter.createdAt).toEqual({
      $gte: new Date("2026-10-01"),
      $lt: new Date("2026-11-01"),
    });
  });

  it("supports a lone from bound", () => {
    const filter = buildExportFilter({ from: "2026-10-01" });
    expect(filter.createdAt).toEqual({ $gte: new Date("2026-10-01") });
  });

  it("ignores empty strings (axios drops undefined params)", () => {
    const filter = buildExportFilter({ from: "", to: "" });
    expect(filter.createdAt).toBeUndefined();
  });
});
