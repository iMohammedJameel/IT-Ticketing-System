// qa-env.js — Boots an in-memory MongoDB on port 27017, then runs
// seedUsers.js + seedDemo.js, and keeps Mongo alive until killed.
// Usage: node scripts/qa-env.js
const { MongoMemoryServer } = require("mongodb-memory-server");

(async () => {
  console.log("[qa-env] starting in-memory MongoDB…");
  const mongod = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1", port: 27017, dbName: "it-ticketing" },
  });
  const uri = mongod.getUri("it-ticketing");
  console.log("[qa-env] MongoDB ready:", uri);

  // Run seeders sequentially — require() returns the exported FUNCTION,
  // so we must CALL it (await fn()), not just await the module.
  try {
    console.log("[qa-env] running seedUsers.js …");
    await require("../seedUsers.js")();
    console.log("[qa-env] seedUsers done");
  } catch (e) {
    console.error("[qa-env] seedUsers failed:", e.message);
  }
  try {
    console.log("[qa-env] running seedDemo.js …");
    await require("../seedDemo.js")();
    console.log("[qa-env] seedDemo done");
  } catch (e) {
    console.error("[qa-env] seedDemo failed:", e.message);
  }

  console.log("[qa-env] KEEPING ALIVE — press Ctrl+C or SIGTERM to stop");
  // A pending promise alone does NOT keep the Node event loop alive —
  // an active timer handle does.
  setInterval(() => {}, 60000);
  await new Promise(() => {});
})().catch((err) => {
  console.error("[qa-env] fatal:", err);
  process.exit(1);
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
