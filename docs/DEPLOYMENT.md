# Deployment

## Current status

The repository includes CI validation only. **No automatic production deployment** is configured.

## CI pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pull requests and pushes to `main`:

1. Corepack-enabled pnpm install (`--frozen-lockfile`)
2. Prisma client generation
3. Lint
4. Typecheck
5. Unit tests
6. API integration tests
7. Production builds

## Build artifacts

| App | Build command | Output |
| --- | ------------- | ------ |
| `@pitchdeck/web` | `pnpm --filter @pitchdeck/web build` | `.next/` |
| `@pitchdeck/admin-web` | `pnpm --filter @pitchdeck/admin-web build` | `.next/` |
| `@pitchdeck/api` | `pnpm --filter @pitchdeck/api build` | `dist/` |
| Shared packages | `pnpm build` (via Turbo) | `dist/` |

## Environment variables

Copy `.env.example` to `.env` for local development. Production environments require:

- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGINS`
- `NODE_ENV=production`
- `LOG_LEVEL` (recommended: `info` or `warn`)

## Database migrations

```bash
pnpm db:generate
pnpm --filter @pitchdeck/database migrate:deploy
pnpm db:seed
```

Run migrations before starting the API in any new environment.

## Suggested production topology

1. Managed PostgreSQL (e.g. Neon, RDS, Cloud SQL)
2. Managed Redis (e.g. Upstash, ElastiCache)
3. Object storage (S3-compatible â€” MinIO for local only)
4. API deployed as container or serverless function
5. Next.js apps deployed to Vercel or equivalent
6. Nginx or cloud load balancer terminating TLS

See `infrastructure/nginx/default.conf` for a starter reverse proxy layout.

## Health check integration

Configure load balancers to use:

- Liveness: `GET /v1/health/live` (always HTTP 200 while the process is running)
- Readiness: `GET /v1/health/ready` (HTTP 200 with `status: ready` when PostgreSQL and Redis are reachable; HTTP 503 with `status: not_ready` otherwise)

## Rollback strategy

- Keep previous API container/image available
- Run down migrations only when explicitly approved
- Promote previous Next.js deployment via hosting provider rollback

