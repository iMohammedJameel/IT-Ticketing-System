/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Integration tests for the auth flow — register, login, me, logout.
// Uses an in-memory MongoDB (set up in tests/setup.js) so we exercise the
// actual User model + bcrypt + JWT without mocking.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import User from "../../models/User";
import bcrypt from "bcrypt";

// We need to build the express app without calling startServer (which
// binds a port). The app.js file exports the app, but it also calls
// startServer as a side effect. So we stub mongoose.connect + socket.io
// before requiring app.js, then take the exported app.
let app;

beforeAll(async () => {
  // Stub socket.io so initSocket doesn't try to attach to a real server
  const socketIo = require("socket.io");
  socketIo.Server = class {
    constructor() {
      this.use = () => this;
      this.on = () => this;
      this.to = () => ({ emit: () => {} });
    }
  };
  // Stub the SLA monitor so it doesn't fire during tests
  const slaMonitor = require("../../services/slaMonitor");
  slaMonitor.startSlaMonitor = () => {};
  slaMonitor.stopSlaMonitor = () => {};

  app = require("../../app");
});

// Helper: register + return the auth token
async function registerAndLogin(name, email, password = "StrongPass1") {
  // The User model marks users as emailVerifiedAt=null by default, which
  // blocks login. For tests we directly create a verified user via the model.
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hash,
    emailVerifiedAt: new Date(),
  });
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return { user, token: res.body.data?.token, refreshToken: res.body.data?.refreshToken };
}

describe("Auth integration", () => {
  describe("POST /api/auth/register", () => {
    it("creates a user with role 'user' (never admin) and returns a token", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Alice", email: "alice@example.com", password: "StrongPass1", role: "admin" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.role).toBe("user"); // role stripped

      const dbUser = await User.findOne({ email: "alice@example.com" });
      expect(dbUser).toBeTruthy();
      expect(dbUser.role).toBe("user");
      expect(dbUser.emailVerifiedAt).toBeNull(); // not verified yet
      expect(dbUser.password).not.toBe("StrongPass1"); // hashed
    });

    it("returns the SAME 201 envelope for a duplicate email (anti-enumeration)", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ name: "Bob", email: "bob@example.com", password: "StrongPass1" })
        .expect(201);

      // Duplicate — must look identical to a success, minus the token.
      // (The old 409 "Email already registered" let anyone probe which
      // emails are signed up.)
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Bob2", email: "bob@example.com", password: "StrongPass1" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeUndefined(); // no token without a real account
      expect(res.body.data.user).toBeUndefined();

      // Still exactly ONE account for that email
      const count = await User.countDocuments({ email: "bob@example.com" });
      expect(count).toBe(1);
    });

    it("rejects a weak password with 400 + validation details", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Weak", email: "weak@example.com", password: "abc" })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toBeInstanceOf(Array);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in a verified user and returns access + refresh tokens", async () => {
      const { token, refreshToken } = await registerAndLogin("Carol", "carol@example.com");
      expect(token).toBeTruthy();
      expect(refreshToken).toBeTruthy();
    });

    it("blocks an unverified user with 403", async () => {
      // Register (unverified) then try to login
      await request(app)
        .post("/api/auth/register")
        .send({ name: "Unverified", email: "unv@example.com", password: "StrongPass1" })
        .expect(201);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "unv@example.com", password: "StrongPass1" })
        .expect(403);

      expect(res.body.error.message).toMatch(/verify your email/i);
    });

    it("returns the same error for unknown email and wrong password (no enumeration)", async () => {
      const unknown = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "anything" })
        .expect(401);

      await registerAndLogin("Dave", "dave@example.com");
      const wrongPw = await request(app)
        .post("/api/auth/login")
        .send({ email: "dave@example.com", password: "wrongpassword" })
        .expect(401);

      expect(unknown.body.error.message).toBe(wrongPw.body.error.message);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the current user when authed", async () => {
      const { token, user } = await registerAndLogin("Eve", "eve@example.com");
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.user.email).toBe(user.email);
    });

    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/auth/me").expect(401);
      expect(res.body.error.message).toMatch(/authentication required/i);
    });

    it("returns 401 with a malformed Authorization header", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "NotBearer abc")
        .expect(401);
      expect(res.body.error.message).toMatch(/invalid authorization header/i);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("invalidates the current token (bumps tokenVersion)", async () => {
      const { token } = await registerAndLogin("Frank", "frank@example.com");

      // Logout
      await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Subsequent requests with the old token should fail (tokenVersion mismatch)
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(401);
      expect(res.body.error.message).toMatch(/session invalidated/i);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("issues a new access+refresh token pair when the refresh token is valid", async () => {
      const { refreshToken } = await registerAndLogin("Grace", "grace@example.com");

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.refreshToken).not.toBe(refreshToken); // rotation
    });

    it("rejects an already-used refresh token (rotation)", async () => {
      const { refreshToken } = await registerAndLogin("Heidi", "heidi@example.com");

      // First use succeeds
      await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      // Second use of the same token should fail
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(401);

      expect(res.body.error.message).toMatch(/reuse|invalid/i);
    });

    it("rejects a garbage refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "not-a-real-token" })
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // MFA (TOTP) — setup → enable → login challenge → verify → recovery code
  // -------------------------------------------------------------------
  describe("MFA flow", () => {
    it("challenges login with mfa_required, accepts a valid TOTP code, and burns a recovery code after use", async () => {
      const { user, token } = await registerAndLogin("Ivan", "ivan@example.com");

      // 1. Setup — returns secret + otpauth URI
      const setup = await request(app)
        .post("/api/auth/mfa/setup")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(setup.body.data.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(setup.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);

      // 2. Enable — with a CURRENT code derived from the returned secret
      const totp = require("../../services/totpService");
      const nowCode = totp.totp(setup.body.data.secret);
      const enabled = await request(app)
        .post("/api/auth/mfa/enable")
        .set("Authorization", `Bearer ${token}`)
        .send({ token: nowCode })
        .expect(200);
      const recoveryCodes = enabled.body.data.recoveryCodes;
      expect(recoveryCodes.length).toBe(5);

      // 3. Login WITHOUT the code → 401 + mfa_required marker
      const challenged = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "StrongPass1" })
        .expect(401);
      expect(challenged.body.error.message).toMatch(/mfa/i);
      expect(challenged.body.error.details[0].code).toBe("mfa_required");

      // 4. Login WITH a fresh TOTP code → success
      const freshCode = totp.totp(setup.body.data.secret);
      const loginOk = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "StrongPass1", mfaToken: freshCode })
        .expect(200);
      expect(loginOk.body.data.token).toBeTruthy();

      // 5. Recovery code — works once, then is consumed
      const viaRecovery = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "StrongPass1", mfaToken: recoveryCodes[0] })
        .expect(200);
      expect(viaRecovery.body.data.token).toBeTruthy();

      const reuse = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "StrongPass1", mfaToken: recoveryCodes[0] })
        .expect(401);
      expect(reuse.body.error.details[0].code).toBe("mfa_required");

      // 6. Disable with the wrong password → rejected; correct password → OK
      await request(app)
        .post("/api/auth/mfa/disable")
        .set("Authorization", `Bearer ${token}`)
        .send({ password: "WrongPassword1" })
        .expect(400);
      await request(app)
        .post("/api/auth/mfa/disable")
        .set("Authorization", `Bearer ${token}`)
        .send({ password: "StrongPass1" })
        .expect(200);

      // Login works again without MFA
      await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "StrongPass1" })
        .expect(200);
    });
  });

  describe("PATCH /api/auth/profile", () => {
    // REGRESSION: the verification token used to be destructured inside the
    // email-change if-block but consumed outside it (block scoping) — every
    // email change crashed with ReferenceError AFTER the email was already
    // persisted. This test pins the correct behavior.
    it("changes the user's email without crashing and issues a fresh verification token", async () => {
      const { token } = await registerAndLogin("Emilie", "emilie@example.com");

      const res = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "emilie.new@example.com" })
        .expect(200); // was 500 (ReferenceError) before the fix

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("emilie.new@example.com");

      // Email is persisted but unverified, with a fresh (hashed) token + expiry.
      // (token fields are select:false in the model — opt in explicitly.)
      const dbUser = await User.findOne({ email: "emilie.new@example.com" })
        .select("+emailVerificationToken +emailVerificationExpires");
      expect(dbUser).toBeTruthy();
      expect(dbUser.emailVerifiedAt).toBeNull();
      expect(dbUser.emailVerificationToken).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
      expect(dbUser.emailVerificationExpires).toBeInstanceOf(Date);
      expect(dbUser.emailVerificationExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it("rejects an email already used by another account with 409", async () => {
      const { token } = await registerAndLogin("Nadia", "nadia@example.com");
      await registerAndLogin("Rami", "rami@example.com");

      await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "rami@example.com" })
        .expect(409);
    });
  });
});
