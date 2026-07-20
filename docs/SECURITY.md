# Security

## Authentication posture

Stage 2 implements secure email/password authentication with scoped RBAC.

## Secrets management

- Never commit `.env`, credentials, or private keys
- Use `.env.example` with non-production placeholders
- Rotate dev credentials before any shared environment deployment
- Super-admin bootstrap uses env vars only (`pnpm admin:bootstrap`) — never seeded

## Password security

- Argon2id hashing with secure parameters
- Minimum 12, maximum 128 characters
- Passwords never logged or returned in API responses
- Password reset/change revokes all refresh sessions

## Token and session security

- JWT access tokens (~15 min), signed, HttpOnly cookies
- Opaque refresh tokens, SHA-256 hashed in database only
- Refresh rotation with reuse detection (family revocation + audit)
- Session metadata: IP, user agent, device description

## Browser security

- HttpOnly cookies for access/refresh tokens
- `Secure` flag required in production
- SameSite=Lax cookies
- CSRF: double-submit cookie + `X-CSRF-Token` header
- Origin validation against `CORS_ORIGINS` (not SameSite-only)

## RBAC

| Role | Scope | Admin API |
| ---- | ----- | --------- |
| SUPER_ADMIN | Global | Full access, user/role management |
| NATIONAL_ADMIN | Nigeria (NG) | Read users nationwide |
| STATE_ADMIN | Single state | Isolated to assigned state |
| REVIEWER/INNOVATOR/SPONSOR/MENTOR | Global (auth) | No admin endpoints |

- Cannot remove last super admin
- STATE_ADMIN requires state assignment; SUPER_ADMIN cannot be state-scoped

## Rate limiting

Redis-backed limits on registration, login, refresh, verification resend, password flows, admin user creation. No permanent lockout from failed logins.

## Audit logging

Sensitive actions logged to `AuditLog`. Tokens and passwords never stored in metadata.

## API security controls

- Helmet middleware for baseline HTTP headers
- CORS restricted to configured origins
- DTO validation via `class-validator`
- Structured logging with authorization/cookie redaction
- Global exception filter suppresses stack traces in production

## File upload security (Stage 3)

- Presigned URLs with short TTL (max 900s in production)
- Random object keys — no user identifiers in storage paths
- MIME allowlists per document purpose; detected MIME validated on finalize
- Size limits enforced at intent creation and after upload via HEAD
- ClamAV scanning required before files become `AVAILABLE`
- Fail-closed: scanner unavailable, timeout, or malware → file rejected
- Production env validation rejects `FILE_SCAN_MODE=mock` or `disabled`
- Download URLs require ownership, admin scope, or reviewer assignment
- Storage credentials and object keys never returned in discovery or pitch list APIs

## Dependency services

Local Docker credentials are for development only. Do not expose these ports publicly in shared networks.

## Stage 3 security repairs

- Stage 3 request bodies and query strings are validated at runtime with strict Zod schemas from `@pitchdeck/contracts`; unknown fields, invalid UUIDs, invalid enums, oversized strings, malformed money values, and excessive pagination are rejected before services reach Prisma.
- Nested Stage 3 mutations verify the child resource belongs to the supplied parent route. Sponsor membership removal is scoped to the target organisation, and reviewer revocation is scoped to the assignment's actual submission and pitch.
- Removed organisation admins cannot manage memberships. Revoked reviewer assignments no longer grant reviewer workflow access or file access.
- Upload finalization detects file type from bounded leading bytes, not filename, extension, browser MIME type, or object-storage `ContentType`. Format validation runs before ClamAV scanning.
- `apps/api/test/stage3-security.integration.spec.ts` covers cross-organisation membership IDs, cross-pitch reviewer assignment IDs, removed member access, revoked reviewer access, and Stage 3 validation failures.

## Deferred (Stage 4+)

- OAuth/OIDC social login
- MFA / passkeys
- Phone OTP
- Payments and billing
- Messaging and notifications
