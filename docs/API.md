# PitchDeck Nigeria API

Authentication and RBAC endpoints under `/v1`.

## Auth endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/auth/csrf` | Public | Obtain CSRF token (sets cookie) |
| POST | `/auth/register` | Public | Register INNOVATOR or SPONSOR (state + terms required) |
| POST | `/auth/login` | Public | Sign in (sets HttpOnly cookies) |
| POST | `/auth/refresh` | Public | Rotate refresh session |
| POST | `/auth/logout` | Required | Revoke current session |
| POST | `/auth/logout-all` | Required | Revoke all other sessions |
| GET | `/auth/me` | Required | Current user profile |
| GET | `/auth/sessions` | Required | List active sessions |
| DELETE | `/auth/sessions/:id` | Required | Revoke a session |
| POST | `/auth/email-verification/request` | Public | Resend verification email |
| POST | `/auth/email-verification/confirm` | Public | Confirm email token |
| POST | `/auth/password/forgot` | Public | Request password reset |
| POST | `/auth/password/reset` | Public | Reset password with token |

## Admin endpoints

Requires admin role (SUPER_ADMIN, NATIONAL_ADMIN, or STATE_ADMIN).

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/admin/users` | Admin | List users (state-scoped) |
| GET | `/admin/users/:id` | Admin | Get user details |
| POST | `/admin/users` | Super admin | Create user with activation link |
| PATCH | `/admin/users/:id/status` | Admin | Suspend/reactivate/deactivate |
| GET | `/admin/users/roles` | Admin | List available roles |
| POST | `/admin/users/:id/roles` | Admin | Assign role |
| DELETE | `/admin/users/:id/roles/:assignmentId` | Admin | Revoke role |

## Security

- Access tokens: JWT, 15-minute expiry, HttpOnly cookie
- Refresh tokens: opaque, SHA-256 hashed in DB, rotating with reuse detection
- CSRF: double-submit cookie + `X-CSRF-Token` header on mutating requests
- Origin validation against `CORS_ORIGINS`
- Rate limits via Redis on registration, login, refresh, password flows

## Bootstrap

```bash
pnpm admin:bootstrap
```

Requires `BOOTSTRAP_SUPER_ADMIN_EMAIL` and `BOOTSTRAP_SUPER_ADMIN_PASSWORD` in `.env`.

## Test helpers (non-production)

When `ENABLE_TEST_ENDPOINTS=true` and `EMAIL_PROVIDER=capture`:

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/test/emails?to=` | List captured emails for E2E |
| DELETE | `/test/emails` | Clear captured mailbox |
