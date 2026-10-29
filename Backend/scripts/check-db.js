// check-db.js — quick data sanity check
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/it-ticketing");
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const n = await db.collection(c.name).countDocuments({});
    console.log(`${c.name}: ${n}`);
  }
  const tickets = await db.collection("tickets").find({}).limit(3).toArray();
  console.log("\nSample tickets:");
  tickets.forEach((t) => console.log(` - ${t.ticketNumber} | ${t.subject?.slice(0, 40)} | ${t.status} | ${t.priority}`));
  const users = await db.collection("users").find({}).limit(20).toArray();
  console.log("\nUsers:");
  users.forEach((u) => console.log(` - ${u.email} | ${u.role} | ${u.status}`));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
