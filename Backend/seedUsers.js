// Database seeder — must be invoked explicitly: `npm run seed`
// Reads admin credentials from env (ADMIN_EMAIL / ADMIN_PASSWORD) — never hardcodes them.
// Refuses to run in production unless SEED_FORCE=true.
// Refuses to seed admin in production without ADMIN_EMAIL / ADMIN_PASSWORD env vars.
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const env = require("./config/env");

const sampleUsers = [
  { name: "Ahmed Hassan", email: "ahmed.hassan@example.com", password: "Demo@1234", role: "user" },
  { name: "Sara Mohamed", email: "sara.mohamed@example.com", password: "Demo@1234", role: "user" },
  { name: "Omar Khaled", email: "omar.khaled@example.com", password: "Demo@1234", role: "user" },
  { name: "Fatima Ali", email: "fatima.ali@example.com", password: "Demo@1234", role: "user" },
  { name: "Youssef Ibrahim", email: "youssef.ibrahim@example.com", password: "Demo@1234", role: "user" },
];

async function seedUsers() {
  // Guard 1: refuse to seed in production unless explicitly forced
  if (env.isProd && process.env.SEED_FORCE !== "true") {
    console.error("❌ Refusing to seed in production. Set SEED_FORCE=true to override.");
    process.exit(1);
  }

  // Guard 2: must be invoked directly via `npm run seed`, not required as a module
  // (operator precedence fix — original code had `!require.main === module` which is always false)
  if (require.main !== module) {
    console.error("❌ seedUsers.js must be run directly: `npm run seed`");
    process.exit(1);
  }

  // Guard 3: in production, admin credentials MUST come from env (no hardcoded fallbacks)
  let adminEmail = process.env.ADMIN_EMAIL;
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (env.isProd) {
    if (!adminEmail || !adminPassword) {
      console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required in production.");
      console.error("   Refusing to create an admin with default credentials.");
      process.exit(1);
    }
  } else {
    // Development only — fall back to safe demo defaults
    adminEmail = adminEmail || "admin@example.com";
    adminPassword = adminPassword || "Admin@1234";
  }

  try {
    await mongoose.connect(env.dbUrl);
    console.log("✅ Connected to MongoDB");

    // Create admin — pre-verified so they can log in immediately
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hash = await bcrypt.hash(adminPassword, env.bcryptSaltRounds);
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hash,
        role: "admin",
        emailVerifiedAt: new Date(), // pre-verified — admins skip email verification
      });
      console.log(`✓ Created admin: ${adminEmail}`);
    } else {
      console.log(`- Admin already exists: ${adminEmail}`);
    }

    // Create sample users — pre-verified for easier testing
    for (const u of sampleUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const hash = await bcrypt.hash(u.password, env.bcryptSaltRounds);
        await User.create({
          ...u,
          password: hash,
          emailVerifiedAt: new Date(), // pre-verified for demo users
        });
        console.log(`✓ Created user: ${u.name}`);
      } else {
        console.log(`- User already exists: ${u.name}`);
      }
    }

    console.log("\n✅ Seeding completed!");
    console.log(`\n📋 Login credentials:`);
    console.log(`   Admin : ${adminEmail} / ${adminPassword}`);
    console.log(`   User  : ${sampleUsers[0].email} / ${sampleUsers[0].password}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

// Only run when invoked directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
