/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // -----------------------------------------------------------------
      // set-state-in-effect fires on the classic "fetch on mount / when
      // filters change" pattern (useEffect → async fetch → setState in the
      // .then). That pattern is intentional across this codebase (see
      // react.dev/learn/you-might-not-need-an-effect — fetching IS the
      // sanctioned use of effects). Kept as a WARNING so genuinely
      // problematic synchronous setStates still surface in review, without
      // failing `npm run lint` / CI on every data-fetching page.
      // -----------------------------------------------------------------
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // -----------------------------------------------------------------
    // Root config files (vite/playwright/eslint) run in NODE, not the
    // browser — they need `process`, `console`, etc. Without this block
    // `eslint .` fails on playwright.config.js (`process is not defined`).
    // -----------------------------------------------------------------
    files: ['*.config.js', 'tests/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // -----------------------------------------------------------------
    // Context files export BOTH the Provider component and its useX() hook
    // — the canonical React Context API pattern. react-refresh flags this
    // because HMR fast-refresh only works for component-only files, but
    // splitting every context hook into a separate file is churn with no
    // runtime benefit. This is the standard exemption most React codebases
    // (incl. Vite's own templates) apply to context/ and i18n providers.
    // -----------------------------------------------------------------
    files: ['src/context/**', 'src/i18n/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
