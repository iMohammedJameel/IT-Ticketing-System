# 🎫 IT Ticketing System

> A production-ready, full-stack MERN IT support platform with JWT auth (access + refresh tokens), real-time WebSocket notifications, file attachments, SLA monitoring, knowledge base, dark mode, Docker deployment, and automated tests.

[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📌 Overview

The IT Ticketing System is a full-stack web application that streamlines IT support operations. Employees submit and track support tickets; admins manage assignment, status, priority, SLA tracking, and analytics — replacing informal WhatsApp-based workflows with a structured, auditable platform.

### Key highlights

- 🔐 **Security-hardened**: JWT with HS256 pinning, refresh-token rotation with reuse detection, brute-force lockout, helmet, rate limiting, NoSQL injection prevention, file-upload magic-byte validation, HTML escaping in emails
- ⚡ **Real-time**: WebSocket-based live notifications + in-app notification center
- 📊 **Analytics**: Dashboard with monthly trends, status/priority/category breakdowns, top performers
- 🎨 **Modern UI**: Dark mode, accessible modals, code splitting, skeleton loaders, responsive design
- 🐳 **Production-ready**: Docker + docker-compose + nginx reverse proxy + Let's Encrypt SSL
- 🧪 **Tested**: 68 backend tests (Vitest) + Playwright E2E tests

---

## ✨ Features

### 👤 Employee Portal
- Register with email verification + login with JWT
- Submit tickets with **priority**, **category**, **file attachments**, and description
- Track ticket status in real time: `open` → `in-progress` → `resolved` → `closed`
- Add comments + view full audit history
- Update profile, change password, manage notification preferences
- Browse the Knowledge Base for self-service

### 🛠️ Admin Dashboard
- View all tickets with filtering (status, priority, category, company) + search + pagination
- Assign tickets, update status/priority, add internal admin notes
- Bulk actions: bulk status, bulk assign, bulk delete
- CSV export
- User management (suspend/activate/delete with re-auth verification)
- Knowledge base article management (CRUD)
- Activity feed showing recent system-wide changes
- Real-time analytics: counts, monthly trends, by-priority, by-category, top performers, SLA breaches

### 🔔 Real-Time
- WebSocket live notifications (ticket created/assigned/commented/status changed)
- SLA monitoring cron job (auto-detects breaching + breached tickets, deduped)
- In-app notification bell with unread count + cross-tab sync
- Email notifications via nodemailer (configurable per user preference)

### 🔐 Security
- JWT with HS256 algorithm pinning + token versioning (instant invalidation on logout/password change)
- **Refresh token rotation** with reuse detection (stolen tokens cause family revocation)
- Brute-force lockout (5 failed attempts → 15-min lock)
- `helmet` security headers + CSP in production
- `express-rate-limit` (global + stricter for auth endpoints)
- `express-mongo-sanitize` (NoSQL injection) + `hpp` (HTTP param pollution)
- Password complexity (min 8 chars + uppercase + lowercase + digit)
- User enumeration prevention
- Email verification + password reset tokens (hashed in DB)
- File upload validation: extension allowlist + magic-byte verification + MIME check + 10MB limit
- Authenticated attachment download with `Content-Disposition: attachment` (prevents stored XSS)
- HTML escaping in all email templates

### 🎨 UI/UX
- **Dark mode** with system preference detection
- **Code splitting** with `React.lazy` + `Suspense`
- **Toast notifications** via `sonner`
- **Loading skeletons** with shimmer animation
- **Accessible modals** (focus trap, ESC, ARIA roles)
- **Error boundary** at app level
- Form accessibility (label htmlFor, aria-invalid, aria-label)
- `prefers-reduced-motion` respect
- Mobile-responsive

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js 20 + Express | REST API server |
| MongoDB 7 + Mongoose | Database & ODM |
| JWT + bcrypt | Auth + password hashing |
| Joi | Input validation |
| Helmet | Security headers |
| express-rate-limit | Brute-force protection |
| express-mongo-sanitize | NoSQL injection prevention |
| Socket.io | Real-time WebSocket |
| Nodemailer | Email notifications |
| Multer | File upload handling |
| Morgan | HTTP logging |
| Compression | Response compression |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool |
| React Router v7 | Client-side routing |
| Axios | HTTP client (with refresh-token interceptor) |
| Recharts | Data visualization |
| Bootstrap 5 + CSS Modules | Styling |
| Socket.io-client | WebSocket client |
| Sonner | Toast notifications |

### DevOps & Testing
| Technology | Purpose |
|---|---|
| Docker + docker-compose | Containerization |
| nginx | Reverse proxy + SSL termination |
| Let's Encrypt (certbot) | SSL certificates |
| Vitest + supertest | Backend unit + integration tests |
| Playwright | End-to-end tests |
| mongodb-memory-server | In-memory MongoDB for tests |

---

## 📁 Project Structure

```
IT-Ticketing-System/
├── Backend/
│   ├── app.js                       # Entry — middleware, routes, DB, WebSocket, SLA monitor
│   ├── socket.js                    # WebSocket bootstrap (JWT auth + DB lookup)
│   ├── seedUsers.js                 # DB seeder
│   ├── Dockerfile                   # Multi-stage build
│   ├── vitest.config.js             # Test config
│   ├── config/
│   │   └── env.js                   # Centralized env config + Joi validation
│   ├── models/                      # User, Ticket, Comment, Notification, KBArticle, Counter
│   ├── controller/                  # Auth, tickets, comments, notifications, KB, bulk, refresh
│   │   └── validation/              # Joi schemas
│   ├── middleware/                  # authMiddleware, errorMiddleware
│   ├── routes/                      # All route definitions
│   ├── services/                    # emailService, notificationService, tokenService, slaMonitor
│   ├── tests/                       # Vitest unit + integration tests
│   └── uploads/                     # File attachment storage (.gitkeep only)
├── Frontend/
│   ├── Dockerfile                   # Multi-stage build (Vite → nginx)
│   ├── playwright.config.js         # E2E test config
│   ├── deploy/nginx/frontend.conf   # nginx SPA config
│   ├── src/
│   │   ├── api.jsx                  # Axios instance + refresh-token interceptor
│   │   ├── App.jsx                  # Routes + providers + ErrorBoundary
│   │   ├── context/                 # AuthContext, ThemeContext, NotificationContext
│   │   ├── services/                # authService, ticketService, notificationService, kbService
│   │   ├── hooks/                   # useAsync, useDebounce, useMediaQuery, useLocalStorage
│   │   ├── components/
│   │   │   ├── common/              # ErrorBoundary, Modal, Skeleton, Spinner, EmptyState
│   │   │   ├── layout/              # Navbar, Sidebar, Footer
│   │   │   └── Dashboard/           # DashboardContent with charts
│   │   └── pages/                   # Login, Register, Auth, Dashboard, Tickets, TicketsList, Users, Settings, KB, Notifications
│   └── tests/e2e/                   # Playwright tests
├── deploy/
│   ├── nginx/it-ticketing.conf      # Production nginx config (SSL + security headers)
│   └── scripts/
│       ├── deploy.sh                # One-shot deployment script
│       └── obtain-ssl.sh            # Let's Encrypt SSL script
├── docker-compose.yml               # 3-service stack (mongo + backend + frontend)
├── .env.example                     # Template for environment variables
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ — [download](https://nodejs.org/)
- **MongoDB** v6+ — local install OR MongoDB Atlas (free tier) OR Docker
- (Optional) **Docker** + **docker-compose** for containerized deployment

### Option 1: Local Development (recommended for development)

#### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/it-ticketing-system.git
cd it-ticketing-system
```

#### 2. Setup Backend
```bash
cd Backend
npm install
cp .env.example .env
```

Edit `Backend/.env`:
```env
PORT=5000
NODE_ENV=development
DB_URL=mongodb://localhost:27017/it-ticketing
JWT_SECRET=generate_a_random_32_char_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=generate_another_random_32_char_string
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@1234
```

Generate JWT secrets:
```bash
openssl rand -hex 32
```

Seed the database:
```bash
npm run seed
```

Start the backend:
```bash
npm start
# Or with auto-reload: npm run dev
```

#### 3. Setup Frontend (in a new terminal)
```bash
cd ../Frontend
npm install
cp .env.example .env
npm run dev
```

#### 4. Open the app
Navigate to: **http://localhost:5173**

### Option 2: Docker Deployment (recommended for production)

```bash
# Copy and edit environment variables
cp .env.example .env
# Edit .env with real secrets (generate JWT secrets with: openssl rand -hex 32)

# Deploy
./deploy/scripts/deploy.sh

# Or manually:
docker compose up -d
docker compose exec backend npm run seed
```

Access at: **http://localhost:8080**

### Option 3: SSL/HTTPS Production Setup

```bash
# 1. Deploy with Docker (see Option 2)
# 2. Install the host nginx config
sudo cp deploy/nginx/it-ticketing.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/it-ticketing.conf /etc/nginx/sites-enabled/
# Edit the config: replace it-ticketing.example.com with your domain

# 3. Obtain SSL certificate
sudo ./deploy/scripts/obtain-ssl.sh your-domain.com

# 4. Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔑 Default Login Credentials

After running the seeder:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@example.com` | `Admin@1234` |
| **User** | `ahmed.hassan@example.com` | `Demo@1234` |

> ⚠️ **Change these immediately in production** by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file before seeding.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register (role forced to "user") |
| POST | `/api/auth/login` | Public | Login (returns access + refresh tokens) |
| POST | `/api/auth/refresh` | Public | Refresh access token (rotation) |
| POST | `/api/auth/logout` | Auth | Logout (invalidates all sessions) |
| GET | `/api/auth/me` | Auth | Get current user |
| PUT | `/api/auth/change-password` | Auth | Change password |
| PATCH | `/api/auth/profile` | Auth | Update name/email |
| PUT | `/api/auth/update-profile-image` | Auth | Update profile image |
| POST | `/api/auth/verify-password` | Auth | Re-auth verification |
| POST | `/api/auth/forgot-password` | Public | Request password reset email |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| POST | `/api/auth/verify-email` | Public | Verify email with token |
| POST | `/api/auth/resend-verification` | Auth | Resend verification email |
| GET | `/api/auth/users` | Admin | List users (paginated + searchable) |
| PATCH | `/api/auth/users/:id/toggle-status` | Admin | Suspend/activate user |
| DELETE | `/api/auth/users/:id` | Admin | Delete user (with cascade) |

### Tickets
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/tickets/stats` | Admin | Dashboard analytics |
| POST | `/api/tickets` | Auth | Create ticket (priority/category/SLA auto-set) |
| GET | `/api/tickets` | Auth | List tickets (paginated + search + filter) |
| GET | `/api/tickets/:id` | Auth | Get ticket by ID (with audit history) |
| PUT | `/api/tickets/:id` | Admin | Update ticket |
| PATCH | `/api/tickets/:id/status` | Admin | Update status (audit + SLA tracking) |
| PATCH | `/api/tickets/:id/priority` | Admin | Update priority (recomputes SLA) |
| PATCH | `/api/tickets/:id/assign` | Admin | Assign ticket |

### Comments / Attachments / Notifications / KB / Bulk
See the [full API documentation in the README](#) or browse `Backend/routes/`.

### Health
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Health check (excluded from rate limit) |

---

## 🧪 Testing

### Backend Tests (Vitest)
```bash
cd Backend
npm test                # Run all 68 tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

Test coverage:
- **Unit tests**: auth validation, ticket validation, email service (HTML escaping), token service
- **Integration tests**: full auth flow (register, login, logout, refresh, me, role stripping, email verification)

### Frontend E2E Tests (Playwright)
```bash
cd Frontend
npx playwright install  # First time only
npm run test:e2e        # Run all E2E tests
npm run test:e2e:ui     # Interactive UI mode
```

Test coverage:
- Authentication flow (login, logout, wrong password, redirect, role-based access)
- Ticket creation and listing
- UI features (dark mode, navigation, notifications, settings)

---

## 🐳 Docker Commands

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# Stop all services
docker compose down

# Stop and wipe all data (volumes included)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build

# Run database seed
docker compose exec backend npm run seed

# Run backend tests inside container
docker compose exec backend npm test
```

---

## 🔒 Security Highlights

1. **No self-registration as admin** — role is server-controlled
2. **Refresh token rotation** — each refresh consumes the old token, reuse triggers family revocation
3. **Brute-force protection** — 5 failed logins → 15-min lock
4. **Token versioning** — logout/password change instantly invalidates all tokens
5. **Suspended users blocked** — even with a valid token (checked on every request + WebSocket connection)
6. **NoSQL injection prevention** — `express-mongo-sanitize` + strict Joi validation
7. **JWT algorithm pinned** — HS256 only (prevents alg:none attacks)
8. **File upload safety** — extension allowlist + magic-byte verification + UUID filenames + authenticated download + force-download headers
9. **HTML escaping in emails** — prevents stored XSS in email clients
10. **Security headers** — helmet + CSP + HSTS + CORS whitelist + rate limit

---

## 📊 Pages Overview

| Page | Role | Description |
|---|---|---|
| Login / Register | Public | JWT auth with forgot-password + email verification |
| Forgot / Reset Password | Public | Password reset flow via email |
| Verify Email | Public | Email verification with token |
| Dashboard | Admin | Analytics, charts, SLA breaches, top performers |
| New Ticket | All | Submit ticket with priority/category/attachments |
| Tickets List | All | Paginated list + filters + bulk actions + CSV export |
| Users | Admin | Manage users (suspend/delete with re-auth) |
| Knowledge Base | All | Browse + search KB articles |
| Notifications | All | Full notification list + mark-read |
| Settings | All | Profile, password, job details, notification prefs |

---

## 🛠️ Available Scripts

### Backend
| Command | Description |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run seed` | Seed database with admin + sample users |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Frontend
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests in interactive UI mode |

---

## 🌍 Environment Variables

See `.env.example` files in the root, `Backend/`, and `Frontend/` directories for all available environment variables and their descriptions.

**Important**: Never commit `.env` files. Always use `.env.example` as a template.

---

## 📦 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Internet (https://your-domain.com)                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Host nginx (SSL)   │  ← deploy/nginx/it-ticketing.conf
              │  + Let's Encrypt    │
              │  + Security headers │
              │  + Rate limiting    │
              └──────────┬──────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐
   │  Frontend       │       │  Backend        │
   │  Container      │       │  Container      │
   │  (nginx + SPA)  │──────▶│  (Express +     │
   │  Port 8080      │  /api │   Socket.io)    │
   │                 │       │  Port 5000      │
   └─────────────────┘       └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  MongoDB        │
                            │  Container      │
                            │  Port 27017     │
                            │  (internal)     │
                            └─────────────────┘
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass: `npm test` (backend) + `npm run test:e2e` (frontend)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Mohammed Jameel Fouad**
- GitHub: [@iMohammedJameel](https://github.com/iMohammedJameel)
- LinkedIn: [linkedin.com/in/imohammedjameel](https://linkedin.com/in/imohammedjameel)

---

## 🙏 Acknowledgments

Built as part of the **Digilians** AI-Based Software Development Diploma — Egyptian Military Academy.
