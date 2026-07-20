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

## Stage 3 — Innovator profiles

Requires INNOVATOR role. All mutating routes require CSRF.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/innovator/profile` | Get current profile (null if unset) |
| PUT/PATCH | `/innovator/profile` | Create or update profile |
| GET | `/innovator/profile/completeness` | Server-side completion scoring |

## Stage 3 — Pitches

Requires INNOVATOR role and pitch ownership.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/pitches` | List own pitches |
| POST | `/pitches` | Create draft |
| GET | `/pitches/:pitchId` | Get pitch (owner only) |
| PATCH | `/pitches/:pitchId` | Update draft (optimistic lock) |
| DELETE | `/pitches/:pitchId` | Delete unsaved draft |
| GET | `/pitches/:pitchId/completeness` | Submission readiness |
| POST | `/pitches/:pitchId/submit` | Submit for review |
| POST | `/pitches/:pitchId/withdraw` | Withdraw submission |
| POST | `/pitches/:pitchId/resubmit` | Resubmit after changes requested |
| GET | `/pitches/:pitchId/submissions` | List submission versions |
| GET | `/pitches/:pitchId/submissions/:version` | Get submission snapshot |

## Stage 3 — Sponsor organisations

Requires SPONSOR role and organisation membership.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/sponsor-organizations` | List member organisations |
| POST | `/sponsor-organizations` | Create organisation (caller becomes owner) |
| GET | `/sponsor-organizations/:id` | Get organisation |
| PATCH | `/sponsor-organizations/:id` | Update draft organisation |
| GET | `/sponsor-organizations/:id/members` | List members |
| POST | `/sponsor-organizations/:id/members` | Add member (admin+) |
| DELETE | `/sponsor-organizations/:id/members/:membershipId` | Remove member |
| GET | `/sponsor-organizations/:id/verification` | Verification status/history |
| POST | `/sponsor-organizations/:id/verification/submit` | Submit for admin review |

## Stage 3 — Files

Authenticated upload flow via MinIO presigned URLs.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/files/upload-intents` | Create upload intent |
| POST | `/files/:fileId/complete` | Finalise upload and scan |
| GET | `/files/:fileId` | File metadata |
| GET | `/files/:fileId/download-url` | Signed download URL |
| DELETE | `/files/:fileId` | Delete owned file |

## Stage 3 — Discovery

Requires verified sponsor organisation membership.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/discovery/pitches` | Search approved pitches |
| GET | `/discovery/pitches/:pitchId` | Approved pitch detail |

## Stage 3 — Reviewer

Requires REVIEWER role.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/reviewer/assignments` | List assignments |
| GET | `/reviewer/assignments/:id` | Assignment detail + snapshot |
| POST | `/reviewer/assignments/:id/accept` | Accept assignment |
| POST | `/reviewer/assignments/:id/decline` | Decline assignment |
| POST | `/reviewer/assignments/:id/conflict` | Declare conflict status |
| POST | `/reviewer/assignments/:id/review` | Submit structured review |

## Stage 3 — Admin pitches & sponsor verification

State-scoped admin access preserved from Stage 2.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/admin/pitches` | List pitches (filtered) |
| GET | `/admin/pitches/:pitchId` | Pitch detail + workflow |
| POST | `/admin/pitches/:pitchId/start-review` | Move to under review |
| POST | `/admin/pitches/:pitchId/reviewers` | Assign reviewer |
| DELETE | `/admin/pitches/:pitchId/reviewers/:assignmentId` | Revoke assignment |
| POST | `/admin/pitches/:pitchId/request-changes` | Request changes |
| POST | `/admin/pitches/:pitchId/approve` | Approve pitch |
| POST | `/admin/pitches/:pitchId/reject` | Reject pitch |
| POST | `/admin/pitches/:pitchId/reopen` | Reopen for review |
| POST | `/admin/pitches/:pitchId/suspend-discovery` | Suspend from discovery |
| GET | `/admin/sponsor-organizations` | List organisations |
| GET | `/admin/sponsor-organizations/:id` | Organisation detail |
| POST | `/admin/sponsor-organizations/:id/start-review` | Start verification review |
| POST | `/admin/sponsor-organizations/:id/request-changes` | Request changes |
| POST | `/admin/sponsor-organizations/:id/verify` | Verify organisation |
| POST | `/admin/sponsor-organizations/:id/reject` | Reject verification |
| POST | `/admin/sponsor-organizations/:id/suspend` | Suspend organisation |

## Stage 3 — Innovator profiles and pitches

Requires authenticated INNOVATOR role. Mutating requests need CSRF + Origin.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/innovator/profile` | Get innovator profile |
| PUT/PATCH | `/innovator/profile` | Create or update profile |
| GET | `/innovator/profile/completeness` | Profile completion scoring |
| GET | `/pitches` | List own pitches |
| POST | `/pitches` | Create draft pitch |
| GET | `/pitches/:pitchId` | Get pitch (owner only) |
| PATCH | `/pitches/:pitchId` | Update draft (optimistic lock) |
| DELETE | `/pitches/:pitchId` | Delete unsaved draft |
| GET | `/pitches/:pitchId/completeness` | Pitch readiness check |
| POST | `/pitches/:pitchId/submit` | Submit for review |
| POST | `/pitches/:pitchId/withdraw` | Withdraw submission |
| POST | `/pitches/:pitchId/resubmit` | Resubmit after changes requested |
| GET | `/pitches/:pitchId/submissions` | List submission versions |
| GET | `/pitches/:pitchId/submissions/:version` | Get submission snapshot |

## Stage 3 — Sponsor organisations

Requires authenticated SPONSOR role.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/sponsor-organizations` | List member organisations |
| POST | `/sponsor-organizations` | Create organisation (caller becomes owner) |
| GET | `/sponsor-organizations/:id` | Get organisation |
| PATCH | `/sponsor-organizations/:id` | Update draft organisation |
| GET | `/sponsor-organizations/:id/members` | List members |
| POST | `/sponsor-organizations/:id/members` | Add member (admin+) |
| DELETE | `/sponsor-organizations/:id/members/:membershipId` | Remove member |
| GET | `/sponsor-organizations/:id/verification` | Verification status/history |
| POST | `/sponsor-organizations/:id/verification/submit` | Submit for verification |

## Stage 3 — Files and discovery

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/files/upload-intents` | Required | Create presigned upload intent |
| POST | `/files/:fileId/complete` | Required | Finalise upload and scan |
| GET | `/files/:fileId` | Required | File metadata |
| GET | `/files/:fileId/download-url` | Required | Signed download URL |
| DELETE | `/files/:fileId` | Required | Delete owned file |
| GET | `/discovery/pitches` | Verified sponsor | Browse approved pitches |
| GET | `/discovery/pitches/:pitchId` | Verified sponsor | Pitch detail |

## Stage 3 — Reviewer workflow

Requires REVIEWER role.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/reviewer/assignments` | List assignments |
| GET | `/reviewer/assignments/:id` | Assignment + submission snapshot |
| POST | `/reviewer/assignments/:id/accept` | Accept assignment |
| POST | `/reviewer/assignments/:id/decline` | Decline assignment |
| POST | `/reviewer/assignments/:id/conflict` | Declare conflict of interest |
| POST | `/reviewer/assignments/:id/review` | Submit structured review |

## Stage 3 — Admin moderation

State-scoped admin access preserved from Stage 2.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/admin/pitches` | List pitches (filter by status/state) |
| GET | `/admin/pitches/:pitchId` | Pitch detail + workflow |
| POST | `/admin/pitches/:pitchId/start-review` | Move to under review |
| POST | `/admin/pitches/:pitchId/reviewers` | Assign reviewer |
| DELETE | `/admin/pitches/:pitchId/reviewers/:assignmentId` | Revoke assignment |
| POST | `/admin/pitches/:pitchId/request-changes` | Request changes |
| POST | `/admin/pitches/:pitchId/approve` | Approve pitch |
| POST | `/admin/pitches/:pitchId/reject` | Reject pitch |
| POST | `/admin/pitches/:pitchId/reopen` | Reopen for review |
| POST | `/admin/pitches/:pitchId/suspend-discovery` | Suspend from discovery |
| GET | `/admin/sponsor-organizations` | List sponsor orgs |
| GET | `/admin/sponsor-organizations/:id` | Organisation detail |
| POST | `/admin/sponsor-organizations/:id/start-review` | Start verification review |
| POST | `/admin/sponsor-organizations/:id/request-changes` | Request changes |
| POST | `/admin/sponsor-organizations/:id/verify` | Verify organisation |
| POST | `/admin/sponsor-organizations/:id/reject` | Reject verification |
| POST | `/admin/sponsor-organizations/:id/suspend` | Suspend organisation |

## Stage 3 security repairs

- Stage 3 endpoints use strict shared Zod schemas for request bodies and filters. Unknown properties, invalid UUID parameters, invalid enum values, oversized text, malformed money values, missing lock versions, invalid review score shapes, invalid membership roles, invalid workflow reasons, and page sizes over 50 are rejected.
- Nested Stage 3 mutations verify that child IDs belong to the supplied parent route. Cross-organisation membership IDs and cross-pitch reviewer assignment IDs return safe errors and do not mutate the child resource.
- Upload finalization validates actual object size, detects MIME type from bounded leading bytes, and scans only after the byte signature matches the document-purpose allowlist.
- `GET /discovery/pitches/:pitchId` retrieves the approved immutable submission directly and does not call list pagination.
- `apps/api/test/stage3-security.integration.spec.ts` covers the repaired authorization and validation boundaries.

## Object storage and scanning

- Uploads use MinIO/S3 presigned URLs (`OBJECT_STORAGE_*` env vars)
- Flow: upload intent → client PUT → complete → HEAD validation → ClamAV INSTREAM scan → `AVAILABLE`
- `FILE_SCAN_MODE`: `mock` (local dev only), `clamav` (production and acceptance), `disabled` (fail-closed)
- ClamAV runs in Docker Compose on port 3310 (`CLAMAV_HOST`, `CLAMAV_PORT`)
- Upload intent response: `{ fileId, uploadUrl, expiresAt, maxBytes }` — do not log signed URLs
- Complete response: `{ id, uploadStatus, scanStatus, ... }` — `AVAILABLE` + `CLEAN` required for download
- Download URL response: `{ url, expiresIn }` — short-lived signed GET
