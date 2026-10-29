#!/usr/bin/env node
/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ADD(QA-rec-1): one-command E2E runner —
//
//   npm run test:e2e:full
//
// Orchestrates the WHOLE stack so the Playwright suites in tests/e2e always
// run against a freshly seeded backend (the missing piece that kept them
// from ever running automatically):
//   1. seed  Backend (seedUsers + seedDemo) against MONGO_URL (default the
//            dev DB the backend itself uses)
//   2. start Backend on :5000 (npm start) and wait for /api/health
//   3. run   `playwright test` — its own webServer block builds+previews the
//            frontend on :4173
//   4. stop  the backend (SIGINT → clean shutdown) and propagate the exit code
//
// Environment overrides:
//   BACKEND_DIR (default ../Backend)   MONGO_URL (default unset → backend .env)
//   SKIP_SEED=1 (reuse whatever is in the DB)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
// Repo layout: <root>/Backend + <root>/frontend/it-help-desk — the frontend
// sits TWO levels below the root, so the backend default climbs twice.
const BACKEND_DIR = process.env.BACKEND_DIR || path.resolve(FRONTEND_DIR, "..", "..", "Backend");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const BACKEND_DIR_OK = existsSync(path.join(BACKEND_DIR, "app.js"));

if (!BACKEND_DIR_OK) {
  console.error(`[e2e] Backend not found at ${BACKEND_DIR} — set BACKEND_DIR`);
  process.exit(1);
}

const log = (tag) => (data) => {
  const lines = String(data).trim();
  if (lines) console.log(`[${tag}] ${lines.replace(/\n/g, `\n[${tag}] `)}`);
};

// Wait until the backend answers /api/health (up to ~30s)
const waitForBackend = async () => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const run = (cmd, args, cwd, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env, ...env },
    });
    child.stdout.on("data", log(cmd));
    child.stderr.on("data", log(`${cmd}:err`));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

let backendProc = null;
const stopBackend = () => {
  if (backendProc && !backendProc.killed) {
    // Kill the whole PROCESS GROUP (spawned detached) — killing only the npm
    // wrapper used to orphan the `node app.js` grandchild, which then held
    // :5000 hostage (EADDRINUSE) and served STALE code to the next run.
    try {
      process.kill(-backendProc.pid, "SIGINT");
    } catch {
      backendProc.kill("SIGINT");
    }
  }
};

try {
  // ---- 0. refuse to run against stray servers (stale code / stale rate-
  // limit state) unless explicitly told to reuse --------------------------
  if (process.env.REUSE_BACKEND !== "1") {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) {
        console.error(
          `[e2e] ${BACKEND_URL} is already serving. A stale backend would run OLD code ` +
            `and carry over its login rate-limit budget. Stop it first ` +
            `(pkill -f "node app.js") or set REUSE_BACKEND=1 to reuse it.`
        );
        process.exit(1);
      }
    } catch {
      /* nothing on :5000 — good */
    }
  }

  // ---- 1. seed the backend DB (idempotent by design) ----------------------
  if (process.env.SKIP_SEED !== "1") {
    console.log("[e2e] seeding backend (seedUsers + seedDemo)…");
    await run("npm", ["run", "seed:demo"], BACKEND_DIR);
  } else {
    console.log("[e2e] SKIP_SEED=1 — reusing the current DB");
  }

  // ---- 2. start the backend and wait for /api/health ----------------------
  // `node app.js` DIRECTLY (no npm wrapper) + detached process group →
  // reliable group kill on exit.
  console.log("[e2e] starting backend on :5000…");
  backendProc = spawn("node", ["app.js"], {
    cwd: BACKEND_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true, // new process group so we can kill the whole tree
    env: {
      ...process.env,
      // The suite logs in before EVERY test (~17 requests) — that brushes
      // the default auth rate limit (20 / 15 min). Relax it for the test
      // backend only (same spirit as Backend/tests/setup.js). dotenv does
      // not override pre-set process.env values, so this wins over .env.
      AUTH_RATE_LIMIT_MAX: "1000",
    },
  });
  backendProc.stdout.on("data", log("api"));
  backendProc.stderr.on("data", log("api:err"));
  backendProc.on("exit", (code) => {
    if (code !== null && code !== 0) console.log(`[api] exited ${code}`);
  });

  if (!(await waitForBackend())) {
    throw new Error(`backend did not become healthy at ${BACKEND_URL}/api/health`);
  }
  console.log("[e2e] backend healthy ✓");

  // ---- 3. run Playwright (its webServer block handles the frontend) -------
  await run("npx", ["playwright", "test"], FRONTEND_DIR);
  console.log("[e2e] Playwright suite finished ✓");
  process.exitCode = 0;
} catch (err) {
  console.error(`[e2e] FAILED: ${err.message}`);
  process.exitCode = 1;
} finally {
  stopBackend();
  // give express a beat to flush logs before the process dies
  setTimeout(() => process.exit(process.exitCode ?? 0), 300);
}
