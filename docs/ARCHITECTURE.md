# Architecture

## Overview

PitchDeck Nigeria uses a Turborepo monorepo with three applications and five shared packages.

```mermaid
flowchart TB
  subgraph clients [Client Applications]
    Web[apps/web]
    Admin[apps/admin-web]
  end

  subgraph backend [Backend]
    API[apps/api]
  end

  subgraph shared [Shared Packages]
    Contracts[packages/contracts]
    UI[packages/ui]
    DB[packages/database]
    Config[packages/config]
    Testing[packages/testing]
  end

  subgraph infra [Infrastructure]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    MinIO[(MinIO)]
  end

  Web --> Contracts
  Web --> UI
  Admin --> Contracts
  Admin --> UI
  API --> Contracts
  API --> DB
  DB --> PG
  API --> Redis
  Web --> API
  Admin --> API
  API --> MinIO
```

## Application boundaries

### `apps/web`

Public Next.js App Router application for innovators and sponsors.

- Marketing landing page and onboarding flows
- Registration with role, Nigerian state, and terms acceptance
- Login, email verification, password reset, account and session management
- Browser API client with CSRF preflight and `credentials: "include"`

Protected account routes redirect unauthenticated visitors to `/login` via client-side `/auth/me` checks.

### `apps/admin-web`

Next.js admin console with server-side protection on the `(protected)` route group.

- Admin login rejects non-admin roles
- Dashboard and user management screens
- Role assignment UI with state requirement for STATE_ADMIN
- Access denied page for authenticated non-admin users

### `apps/api`

NestJS service exposing versioned REST endpoints under `/v1`.

- Config module with Zod env validation
- Prisma for PostgreSQL, ioredis for Redis
- Global JWT + CSRF guards, response envelope, structured logging
- Auth module (register, login, refresh, sessions, verify, reset)
- Admin module (scoped user/role management)
- Email service with `log`, `smtp`, or in-memory `capture` provider

## Identity lifecycle

```mermaid
sequenceDiagram
  participant Browser
  participant Web as apps/web
  participant API as apps/api
  participant DB as PostgreSQL
  participant Mail as Email capture/SMTP

  Browser->>Web: POST /register
  Web->>API: POST /v1/auth/register (+ CSRF)
  API->>DB: Create user (PENDING_VERIFICATION)
  API->>Mail: Send verification link
  Browser->>Web: Open /verify-email?token=
  Web->>API: POST /v1/auth/email-verification/confirm
  API->>DB: Set emailVerifiedAt, ACTIVE
  Browser->>Web: POST /login
  Web->>API: POST /v1/auth/login (+ CSRF)
  API->>DB: Create AuthSession
  API-->>Browser: HttpOnly pd_access_token, pd_refresh_token, pd_csrf_token
  Browser->>API: GET /v1/auth/me (cookies)
```

1. **Registration** — Public users submit email, password, profile, role, state, and terms acceptance. Passwords are hashed with Argon2id.
2. **Verification** — Opaque single-use tokens stored hashed in `email_verification_tokens`. Unverified users cannot sign in.
3. **Login** — Valid credentials create a refresh session; access JWT and refresh token are set as HttpOnly cookies; CSRF token is readable by JavaScript.
4. **Refresh** — `POST /v1/auth/refresh` rotates refresh tokens. Reuse revokes the token family and is audit-logged.
5. **Logout** — Current session revoked; cookies cleared on `/auth/logout`.
6. **Password reset** — Forgot endpoint is non-enumerating; reset revokes all refresh sessions.

## Browser session flow

| Cookie | HttpOnly | Purpose |
| ------ | -------- | ------- |
| `pd_access_token` | yes | Short-lived JWT |
| `pd_refresh_token` | yes | Opaque refresh token |
| `pd_csrf_token` | no | CSRF double-submit value |

Mutating API requests from browsers must include `X-CSRF-Token` matching the CSRF cookie and originate from an allowed `Origin`.

## Authorization

| Role | Scope | Admin API |
| ---- | ----- | --------- |
| SUPER_ADMIN | Global | Full access |
| NATIONAL_ADMIN | Nigeria (NG) | Nationwide read |
| STATE_ADMIN | Single state | Users in assigned state only |
| INNOVATOR/SPONSOR/REVIEWER/MENTOR | Global (auth) | No admin endpoints |

State isolation applies to:

- Admin user list filtering (`user.stateId` and scoped role assignments)
- Direct `/admin/users/:id` access checks

Bootstrap super admin is created via `pnpm admin:bootstrap` (env vars, not seed).

## Supporting services

| Service | Role |
| ------- | ---- |
| PostgreSQL | Users, roles, sessions, tokens, audit logs, reference data, Stage 3 domain |
| Redis | Rate limits, future caching |
| MinIO | S3-compatible object storage for pitch and sponsor documents |
| ClamAV | Malware scanning for uploaded files (`FILE_SCAN_MODE=clamav`) |
| Email capture | E2E/dev-only in-memory mailbox at `/v1/test/emails` |

## Shared packages

| Package | Responsibility |
| ------- | -------------- |
| `@pitchdeck/contracts` | Enums, auth DTOs, API envelopes, Zod schemas |
| `@pitchdeck/database` | Prisma client, schema, migrations, seeds, bootstrap |
| `@pitchdeck/ui` | Accessible React components and theme tokens |
| `@pitchdeck/config` | ESLint, TS, Tailwind, Prettier presets |
| `@pitchdeck/testing` | Unit factories and Playwright/API E2E helpers |

## API response contract

All successful API responses:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

## Health checks

| Endpoint | Purpose |
| -------- | ------- |
| `GET /v1/health` | General status and uptime |
| `GET /v1/health/live` | Process liveness |
| `GET /v1/health/ready` | Dependency readiness (PostgreSQL, Redis) |

## File upload and scanning flow

1. Client requests `POST /v1/files/upload-intents` with purpose, MIME type, and size.
2. API creates a `FileAsset` record with a random object key and returns a presigned PUT URL.
3. Client uploads bytes directly to MinIO/S3.
4. Client calls `POST /v1/files/:fileId/complete`.
5. API performs a storage `HEAD` check, validates size and detected MIME type.
6. API streams the object to ClamAV via the INSTREAM protocol.
7. Clean files become `AVAILABLE`; infected or unscanned files remain rejected and cannot be downloaded.

Production requires `FILE_SCAN_MODE=clamav`. Mock mode auto-passes scans for local development only.

## Stage 3 security boundaries

Stage 3 controllers use strict shared Zod schemas for runtime request validation before service logic. Nested resource mutations must authorize both the supplied parent route ID and the actual child resource. This applies to sponsor memberships under organisations and reviewer assignments under pitches.

Discovery detail retrieval directly loads a single approved, non-suspended pitch with its approved immutable submission and maps it to the browser-safe discovery DTO. It does not call list pagination or consume the list-search rate limit.

## Local development topology

Docker Compose provides PostgreSQL, Redis, MinIO, and ClamAV on host-mapped ports 15432, 16379, 19000/19001, and 3310. Applications run on the host via `pnpm dev`.

Playwright E2E starts the API and target web app automatically; Docker must be running for database, Redis, MinIO, and ClamAV.

## Deployment notes

Production deployment guidance lives in [DEPLOYMENT.md](./DEPLOYMENT.md). Nginx config placeholder is in `infrastructure/nginx/default.conf`.
