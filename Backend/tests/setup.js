// Test setup — provides a real in-memory MongoDB instance so integration tests
// can hit the actual Mongoose models without mocking.
import { MongoMemoryServer } from "mongodb-memory-server";

// Use require() so we share the exact same Mongoose instance as the model files
// (which also use require). Using `import mongoose from "mongoose"` here would
// create a separate instance and trigger "Cannot overwrite `User` model" errors.
const mongoose = require("mongoose");

let mongoServer;

beforeAll(async () => {
  // Spin up a fresh in-memory MongoDB before the test suite starts.
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // Override env so config/env.js doesn't refuse to boot
  process.env.DB_URL = uri;
  process.env.JWT_SECRET = "test_jwt_secret_at_least_32_chars_long";
  process.env.JWT_REFRESH_SECRET = "test_refresh_secret_at_least_32_chars";
  process.env.NODE_ENV = "test";
  // Disable rate limiting during tests — the integration tests make
  // many auth requests in rapid succession and would hit the limiter
  process.env.RATE_LIMIT_MAX = "10000";
  process.env.RATE_LIMIT_WINDOW_MS = "1";
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clean all collections between tests so each test starts with a known state.
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});
