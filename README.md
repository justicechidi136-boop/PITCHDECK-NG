# PitchDeck Nigeria

PitchDeck Nigeria connects young Nigerian innovators, startups, students, researchers, inventors, and community organisations with government agencies, corporate organisations, angel investors, VC firms, NGOs, universities, incubators, philanthropists, and Nigerian diaspora sponsors.

This repository contains the platform monorepo: public web, admin console, API, shared packages, local development services, authentication/RBAC (Stage 2), profiles and pitch workflow (Stage 3), and CI workflows.

## Tech stack

- Node.js 22 LTS
- pnpm (via Corepack)
- TypeScript (strict mode)
- Turborepo
- Next.js App Router (`apps/web`, `apps/admin-web`)
- NestJS (`apps/api`)
- PostgreSQL + Prisma ORM
- Redis
- MinIO (local S3-compatible storage)
- Docker Compose
- ESLint, Prettier, Jest, Supertest, Playwright, Zod

## Repository structure

```
apps/
  web/           Public innovator/sponsor platform
  admin-web/     Admin operations console
  api/           NestJS REST API
packages/
  database/      Prisma schema, migrations, seed scripts
  contracts/     Shared enums, API types, Zod validation
  ui/            Accessible shared UI components
  config/        Shared TS, ESLint, Tailwind, Prettier configs
  testing/       Test factories and E2E helpers
infrastructure/
  docker/        Local PostgreSQL, Redis, MinIO
  nginx/         Reverse proxy placeholder
docs/            Product, architecture, security, deployment docs
```

## Prerequisites

- Node.js 22+
- Corepack enabled
- Docker Desktop (for local PostgreSQL, Redis, MinIO)
- Windows users: use `pnpm.cmd` if PowerShell execution policy blocks `pnpm`

## Quick start (Windows)

```powershell
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm.cmd install
copy .env.example .env
pnpm.cmd docker:up
pnpm.cmd db:generate
pnpm.cmd db:migrate
pnpm.cmd db:seed
pnpm.cmd admin:bootstrap
pnpm.cmd dev
```

Set bootstrap credentials in `.env` before running `admin:bootstrap`:

```env
BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@example.test
BOOTSTRAP_SUPER_ADMIN_PASSWORD=securepassword12
```

## Quick start (macOS/Linux)

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm admin:bootstrap
pnpm dev
```

## Development URLs

| Service       | URL                              |
| ------------- | -------------------------------- |
| Web           | http://localhost:3000            |
| Admin Web     | http://localhost:3001          |
| API           | http://localhost:4000/v1         |
| Swagger       | http://localhost:4000/v1/docs    |
| MinIO Console | http://localhost:19001           |

## Stage 2 — Authentication and RBAC

Implemented in this milestone:

### Public registration and login (`apps/web`)

- `/register` — INNOVATOR/SPONSOR signup with Nigerian state and terms acceptance
- `/verify-email` — email verification (token link)
- `/login`, `/logout` — session cookies (HttpOnly access/refresh)
- `/forgot-password`, `/reset-password` — password reset without account enumeration
- `/account`, `/account/security` — profile and active session management

### Admin console (`apps/admin-web`)

- `/login` — admin-only sign in (SUPER_ADMIN, NATIONAL_ADMIN, STATE_ADMIN)
- Protected `/dashboard`, `/users`, `/users/[id]` with server-side guards
- Role assignment UI (state required for STATE_ADMIN)
- `/access-denied` for authenticated non-admin users

### API security (`apps/api`)

- CSRF double-submit cookie + `X-CSRF-Token` header
- Origin validation against `CORS_ORIGINS`
- Refresh token rotation with reuse detection
- Redis-backed rate limits
- Audit logging for sensitive actions
- State-scoped admin isolation (Lagos admin cannot access Rivers users)

### Bootstrap and admin creation

```powershell
pnpm.cmd admin:bootstrap
```

Creates the first super admin from env vars (never seeded). Additional admin users are created via `POST /v1/admin/users` (super admin only) with activation email.

### Email capture (dev/E2E only)

For automated tests and local verification without SMTP:

```env
EMAIL_PROVIDER=capture
ENABLE_TEST_ENDPOINTS=true
```

Captured messages are available at `GET /v1/test/emails?to=user@example.test`. Tokens are not written to application logs when using the capture provider.

### Environment variables (auth)

| Variable | Purpose |
| -------- | ------- |
| `AUTH_JWT_SECRET` | JWT signing secret (32+ chars) |
| `AUTH_CSRF_SECRET` | CSRF HMAC secret (32+ chars) |
| `AUTH_COOKIE_SECURE` | `true` in production |
| `CORS_ORIGINS` | Allowed browser origins |
| `WEB_BASE_URL` | Public app base URL for email links |
| `ADMIN_WEB_BASE_URL` | Admin app base URL |
| `EMAIL_PROVIDER` | `log`, `smtp`, or `capture` |
| `ENABLE_TEST_ENDPOINTS` | Enables `/v1/test/emails` (never in production) |
| `BOOTSTRAP_SUPER_ADMIN_*` | First super-admin credentials |

See [`.env.example`](./.env.example) for the full list.

## Common commands

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test:unit
pnpm.cmd --filter @pitchdeck/api test:integration
pnpm.cmd build
pnpm.cmd docker:down
```

## Playwright E2E

Install Chromium once:

```powershell
pnpm exec playwright install chromium
```

Ensure Docker, migrations, seed, and bootstrap are complete, then:

```powershell
pnpm.cmd --filter @pitchdeck/web test:e2e
pnpm.cmd --filter @pitchdeck/admin-web test:e2e
```

E2E runs use unique emails per test, isolated fixture users, the email capture helper (no tokens in logs), and API/database fixtures — never browser localStorage role manipulation.

## Stage 3 — Profiles, pitches, and sponsor verification

Implemented in this milestone:

### Innovator profiles (`apps/web`, `apps/api`)

- Profile create/update with sector, state, and completion scoring
- Server-side completion percentage for pitch readiness

### Sponsor organisations (`apps/web`, `apps/api`)

- Sponsor org registration, memberships, and role management
- Verification workflow with admin review and status transitions

### Pitch workflow (`apps/web`, `apps/api`)

- Draft pitches with autosave and validation
- Immutable submission with status lifecycle (draft → submitted → under review → approved/rejected)
- Reviewer assignments, conflict declarations, and structured reviews
- Admin pitch triage and moderation

### File uploads (`apps/api`)

- Secure MinIO/S3 uploads with presigned URLs
- Malware scanning abstraction before attachment to pitches or profiles

### Sponsor discovery (`apps/web`, `apps/api`)

- Verified sponsors can browse and filter approved pitches
- Discovery respects sponsor verification and pitch approval state

State-scoped admin isolation from Stage 2 is preserved throughout Stage 3.

See [docs/API.md](./docs/API.md) for Stage 3 endpoints.

## Deferred (Stage 4+)

- OAuth/OIDC social login, MFA, and phone OTP
- Payments and billing
- Messaging and notifications
- Challenges and competitions

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent and contributor guidance
- [docs/API.md](./docs/API.md) — Auth, admin, and Stage 3 endpoints
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [docs/SECURITY.md](./docs/SECURITY.md) — Security posture
- [docs/PRODUCT_REQUIREMENTS.md](./docs/PRODUCT_REQUIREMENTS.md) — Product scope
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Deployment notes

## License

Proprietary — PitchDeck Nigeria.
