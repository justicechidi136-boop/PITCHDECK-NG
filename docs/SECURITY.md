# Security

## Foundation security posture

This release establishes secure defaults and boundaries without implementing authentication.

## Secrets management

- Never commit `.env`, credentials, or private keys
- Use `.env.example` with non-production placeholders
- Rotate dev credentials before any shared environment deployment

## API security controls

- Helmet middleware for baseline HTTP headers
- CORS restricted to configured origins
- DTO validation via `class-validator` with whitelist/forbidNonWhitelisted
- Structured logging with authorization header redaction
- Global exception filter suppresses stack traces in production
- Request ID propagation via `x-request-id` header

## Data layer

- UUID primary keys
- AuditLog model reserved for future activity tracking
- Role enum defines RBAC types for future authorization integration

## Admin boundary

The admin app uses a `(protected)` route group as an integration seam. **No fake authentication is implemented.** Future auth middleware must guard this segment before production use.

## Dependency services

Local Docker credentials are for development only:

| Service | Default user/password |
| ------- | --------------------- |
| PostgreSQL | `pitchdeck` / `pitchdeck_dev` |
| Redis | password `pitchdeck_redis_dev` |
| MinIO | `pitchdeck_minio` / `pitchdeck_minio_dev` |

Do not expose these ports publicly in shared networks.

## Recommended next security milestones

1. Identity provider integration (OAuth/OIDC or enterprise SSO)
2. RBAC enforcement in API guards and admin middleware
3. Rate limiting and abuse protection
4. Secret scanning in CI
5. Dependency vulnerability monitoring
6. Audit log write paths for privileged actions
