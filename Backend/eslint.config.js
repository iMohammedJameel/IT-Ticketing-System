/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ESLint v9 flat config (CommonJS project).
// Scope: catch real bugs (unused vars, undefined refs, shadowing) without
// drowning the codebase in style noise. Zero plugin dependencies beyond
// eslint + globals keeps `npm ci` fast in CI.
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "uploads/**",
      "coverage/**",
      "docs/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ---- Bug-catchers (errors) ----
      "no-unused-vars": [
        "error",
        {
          args: "none", // unused function args are common in Express handlers (err, req, res, next)
          caughtErrors: "none", // catch (e) {} is an intentional swallow in places
          varsIgnorePattern: "^_",
        },
      ],
      "no-shadow": ["error", { builtinGlobals: false, hoist: "functions" }],
      "no-self-compare": "error",
      "no-unreachable-loop": "error",
      "no-await-in-loop": "off", // sequential awaits on shared state are intentional (SLA monitor, seeds)

      // ---- Relaxed recommended defaults that were pure style ----
      "no-empty": ["error", { allowEmptyCatch: true }], // try { x } catch {} used for silent-swallow by design
      "no-useless-escape": "warn",
    },
  },
  // Test files + vitest config — ESM syntax (vitest transpiles them), so
  // parse as modules with the vitest globals available.
  {
    files: ["tests/**", "vitest.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" },
      ],
    },
  },
];
