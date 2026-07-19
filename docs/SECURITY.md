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

## Dependency services

Local Docker credentials are for development only. Do not expose these ports publicly in shared networks.

## Deferred (Stage 2)

- OAuth/OIDC social login
- MFA / passkeys
- Phone OTP
