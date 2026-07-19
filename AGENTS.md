# AGENTS.md

Guidance for AI agents and contributors working in the PitchDeck Nigeria monorepo.

## Mission

Build a national platform connecting Nigerian innovators with sponsors across government, corporate, investment, academic, NGO, and diaspora ecosystems.

## Current milestone

**Authentication and scoped RBAC.** Secure email/password auth, session management, state-scoped admin boundaries, and audit logging are implemented. Product features beyond auth/admin shells remain deferred unless explicitly requested.

## Repository map

| Path | Purpose |
| ---- | ------- |
| `apps/web` | Public-facing Next.js app with auth screens |
| `apps/admin-web` | Admin Next.js app with protected routes and user management |
| `apps/api` | NestJS API with `/v1` prefix, auth, RBAC, rate limits |
| `packages/database` | Prisma schema, migrations, seeds, bootstrap script |
| `packages/contracts` | Shared types/enums safe for browser bundles |
| `packages/ui` | Shared accessible React components |
| `packages/config` | ESLint, TS, Tailwind, Prettier configs |
| `packages/testing` | Test factories and helpers |

## Development rules

1. Use **pnpm** via Corepack. On Windows, prefer `pnpm.cmd`.
2. Keep TypeScript **strict** — do not weaken compiler or lint rules.
3. Never commit secrets. Use `.env.example` placeholders.
4. Do not edit applied Prisma migrations.
5. Do not add fake auth or placeholder security flows.
6. Prefer shared packages over duplication.
7. Use `@pitchdeck/contracts` for cross-app enums and API envelopes.
8. Use `@pitchdeck/ui` for shared UI primitives and theme tokens.
9. API responses must use the shared success/error envelope from contracts.
10. Health endpoints must remain at `/v1/health`, `/v1/health/live`, `/v1/health/ready`.

## Auth bootstrap

Super-admin is created via `pnpm admin:bootstrap` (not seed). Requires `BOOTSTRAP_SUPER_ADMIN_*` env vars.

## Brand tokens

Central theme lives in `@pitchdeck/ui/theme` and CSS variables:

- Deep green: `#006B3C`
- Emerald: `#009A5A`
- Warm gold: `#F2B134`
- Dark background: `#0B1511`
- Light background: `#F7FAF8`

## Testing expectations

Before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm --filter @pitchdeck/api test:integration
pnpm build
```

## Next recommended milestones

1. Pitch submission domain models and workflows
2. Sponsor discovery and matching
3. Notification and messaging infrastructure
4. File uploads via MinIO/S3
5. OAuth/OIDC social login (deferred from Stage 2)
