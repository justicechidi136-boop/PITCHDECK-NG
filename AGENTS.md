# AGENTS.md

Guidance for AI agents and contributors working in the PitchDeck Nigeria monorepo.

## Mission

Build a national platform connecting Nigerian innovators with sponsors across government, corporate, investment, academic, NGO, and diaspora ecosystems.

## Current milestone

**Platform foundation only.** Do not implement product features beyond shells and infrastructure unless explicitly requested.

## Repository map

| Path | Purpose |
| ---- | ------- |
| `apps/web` | Public-facing Next.js app |
| `apps/admin-web` | Admin Next.js app with `(protected)` route group |
| `apps/api` | NestJS API with `/v1` prefix |
| `packages/database` | Prisma schema, migrations, seeds |
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

1. Authentication and RBAC integration
2. Pitch submission domain models and workflows
3. Sponsor discovery and matching
4. Notification and messaging infrastructure
5. File uploads via MinIO/S3
