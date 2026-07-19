# Product Requirements — Stage 2 (Authentication and RBAC)

## Vision

PitchDeck Nigeria is a national innovation bridge connecting creators with sponsors, investors, institutions, and diaspora partners.

## Stage 2 scope (current release)

### Public web (`apps/web`)

- Registration for INNOVATOR and SPONSOR roles with Nigerian state and terms acceptance
- Email verification before sign-in
- Login/logout with HttpOnly session cookies
- Password forgot/reset (non-enumerating)
- Account profile and active session management
- Accessible loading, error, and not-found pages
- Light/dark themes via central design tokens

### Admin web (`apps/admin-web`)

- Admin login for SUPER_ADMIN, NATIONAL_ADMIN, and STATE_ADMIN
- Protected dashboard and user management routes
- Role assignment UI (STATE_ADMIN requires state)
- State-scoped user visibility for state admins
- Access denied handling for non-admin authenticated users

### API (`apps/api`)

- Secure email/password authentication under `/v1/auth/*`
- CSRF and origin validation on mutating browser requests
- Refresh token rotation with reuse detection
- Redis-backed rate limits and audit logging
- Admin user/role management under `/v1/admin/users/*`
- Super-admin bootstrap via env vars (`pnpm admin:bootstrap`)

### Data (`packages/database`)

Auth and reference models:

- User (with state, terms acceptance, account status, verification timestamp)
- Role, RoleAssignment (global/country/state scopes)
- AuthSession, EmailVerificationToken, PasswordResetToken
- State (37 entries), Sector (16), AuditLog

Seed script is idempotent. Super admin is never seeded.

## Explicitly deferred (Stage 3+)

- Pitch submission, review, and scoring
- Sponsor discovery and matching
- OAuth/OIDC social login, MFA, phone OTP
- Payments and billing
- Messaging and notifications
- Challenges and competitions
- File uploads

## Non-functional requirements

- Node.js 22 LTS, TypeScript strict mode
- No secrets in repository
- CI: lint, typecheck, unit tests, API integration tests, build, Playwright E2E
- Accessible UI components with semantic markup
- E2E uses isolated users and email capture — no fake browser tokens

## Success criteria

1. Public registration → verification → login flow works end-to-end
2. Unverified and suspended accounts are blocked at login
3. Admin RBAC enforces role and state boundaries server-side
4. Super-admin bootstrap is idempotent and env-driven
5. Playwright E2E covers public auth and admin isolation scenarios
6. CI passes all quality gates including E2E
