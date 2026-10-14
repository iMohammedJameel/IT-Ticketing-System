# IT Help Desk — Frontend

Bilingual (Arabic-first / English) React SPA for the Jameel IT Ticketing System.
Agents and admins triage, assign, and resolve tickets; employees report issues
and track them in real time.

## Stack

- **React 19** + **Vite 8**
- **Bootstrap 5** (auto LTR/RTL build swap) + **CSS Modules**
- **Recharts** for dashboards/analytics
- **Socket.io** client for live notifications & presence
- **i18n**: hand-rolled, zero-dependency — `src/i18n/en.js` / `src/i18n/ar.js`
  with a parity check (`npm run check:i18n`)

## Getting started

```bash
npm install
cp .env.example .env      # adjust VITE_API_URL if the backend isn't on :5000
npm run dev               # http://localhost:5173
```

The backend repo lives in `../../Backend` — start it first
(`npm run dev` there, with MongoDB running).

## Scripts

| Script                  | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Vite dev server with `/api` + `/socket.io` proxy |
| `npm run build`         | Production build (fails on Vite errors)         |
| `npm run preview`       | Serve the built bundle locally                  |
| `npm run lint`          | ESLint (0 errors required in CI)                |
| `npm run check:i18n`    | EN/AR dictionary parity check                   |
| `npx playwright test`   | E2E suite (needs backend + seeded DB, see below) |

## E2E tests

The Playwright suite (`tests/e2e/`) expects a **running backend on :5000**
seeded with `npm run seed` in the backend folder (admin:
`admin@jameel-it.com` / `password123`). It boots the built app via
`webServer` in `playwright.config.js`.

## Structure

```
src/
  api.jsx               # axios instance + 401 refresh-retry interceptor
  context/              # Auth / Theme / Notification providers
  i18n/                 # en.js, ar.js, plain.js (pre-React toasts)
  components/
    layout/             # Navbar, Sidebar, Footer
    common/             # CommandPalette, Modal, Spinner, EmptyState, …
    Dashboard/          # DashboardContent (stats, charts, tables)
  pages/                # Login, Register, Dashboard, TicketsList, Tickets,
                        # UserHome, AgentQueue, Users, KnowledgeBase,
                        # Settings, Notifications, Auth (verify/reset)
  services/             # one module per API resource
  utils/                # format, env, platform, dashboardExport
```

## Notes

- **Language**: Arabic is the default (`localStorage.app_language`), full RTL
  via `dir` attribute + Bootstrap RTL stylesheet swap; an anti-flash script in
  `index.html` applies the stored language before React mounts.
- **Roles**: `user` / `agent` / `admin` — routing is role-aware
  (admin → dashboard, agent → queue, user → home).
- **Dark mode** via `data-theme` attribute; all artwork disables itself in
  dark mode.
