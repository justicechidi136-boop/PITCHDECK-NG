# Product Requirements — Platform Foundation

## Vision

PitchDeck Nigeria is a national innovation bridge connecting creators with sponsors, investors, institutions, and diaspora partners.

## Target users

- Innovators, startups, students, researchers, inventors, community organisations
- Government agencies and public institutions
- Corporate organisations and enterprises
- Angel investors, VC firms, philanthropists
- NGOs, universities, incubators
- Nigerian diaspora sponsors

## Foundation scope (current release)

### Public web (`apps/web`)

- Responsive landing page with Nigerian innovation identity
- Primary CTAs: Submit Your Idea, Discover Innovations
- Sector preview, how-it-works, sponsor CTA
- Auth route placeholders (no fake login)
- Accessible loading, error, and not-found pages
- Light/dark themes via central design tokens

### Admin web (`apps/admin-web`)

- Secure-layout placeholder under `(protected)` route group
- Sidebar navigation for operational modules
- Dashboard overview placeholders
- Clear indication that auth integration is pending

### API (`apps/api`)

- Global `/v1` prefix
- Structured config and env validation
- Global exception handling and request IDs
- Structured logging (Pino)
- Swagger in non-production
- Health, liveness, and readiness endpoints
- Readiness checks for PostgreSQL and Redis

### Data (`packages/database`)

Core reference models only:

- User, Role, UserRole
- State (37 entries: 36 states + FCT)
- Sector (16 innovation sectors)
- AuditLog

Seed script must be idempotent.

## Explicitly out of scope

- Authentication providers and session management
- Pitch submission, review, and scoring
- Sponsorship matching and funding disbursement
- Payments and billing
- Messaging and notifications
- Challenges and competitions

## Non-functional requirements

- Node.js 22 LTS
- TypeScript strict mode
- No secrets in repository
- CI on pull requests: install, generate, lint, typecheck, test, build
- Accessible UI components with semantic markup

## Success criteria

1. Monorepo installs and builds on a clean machine
2. Docker services start with health checks
3. API readiness reflects PostgreSQL/Redis availability
4. Seed data loads consistently
5. Web and admin shells render with smoke tests passing
