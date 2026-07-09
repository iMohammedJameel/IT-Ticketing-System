// Vitest config — runs unit tests in tests/unit and integration tests in tests/integration.
// Integration tests spin up an in-memory MongoDB via mongodb-memory-server.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["tests/setup.js"],
    // Disable isolation — without this, each test file gets its own module
    // registry. The Mongoose `mongoose.model()` call would then be invoked
    // twice on the same singleton mongoose instance, throwing
    // "Cannot overwrite `User` model once compiled".
    isolate: false,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["controller/**", "middleware/**", "services/**", "models/**"],
      exclude: ["**/*.test.js", "tests/**"],
    },
  },
});
