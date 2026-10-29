/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Regression tests for the company duplicate-name guard.
//
// BUG(QA-rec-lint): the guard called `value.escapeRegex(name)` — `name` was
// never defined (ReferenceError → 500 instead of 409) and escapeRegex was
// called as a property of the validated value instead of the imported
// helper. Creating/updating a company with an existing name CRASHED the
// request. These tests lock the fixed behavior in.
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

// setup.js afterEach wipes ALL collections — recreate + relogin per test so
// the admin token always points at a live user.
const makeAdmin = async () => {
  const hash = await bcrypt.hash("StrongPass1", 10);
  await User.create({
    name: "Admin Co",
    email: "co-admin@example.com",
    password: hash,
    role: "admin",
    emailVerifiedAt: new Date(),
  });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "co-admin@example.com", password: "StrongPass1" });
  return res.body.data?.token;
};

describe("Company duplicate-name guard (regression)", () => {
  it("creating a company with an existing name returns 409 (not a 500 crash)", async () => {
    const adminToken = await makeAdmin();
    await Company.create({ name: "Burger King", email: "ops@bk.example" });

    const res = await request(app)
      .post("/api/companies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "burger king", email: "other@bk.example" }); // case-insensitive dup

    expect(res.status).toBe(409);
    expect(res.body.message || res.body.error?.message).toMatch(/already exists/i);
  });

  it("updating a company to another company's name returns 409", async () => {
    const adminToken = await makeAdmin();
    const a = await Company.create({ name: "Pizza Hut" });
    await Company.create({ name: "Domino's Pizza" });

    const res = await request(app)
      .put(`/api/companies/${a._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "domino's pizza" });

    expect(res.status).toBe(409);
  });

  it("regex specials in the name do not throw or over-match", async () => {
    const adminToken = await makeAdmin();
    await Company.create({ name: "C++ Cafe" });
    // "C.. Cafe" — the dots are regex wildcards if unescaped: would match.
    const res = await request(app)
      .post("/api/companies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "C.. Cafe" });
    expect(res.status).toBe(201); // different name → created, no crash
  });
});
