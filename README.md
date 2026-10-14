<div align="center">

# 🎫 Jameel IT — Help Desk & Ticketing Platform

**Bilingual (Arabic-first RTL / English) full-stack IT support platform** —
employees report issues, agents triage them in real time, admins run the whole operation.

**👨‍💻 Designed & built by [Mohammed Jameel](https://imohammedjameel.github.io/)**
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Mohammed%20Jameel-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/imohammedjameel/)
[![Portfolio](https://img.shields.io/badge/Portfolio-imohammedjameel-black?logo=github&logoColor=white)](https://imohammedjameel.github.io/)

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Tests](https://img.shields.io/badge/tests-140%20passing-brightgreen)](#-testing--ci)
[![RTL](https://img.shields.io/badge/i18n-%D8%B9%D8%B1%D8%A8%D9%8A%20%E2%80%93%20EN%20RTL%20%2B%20LTR-8A2BE2)](#-bilingual--rtl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)
[![CI](https://github.com/iMohammedJameel/IT-Ticketing-System/actions/workflows/ci.yml/badge.svg)](https://github.com/iMohammedJameel/IT-Ticketing-System/actions/workflows/ci.yml)

**60+ REST endpoints · 10 data models · 140 backend tests · realtime everything · full RTL with zero flash**

</div>

---

<img src="./docs/screenshots/dashboard-en.png" alt="Admin dashboard (English)" width="100%">

<sub align="center">Admin analytics dashboard — stat cards, SLA trends, CSAT, top performers</sub>

<table>
<tr>
<td width="50%"><img src="./docs/screenshots/dashboard-ar.png" alt="لوحة التحكم بالعربية" width="100%"><sub><b>العربية</b> — full RTL layout, Cairo font, direction-aware components</sub></td>
<td width="50%"><img src="./docs/screenshots/dashboard-dark.png" alt="Dark mode" width="100%"><sub><b>Dark mode</b> — theme persisted per user, charts included</sub></td>
</tr>
</table>

---

## ✨ Engineering highlights

| | |
|---|---|
| 🔁 **Realtime by default** | Socket.io personal rooms, role rooms and *authorized ticket rooms* — live refresh while a ticket is open, agent presence dots |
| ⏱️ **SLA engine** | Per-priority policies (72/48/24/4h) with optional *business-hours-only* counting (skips nights/weekends), hourly monitor with distributed lock, breach escalation to admins — including unassigned tickets |
| 🌍 **True bilingual** | Arabic-first full RTL / English LTR — the Bootstrap RTL build is swapped **before first paint** (no flash), 608-key dictionaries in perfect parity, logical CSS properties throughout |
| 🔐 **Security-first** | JWT access + rotating refresh with reuse detection, TOTP 2FA (zero-dependency RFC 6238), brute-force lockout, anti-enumeration auth, NoSQL sanitizer, CSV formula-injection hardening, magic-byte attachment validation |
| 🧪 **140 green tests** | Unit + integration on an in-memory MongoDB (`mongodb-memory-server`) — TOTP RFC test vectors, business-hours SLA math, RBAC, CSAT, search, CSV injection |
| ⚙️ **Ops-ready** | OpenAPI 3 spec + live Swagger UI, GitHub Actions CI (lint → tests → build → docker images), pluggable disk/S3 storage (zero-dep SigV4), structured logs with request IDs |
| ✉️ **Email → ticket** | Inbound webhook (`POST /api/inbound/email`) auto-provisions customer accounts and companies from sender domains |
| 📉 **KB deflection** | Matching help articles suggested *while typing* a ticket; one-vote-per-user helpfulness rating |

## 🧑‍💻 Feature tour by role

| Role | What they get |
|---|---|
| **Employee (`user`)** | Ticket wizard with KB suggestions + draft autosave · SLA countdowns on their tickets · comments · CSAT rating after resolution · close-the-loop CTA · knowledge base & voting · notifications |
| **Agent (`agent`)** | **My Queue** triage (assigned / unassigned / SLA-at-risk) · status stepper & priority control · internal notes · canned responses (usage-ranked) · bulk assign/status · company directory · service metrics dashboard |
| **Admin (`admin`)** | Everything + user management (roles/teams/suspend) · KB authoring (AR/EN, drafts) · canned responses & companies & SLA policies · CSV export (injection-hardened) · full analytics & reports |

**Cross-cutting:** command palette (`Ctrl+K` — tickets, KB, actions) · dark mode · mobile-first (tables collapse to stacked cards) · audit history per ticket (capped at 200 entries) · localized relative timestamps (`منذ ٥ دقائق`) · accessibility (keyboard-navigable rows, focus rings, WCAG AA text).

## 📸 Screenshots

Every screen ships in both languages — Arabic (RTL) on the left, English (LTR) on the right:

| عربي (RTL) | English (LTR) |
|---|---|
| <img src="./docs/screenshots/login-ar.png" width="100%"> <sub>تسجيل الدخول</sub> | <img src="./docs/screenshots/login-en.png" width="100%"> <sub>Login</sub> |
| <img src="./docs/screenshots/tickets-ar.png" width="100%"> <sub>Tickets queue — filters, SLA chips, pagination</sub> | <img src="./docs/screenshots/tickets-en.png" width="100%"> <sub>Tickets queue</sub> |
| <img src="./docs/screenshots/ticket-detail-ar.png" width="100%"> <sub>Ticket detail — comments, internal notes, history timeline</sub> | <img src="./docs/screenshots/ticket-detail-en.png" width="100%"> <sub>Ticket detail</sub> |
| <img src="./docs/screenshots/reports-ar.png" width="100%"> <sub>Reports — first response, resolution, SLA compliance, CSAT</sub> | <img src="./docs/screenshots/reports-en.png" width="100%"> <sub>Reports & analytics</sub> |
| <img src="./docs/screenshots/agent-queue-ar.png" width="100%"> <sub>Agent "My Queue" — triage view</sub> | <img src="./docs/screenshots/agent-queue-en.png" width="100%"> <sub>Agent queue</sub> |
| <img src="./docs/screenshots/user-home-ar.png" width="100%"> <sub>Employee home — active tickets & SLA countdowns</sub> | <img src="./docs/screenshots/user-home-en.png" width="100%"> <sub>Employee home</sub> |
| <img src="./docs/screenshots/users-ar.png" width="100%"> <sub>Admin — user management (roles/teams/suspend)</sub> | <img src="./docs/screenshots/users-en.png" width="100%"> <sub>User management</sub> |
| <img src="./docs/screenshots/mobile-admin.png" width="60%"> <sub>Mobile (375px) — admin dashboard, tables collapse to cards</sub> | <img src="./docs/screenshots/mobile-user.png" width="60%"> <sub>Mobile (375px) — employee home</sub> |

## 🏗️ Architecture

```
┌─────────────────────┐                        ┌───────────────────────────────┐        ┌──────────────┐
│  React 19 SPA       │  REST  /api + /api/v1  │  Express 4 API                │        │  MongoDB     │
│  (Vite 8)           │◄──────────────────────►│  · JWT + RBAC middleware      │◄──────►│  (Mongoose)  │
│  Bootstrap LTR/RTL  │  WebSocket             │  · 60+ routes, 10 models      │        │  atomic      │
│  CSS Modules        │◄──────────────────────►│  · Socket.io rooms/presence   │        │  counters    │
│  Recharts           │                        │  · SLA monitor (hourly, lock) │        └──────────────┘
└─────────────────────┘                        │  · inbound email webhook      │──► S3 / disk uploads
                                               │  · OpenAPI + Swagger UI       │──► SMTP (optional)
                                               └───────────────────────────────┘
```

| Layer | Stack |
|---|---|
| **Frontend** | React 19 · Vite 8 · Bootstrap 5 (runtime LTR↔RTL swap) · CSS Modules · Recharts · socket.io-client · custom i18n (608 keys × 2) |
| **Backend** | Node 18+ · Express 4 · Mongoose · Socket.io · JWT (access + rotating refresh) · zero-dep TOTP · Nodemailer · Vitest + Supertest |
| **Infra** | Docker Compose (dev + prod) · GitHub Actions CI · pluggable storage (disk / any S3-compatible) |

## 🚀 Quick start

### Local development

```bash
# 1 — Backend  (http://localhost:5000)
cd Backend
cp .env.example .env          # defaults work out of the box for local dev
npm install
npm run seed:demo             # 16 users · 25 tickets · 10 companies · 11 KB articles
npm run dev

# 2 — Frontend (http://localhost:5173)
cd ../frontend/it-help-desk
npm install
npm run dev
```

> Requires a MongoDB instance (`mongodb://localhost:27017` by default — change `DB_URL` in `.env`).

### Docker

```bash
docker compose up -d --build
docker compose exec backend npm run seed:demo   # first run only
```

### Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@jameel-it.com` | `password123` |
| **Agent** | `agent.laila@example.com` | `Demo@1234` |
| **Employee** | `omar.khaled@example.com` | `Demo@1234` |

> ⚠️ Change all three (plus JWT secrets) before any real deployment — production boot **refuses placeholder secrets**.

## 🔌 API

- Live docs: `GET /api/docs` (OpenAPI 3 spec) and `GET /api/docs-ui` (Swagger UI)
- Every route is versioned twice: `/api/...` and `/api/v1/...`
- Highlights: auth (login/register/refresh/MFA/verify), tickets (filters, bulk, CSV export), comments (public + internal notes), KB (search, votes), companies, canned responses, notifications, inbound email webhook

## 🧪 Testing & CI

```bash
cd Backend && npm test          # 140 tests — no local MongoDB needed (in-memory)
cd Backend && npm run lint      # ESLint 9 flat config — 0 errors
cd frontend/it-help-desk && npm run lint && npm run build
```

CI (`.github/workflows/ci.yml`) runs on every push/PR: **backend lint + tests → frontend lint + build → docker image builds**. No repo secrets required — tests boot their own throwaway MongoDB.

## 📂 Project structure

```
.
├── Backend/
│   ├── app.js                  # Express bootstrap + middleware chain
│   ├── config/                 # env validation (fails fast on bad config)
│   ├── controller/             # request handlers (tickets, auth, KB, ...)
│   ├── middleware/             # auth, RBAC, errors, validation
│   ├── models/                 # 10 Mongoose schemas + atomic counters
│   ├── routes/                 # REST routing (/api and /api/v1)
│   ├── services/               # SLA monitor, sockets, email, storage (disk/S3)
│   ├── seedUsers.js            # 16 demo users across the 3 roles
│   ├── seedDemo.js             # 25 tickets, companies, KB, canned, notifications
│   └── tests/                  # 140 Vitest unit + integration tests
├── frontend/it-help-desk/
│   ├── src/pages/              # role-aware routes (dashboard, queue, home, ...)
│   ├── src/components/         # layout, tickets, dashboard, shared UI
│   ├── src/i18n/               # AR / EN dictionaries (608 keys each)
│   └── src/                    # contexts (auth, theme, lang), api client
├── docs/screenshots/           # the images in this README
├── docker-compose.yml          # mongo + backend + frontend
└── .github/workflows/ci.yml    # lint → test → build → docker
```

## 🔐 Security notes

- **Env validation with fail-fast** — production boot rejects placeholder/weak JWT secrets and secrets that match each other
- Rotating refresh tokens with **reuse detection** (stolen-token kill switch)
- Brute-force lockout (5 attempts / 15 min) + separate stricter auth rate-limit window
- Anti-enumeration: duplicate registration returns an identical success response
- Uploads: extension + MIME + **magic-byte** validation, UUID filenames, authenticated downloads, forced `Content-Disposition`
- CSV export neutralizes formula injection (`=`, `+`, `-`, `@`, TAB, CR)
- Helmet, CORS allowlist, HPP, mongo-sanitize, request IDs on every response

## 🌍 Bilingual & RTL

The UI ships **Arabic-first with complete RTL** and toggles to English/LTR instantly from the navbar:

- The correct Bootstrap build (LTR or RTL) is chosen **before first paint** — no layout flash, ever
- Cairo font for Arabic; logical CSS properties (`margin-inline`, `padding-block`) everywhere
- Direction-aware sidebar drawer, toasts, chart axes, table sorting indicators and select chevrons
- 608-key dictionaries in **perfect AR↔EN parity** (enforced by a parity script)
- Localized relative timestamps, dates and numbers

## 📄 License & attribution

[MIT](./LICENSE) — free to use, learn from, and build upon.

**Forking & modifying this project? You're welcome — just keep the attribution.**
The [NOTICE](./NOTICE) file explains what the MIT license requires you to keep:
the LICENSE + NOTICE files, the per-file `/*! … */` source headers, and the
embedded signature marks (`JMLIT-…`) that live in the API response headers,
the web-app console, the built JS/CSS bundles and the Docker image labels.
They don't affect functionality in any way — they exist so authorship stays
traceable. Building on this repo with the notices intact is explicitly welcomed 🤝

## 👤 Author

<div align="center">

**Mohammed Jameel** — Full-Stack Developer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/imohammedjameel/)
[![Portfolio](https://img.shields.io/badge/Portfolio-visit-6C2BD9?style=for-the-badge&logo=github&logoColor=white)](https://imohammedjameel.github.io/)

*Building products that speak the user's language — literally.* 🌍

</div>

---

<div dir="rtl" align="center">

### بالعربي 🇪🇬

منصة دعم فني متكاملة (Full-Stack) لنظام التذاكر — عربية أولًا بتنسيق **RTL كامل** مع تبديل فوري للإنجليزية.
الموظف بفتح تذكرة، الأجنت بيتابعها لحظيًا (Socket.io)، والأدمن عنده لوحة تحليلات كاملة.
فيها محرك SLA بيحسب ساعات العمل، تحقق خطوتين (TOTP)، صلاحيات لثلاث أدوار، و140 اختبار آلي —
كل الكود والاختبارات قدامك هنا 🙌

**👨‍💻 صُنع بواسطة [محمد جميل](https://imohammedjameel.github.io/)** ·
[LinkedIn](https://www.linkedin.com/in/imohammedjameel/) ·
[البورتفوليو](https://imohammedjameel.github.io/)

</div>
