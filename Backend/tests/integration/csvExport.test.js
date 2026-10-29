/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ADD(QA-rec-3): integration tests for the CSV export permission change —
// agents CAN export (they already see every ticket in the queue UI),
// regular users still CANNOT, and destructive bulk-delete remains
// admin-only. Also covers the shared date-range filter end-to-end.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
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

async function makeUser(name, email, role = "user") {
  const hash = await bcrypt.hash("StrongPass1", 10);
  await User.create({
    name,
    email,
    password: hash,
    role,
    emailVerifiedAt: new Date(),
  });
  const res = await request(app).post("/api/auth/login").send({ email, password: "StrongPass1" });
  return res.body.data?.token;
}

// Two tickets with controlled createdAt dates (validation timestamps:false
// style — native insert so mongoose immutability doesn't strip them).
const seedTickets = async (userId) => {
  const docs = [
    {
      ticketNumber: "TKT-2026-9001", product: "Old Device", company: "Subway",
      category: "hardware", priority: "low", status: "closed",
      employee: "Seeder", user: userId, description: "created in October",
      startDate: new Date("2026-10-05"), createdAt: new Date("2026-10-05"),
      updatedAt: new Date("2026-10-06"),
    },
    {
      ticketNumber: "TKT-2026-9002", product: "New Device", company: "KFC",
      category: "software", priority: "high", status: "open",
      employee: "Seeder", user: userId, description: "created in November",
      startDate: new Date("2026-11-05"), createdAt: new Date("2026-11-05"),
      updatedAt: new Date("2026-11-06"),
    },
  ];
  await Ticket.collection.insertMany(docs);
};

describe("CSV export — role permissions + date range", () => {
  it("AGENTS can export (QA-rec-3) and the CSV respects from/to", async () => {
    const agentToken = await makeUser("Agent X", "csv-agent@example.com", "agent");
    const seeder = await User.findOne({ email: "csv-agent@example.com" });
    await seedTickets(seeder._id);

    const res = await request(app)
      .get("/api/tickets/export/csv")
      .set("Authorization", `Bearer ${agentToken}`)
      .query({ from: "2026-11-01", to: "2026-12-01" })
      .expect(200)
      .expect("Content-Type", /text\/csv/);

    const lines = res.text.trim().split("\n");
    expect(lines[0]).toContain("TicketNumber");
    // Only the November ticket — the October one is excluded by the range.
    expect(res.text).toContain("TKT-2026-9002");
    expect(res.text).not.toContain("TKT-2026-9001");
  });

  it("REGULAR users still cannot export (403)", async () => {
    const userToken = await makeUser("Plain User", "csv-user@example.com", "user");
    const res = await request(app)
      .get("/api/tickets/export/csv")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("bulk DELETE stays admin-only — agents get 403", async () => {
    const agentToken = await makeUser("Agent Y", "csv-agent2@example.com", "agent");
    const res = await request(app)
      .post("/api/tickets/bulk/delete")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ ids: [] });
    expect(res.status).toBe(403);
  });
});
