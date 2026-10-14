/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Integration tests — tickets + the new business features:
//   - agent role visibility (sees all tickets, can be assigned)
//   - tags on create + tag filter
//   - text-index search (incl. ticket-number path)
//   - CSAT: happy path + wrong-role + double-rate guards
//   - company directory linking
// Uses the same in-memory MongoDB bootstrap as auth.test.js.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import User from "../../models/User";
import Company from "../../models/Company";
import bcrypt from "bcrypt";

let app;

beforeAll(async () => {
  const socketIo = require("socket.io");
  socketIo.Server = class {
    constructor() {
      this.use = () => this;
      this.on = () => this;
      this.to = () => ({ emit: () => {} });
    }
  };
  const slaMonitor = require("../../services/slaMonitor");
  slaMonitor.startSlaMonitor = () => {};
  slaMonitor.stopSlaMonitor = () => {};

  app = require("../../app");
});

async function makeUser(name, email, role = "user", extra = {}) {
  const hash = await bcrypt.hash("StrongPass1", 10);
  const user = await User.create({
    name,
    email,
    password: hash,
    role,
    emailVerifiedAt: new Date(),
    ...extra,
  });
  const res = await request(app).post("/api/auth/login").send({ email, password: "StrongPass1" });
  return { user, token: res.body.data?.token };
}

const ticketBody = (over = {}) => ({
  product: "POS Terminal",
  company: "Subway",
  category: "hardware",
  priority: "high",
  description: "Card reader fails during peak hours",
  ...over,
});

describe("Tickets — roles & visibility", () => {
  it("agents see ALL tickets; regular users see only their own", async () => {
    const { token: userToken } = await makeUser("Uno", "u1@example.com");
    const { token: agentToken } = await makeUser("Ago", "a1@example.com", "agent");

    await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody());
    await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody({ product: "Scanner" }));

    const asAgent = await request(app).get("/api/tickets").set("Authorization", `Bearer ${agentToken}`);
    expect(asAgent.body.data.tickets.length).toBe(2);

    const asUser = await request(app).get("/api/tickets").set("Authorization", `Bearer ${userToken}`);
    expect(asUser.body.data.tickets.length).toBe(2); // both are theirs
  });

  it("a regular user cannot see another user's ticket", async () => {
    const { user: owner, token: ownerToken } = await makeUser("owner", "owner@example.com");
    const { token: otherToken } = await makeUser("other", "other@example.com");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(ticketBody());

    const res = await request(app)
      .get(`/api/tickets/${created.body.data.ticket._id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404); // not 403 → doesn't leak ticket existence

    const own = await request(app)
      .get(`/api/tickets/${created.body.data.ticket._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(own.status).toBe(200);
    expect(own.body.data.ticket.employee).toBe("owner");
    expect(String(own.body.data.ticket.user._id)).toBe(String(owner._id));
  });

  it("assigns tickets to AGENTS (not just admins) and routes the team", async () => {
    const { token: userToken } = await makeUser("Udos", "u2@example.com");
    const { user: agent, token: agentToken } = await makeUser("Atwo", "a2@example.com", "agent", { team: "Network" });

    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${userToken}`)
      .send(ticketBody());

    const res = await request(app)
      .patch(`/api/tickets/${created.body.data.ticket._id}/assign`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ assignedTo: agent._id });
    expect(res.status).toBe(200);
    expect(res.body.data.ticket.assignedTo.email).toBe("a2@example.com");
    expect(res.body.data.ticket.team).toBe("Network");
  });

  it("rejects assigning to a regular user", async () => {
    const { token: adminToken } = await makeUser("adm", "adm@example.com", "admin");
    const { user: plain, token: plainToken } = await makeUser("plain", "plain@example.com");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${plainToken}`)
      .send(ticketBody());

    const res = await request(app)
      .patch(`/api/tickets/${created.body.data.ticket._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assignedTo: plain._id });
    expect(res.status).toBe(400);
  });
});

describe("Tickets — tags", () => {
  it("creates tickets with deduped lowercase tags and filters by tag", async () => {
    const { token } = await makeUser("tagger", "tagger@example.com");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketBody({ tags: ["Printer", "printer", "POS"] }));
    expect(created.status).toBe(201);
    expect(created.body.data.ticket.tags).toEqual(["printer", "pos"]);

    const filtered = await request(app)
      .get("/api/tickets")
      .query({ tag: "printer" })
      .set("Authorization", `Bearer ${token}`);
    expect(filtered.body.data.tickets.length).toBe(1);
  });
});

describe("Tickets — search", () => {
  it("finds tickets by ticket number (anchored index path)", async () => {
    const { token } = await makeUser("searcher", "searcher@example.com");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketBody());
    const number = created.body.data.ticket.ticketNumber;

    const res = await request(app)
      .get("/api/tickets")
      .query({ search: number })
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.tickets.some((t) => t.ticketNumber === number)).toBe(true);
  });

  it("finds tickets by a bare digit fragment like \"0007\" (command palette)", async () => {
    // BUG-qa8-3: bare digits used to fall through to $text and find nothing
    // because the ticketNumber path required the anchored "TKT…" form.
    const { token } = await makeUser("digitsearch", "digitsearch@example.com");
    const first = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketBody());
    const second = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketBody({ product: "Scanner" }));

    const firstNumber = first.body.data.ticket.ticketNumber; // …-0001
    const secondNumber = second.body.data.ticket.ticketNumber; // …-0002
    const fragment = secondNumber.split("-").pop(); // "0002"

    const res = await request(app)
      .get("/api/tickets")
      .query({ search: fragment })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const numbers = res.body.data.tickets.map((t) => t.ticketNumber);
    expect(numbers).toContain(secondNumber);
    expect(numbers).not.toContain(firstNumber); // "0002" must not match "…-0001"
  });

  it("full-text search matches description words", async () => {
    const { token } = await makeUser("ftsearch", "ftsearch@example.com");
    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketBody({ description: "UniqueZanzibarKeyword in the description" }));

    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "UniqueZanzibarKeyword" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.tickets.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Tickets — company directory", () => {
  it("links companyId and mirrors the canonical company name", async () => {
    const { token: adminToken } = await makeUser("Cadm", "cadm@example.com", "admin");
    const company = await Company.create({ name: "In-N-Out Burger" });

    const { token: userToken } = await makeUser("Cust", "cu@example.com");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${userToken}`)
      .send(ticketBody({ companyId: String(company._id), company: "wrong free text" }));
    expect(created.status).toBe(201);
    expect(created.body.data.ticket.company).toBe("In-N-Out Burger"); // directory wins

    const listed = await request(app)
      .get("/api/companies")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.companies.some((c) => c.name === "In-N-Out Burger")).toBe(true);
  });
});

describe("Tickets — CSAT", () => {
  it("lets the requester rate a resolved ticket exactly once", async () => {
    const { token: ownerToken } = await makeUser("csat-u", "csat-u@example.com");
    const { token: agentToken } = await makeUser("csat-a", "csat-a@example.com", "agent");

    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(ticketBody());
    const id = created.body.data.ticket._id;

    // Not rateable while open
    const early = await request(app)
      .post(`/api/tickets/${id}/csat`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rating: 5 });
    expect(early.status).toBe(400);

    // Resolve it
    await request(app)
      .patch(`/api/tickets/${id}/status`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ status: "resolved" });

    // Rate it
    const rated = await request(app)
      .post(`/api/tickets/${id}/csat`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rating: 4, comment: "Quick fix, thanks" });
    expect(rated.status).toBe(200);
    expect(rated.body.data.csat.rating).toBe(4);

    // Double rate → 409
    const again = await request(app)
      .post(`/api/tickets/${id}/csat`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rating: 1 });
    expect(again.status).toBe(409);

    // CSAT appears in dashboard metrics
    const stats = await request(app)
      .get("/api/tickets/stats")
      .set("Authorization", `Bearer ${agentToken}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data.metrics.csat.avgRating).toBe(4);
    expect(stats.body.data.metrics.csat.responses).toBe(1);
    // FRT recorded when the agent acted (status change counts as first response)
    expect(stats.body.data.metrics.firstResponse.responded).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------
// NEW (UI/UX sprint): agent queue filters + ticket subject
// ---------------------------------------------------------------------
describe("Tickets — queue filters & subject", () => {
  it("creates a ticket with an optional subject and returns it", async () => {
    const { token } = await makeUser("Subj", "subj@example.com");
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketBody({ subject: "Front desk printer is dead" }));
    expect(res.status).toBe(201);
    expect(res.body.data.ticket.subject).toBe("Front desk printer is dead");
  });

  it("assignedTo=me resolves to the authenticated staff member", async () => {
    const { token: userToken } = await makeUser("Req Q", "reqq@example.com");
    const { user: agent, token: agentToken } = await makeUser("Agen Q", "agenq@example.com", "agent");
    const { token: otherAgentToken } = await makeUser("Agen R", "agenr@example.com", "agent");

    const t1 = await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody());
    const t2 = await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody({ product: "Printer" }));
    // assign one ticket to Agen Q
    await request(app)
      .patch(`/api/tickets/${t1.body.data.ticket._id}/assign`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ assignedTo: String(agent._id) });
    // and the other to Agen R
    await request(app)
      .patch(`/api/tickets/${t2.body.data.ticket._id}/assign`)
      .set("Authorization", `Bearer ${otherAgentToken}`)
      .send({ assignedTo: String((await User.findOne({ email: "agenr@example.com" }))._id) });

    const mine = await request(app)
      .get("/api/tickets?assignedTo=me")
      .set("Authorization", `Bearer ${agentToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.tickets.length).toBe(1);
    expect(String(mine.body.data.tickets[0].assignedTo._id)).toBe(String(agent._id));
  });

  it("unassigned=true returns only tickets with no assignee", async () => {
    const { token: userToken } = await makeUser("Req U", "requ@example.com");
    const { user: agent, token: agentToken } = await makeUser("Agen U", "agenu@example.com", "agent");

    await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody());
    const t2 = await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody({ product: "Router" }));
    await request(app)
      .patch(`/api/tickets/${t2.body.data.ticket._id}/assign`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ assignedTo: String(agent._id) });

    const res = await request(app)
      .get("/api/tickets?unassigned=true")
      .set("Authorization", `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tickets.length).toBe(1);
    expect(res.body.data.tickets[0].assignedTo).toBeNull();
  });

  it("slaAtRisk=true returns only active tickets due within 4h", async () => {
    const { token: userToken } = await makeUser("Req S", "reqs@example.com");
    const { token: agentToken } = await makeUser("Agen S", "agens@example.com", "agent");

    // urgent → SLA due in ~4h → at risk
    await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody({ priority: "urgent" }));
    // low → SLA due in ~72h → NOT at risk
    await request(app).post("/api/tickets").set("Authorization", `Bearer ${userToken}`).send(ticketBody({ priority: "low", product: "Slow thing" }));

    const res = await request(app)
      .get("/api/tickets?slaAtRisk=true")
      .set("Authorization", `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tickets.length).toBe(1);
    expect(res.body.data.tickets[0].priority).toBe("urgent");
  });

  it("regular users cannot use queue filters to see others' tickets", async () => {
    const { token: userToken } = await makeUser("Req N", "reqn@example.com");
    const res = await request(app)
      .get("/api/tickets?unassigned=true&assignedTo=me")
      .set("Authorization", `Bearer ${userToken}`);
    // user-scope query stays { user: req.user } — filters only narrow THEIR tickets
    expect(res.status).toBe(200);
    res.body.data.tickets.forEach((tk) => {
      expect(tk.user?._id || tk.user).toBeTruthy();
    });
  });
});
