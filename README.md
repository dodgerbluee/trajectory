# Trajectory

Self-hosted, privacy-first app for tracking children's health data: growth, visits, illnesses, vaccines, and documents. For families and homelab users who want to keep this data on their own infrastructure.

**Who it's for:** Parents and caregivers who self-host. Data stays on your server; no cloud account required. You create the first user and manage access via families (one family per household today; multi-user sharing is in progress).

---

## Privacy and data ownership

- **Your data stays with you.** All data is stored in your own database and file storage. The app does not send health data to any third party.
- **This app does not phone home.** No analytics, telemetry, or usage tracking. No external calls except what you configure (e.g. optional email for password reset).
- **Data belongs to you.** As the self-hosted operator, you control the data. Back up your database and volumes; see [DEPLOYMENT.md](./DEPLOYMENT.md) for a backup approach. Export and restore tooling are planned.

---

## Boundaries (important)

- **Not medical advice.** Trajectory is a record-keeping tool only. It does not provide medical advice, diagnosis, or treatment. Always rely on qualified healthcare providers for medical decisions.
- **Self-hosted only.** You install and run the app. There is no hosted service run by the project.
- **No telemetry.** The software does not collect or report usage data. If that changes in the future, it would be opt-in and documented.
- **Compliance (COPPA / GDPR):** As the self-hosted operator, you are the data controller. You are responsible for complying with applicable laws (e.g. COPPA, GDPR) where you and your users are located. The app does not process or transfer data to third parties; you control where data is stored and how it is backed up.

---

## Security

- **Authentication:** Passwords hashed with bcrypt. Rate limiting and lockouts on login and password reset. JWT access and refresh tokens; no default admin account—you register the first user.
- **Authorization:** Data is scoped by family. Only users in a child's family can see that child's data. All sensitive API endpoints require authentication and family checks.
- **Deployment:** Run behind HTTPS in production. Use a reverse proxy (e.g. Nginx, Caddy, Nginx Proxy Manager) for TLS; the app does not terminate TLS. Secrets (database URL, JWT secrets) via environment variables; see `.env.example` and [DEPLOYMENT.md](./DEPLOYMENT.md).
- **What this app does not do:** It does not encrypt data at rest (relies on your disk/volume security). It does not enforce TLS (your reverse proxy must). It does not provide a formal threat model document yet.
- **Data in logs:** In production (`NODE_ENV=production`), the app does not log request bodies or other plaintext health data. Set `NODE_ENV=production` in production.
- **Session tokens:** The app uses JWT access and refresh tokens in the `Authorization` header (Bearer). Tokens are not stored in cookies. Storage of tokens is the client's responsibility (e.g. memory or localStorage); use secure practices on the client.
- **CSRF:** State-changing APIs require the JWT in the `Authorization` header. There is no cookie-based session, so traditional CSRF (cross-site request forgery via cookies) does not apply. Same-origin or CORS policy should be configured appropriately.
- **XSS:** The frontend is React; React escapes text by default. Sensitive output paths should avoid `dangerouslySetInnerHTML`; the app does not use it for user content.

---

## Quick start

**Requirements:** Docker and Docker Compose.

1. Clone the repo and create env from example:
   ```bash
   cp .env.example .env
   ```
2. Set a strong `DB_PASSWORD` and, for production, set `JWT_SECRET` and `JWT_REFRESH_SECRET` (see `.env.example`).
3. Start:
   ```bash
   ./start.sh
   ```
   - App: http://localhost:3000 (dev) or use production compose (see below).
4. Open the app, register the first user, and start adding children.

**Production:** Use the production compose file and put the app behind HTTPS (reverse proxy). See [DEPLOYMENT.md](./DEPLOYMENT.md) for Portainer, Nginx Proxy Manager, backup, restore, upgrade, and rollback. See [VERSIONING.md](./VERSIONING.md) for versioning and release notes.

```bash
cp .env.prod.example .env
# Edit .env: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, IMAGE
docker-compose -f docker-compose.prod.yml up -d
```

Stop: `./stop.sh` (dev) or `docker-compose -f docker-compose.prod.yml down` (prod).

---

## License and support

- **License:** [Polyform Noncommercial 1.0.0](./LICENSE). Free for noncommercial use. You may not sell or commercially distribute the software. The copyright holder may offer paid features or commercial terms separately.
- **Docs:** [DEPLOYMENT.md](./DEPLOYMENT.md) (production, backup, updates). [backend/README.md](./backend/README.md) and [frontend](./frontend) for development. Detailed docs (e.g. threat model, restore) are planned.
- **Security:** If you find a vulnerability, see [SECURITY.md](./SECURITY.md) when available; until then, report responsibly (e.g. private disclosure to the maintainers).

---

## Project layout

| Path | Description |
|------|-------------|
| `frontend/` | React + Vite UI |
| `backend/` | Express API (Node.js, TypeScript) |
| `database/` | PostgreSQL init script |
| `backend/migrations/` | Schema and migrations |

Scripts from repo root: `npm run install:all`, `npm run build`, `npm run lint`. See `backend/` and `frontend/` READMEs for more.

---

## Open Source Readiness Checklist

Items below are taken from the internal open-source readiness checklist. 

- **✅ Completed** = clearly satisfied by current code or docs. 
- **⚠️ Partial** = mentioned or partly addressed; needs more detail. 
- **❌ Missing** = not yet addressed. References point to the file or section that satisfies completed items.

### Data protection and privacy

| Item | Status | Reference / note |
|------|--------|------------------|
| No analytics or telemetry by default | ✅ Completed | No telemetry in codebase. |
| "This app does not phone home" stated | ✅ Completed | README, "Privacy and data ownership" and "Boundaries". |
| No sensitive data in logs (production) | ✅ Completed | `backend/src/middleware/error-logger.ts`: request body omitted in production; stack only in development. |
| Crash-safe logging (no secrets in responses) | ✅ Completed | Error handler returns generic messages; no raw stack or env in API responses. |
| HTTPS documented for production | ✅ Completed | README "Security" and "Quick start"; DEPLOYMENT.md reverse proxy. |
| Sensitive data encrypted at rest | ❌ Missing | Not implemented; relies on filesystem/volume. |
| Backup encryption documented | ❌ Missing | DEPLOYMENT.md describes backup; encryption of backups not documented. |
| TLS 1.2+ documented | ❌ Missing | Not documented. |
| Audit: no plaintext health data in URLs/errors | ⚠️ Partial | Generic error messages; no full audit of all URLs and error paths. |

### Authentication and authorization

| Item | Status | Reference / note |
|------|--------|------------------|
| Secure password hashing (bcrypt) | ✅ Completed | `backend/src/lib/auth.ts` (bcrypt, 12 rounds). |
| Brute-force protection (rate limiting, lockouts) | ✅ Completed | `backend/src/middleware/rate-limit.ts`; `failed_login_attempts`, `locked_until` in schema and auth routes. |
| Token expiration and refresh | ✅ Completed | Access 15m, refresh 7d; refresh flow in auth routes. |
| All sensitive endpoints protected | ✅ Completed | Children, visits, illnesses, measurements, attachments, avatars require auth and family-scoped access. |
| No admin-by-default APIs | ✅ Completed | No admin APIs; data scoped by family. |
| Password policy configurable | ❌ Missing | Hardcoded in `validatePasswordStrength()` (e.g. min 8 chars, complexity). |
| Session tokens (HttpOnly/SameSite) | ⚠️ Partial | JWT in `Authorization` header; no cookies. Not documented in README. |
| Clear role model (admin/parent/read-only) | ⚠️ Partial | Family `owner`/`member` only; no admin/parent/read-only roles. |
| Authorization tested at API level | ❌ Missing | No tests for "user A cannot access user B's child". |

### Multi-user and isolation

| Item | Status | Reference / note |
|------|--------|------------------|
| Kids' profiles strictly isolated | ✅ Completed | `backend/src/lib/family-access.ts`; children belong to families. |
| No cross-child data leakage | ✅ Completed | List/get filtered by `getAccessibleChildIds` / `canAccessChild`. |
| Safe defaults (least privilege) | ✅ Completed | One family per user; data visible only to family members. |
| Audit permissions (who can edit/view/delete) | ⚠️ Partial | `audit_events` for visit/illness changes; no separate permission-audit doc. |

### Deployment and configuration

| Item | Status | Reference / note |
|------|--------|------------------|
| One-command install (Docker/Compose) | ✅ Completed | README Quick start; `./start.sh`; `docker-compose.yml` and `docker-compose.prod.yml`. |
| No default credentials | ✅ Completed | Users register; `.env.example` placeholders only. |
| Secrets via environment variables | ✅ Completed | README, DEPLOYMENT.md, `.env.example` (DATABASE_URL, JWT_SECRET, etc.). |
| Runs as non-root | ✅ Completed | `backend/Dockerfile` (nodejs user, su-exec in entrypoint). |
| Minimal base image | ✅ Completed | `node:20-alpine`. |
| Health checks | ✅ Completed | `/health` endpoint; HEALTHCHECK in Dockerfile and compose. |
| Resource limits documented | ❌ Missing | Not in DEPLOYMENT or README. |
| Setup wizard / forced first-user flow | ❌ Missing | First user registers via UI; no wizard. |

### Input validation and hardening

| Item | Status | Reference / note |
|------|--------|------------------|
| Server-side validation for inputs | ✅ Completed | Validation middleware and route-level checks across backend routes. |
| SQL injection protection | ✅ Completed | Parameterized queries throughout backend. |
| File uploads: MIME, size, outside web root | ✅ Completed | `backend/src/routes/attachments.ts` (ALLOWED_MIME_TYPES, 10MB, files under `/app/uploads` and `/app/avatars` via API). |
| Output escaping / XSS | ⚠️ Partial | React escapes by default; no explicit doc or full audit. |
| CSRF protection documented | ⚠️ Partial | JWT in header; no cookie-based session. Not documented in README. |

### Backups, export, and data ownership

| Item | Status | Reference / note |
|------|--------|------------------|
| Backup strategy documented | ✅ Completed | DEPLOYMENT.md (e.g. backing up Postgres volume). |
| One-click full export | ✅ Done | Settings → "Export my data" (ZIP: JSON + HTML report + attachments). |
| Schema documentation for operators | ❌ Missing | Schema in `backend/migrations/schema.sql` and `database/init.sql`; no standalone operator-facing doc. |
| Restore process tested and documented | ❌ Missing | Restore not documented or tested. |
| Soft delete / purge | ❌ Missing | Hard deletes only. |

### Logging and auditing

| Item | Status | Reference / note |
|------|--------|------------------|
| Security-relevant events logged | ✅ Completed | `login_attempts` table; `audit_events` for visit/illness changes. |
| Audit trail per entity | ✅ Completed | History endpoints for visits and illnesses; `audit_events`. |
| Configurable log levels | ❌ Missing | No LOG_LEVEL or equivalent; console only. |

### Dependencies and supply chain

| Item | Status | Reference / note |
|------|--------|------------------|
| Dependencies pinned (lockfiles committed) | ✅ Completed | `package-lock.json` (root, backend, frontend) in repo. |
| Unmaintained/abandoned libraries audited | ❌ Missing | Not done. |
| Dependabot/Renovate | ❌ Missing | No config in `.github`. |
| Reproducible builds / checksums | ❌ Missing | Build steps in README; no formal doc or checksums. |
| Signed releases | ❌ Missing | Not implemented. |

### Documentation and trust

| Item | Status | Reference / note |
|------|--------|------------------|
| Installation guide | ✅ Completed | README Quick start; DEPLOYMENT.md. |
| README: threat model / "does not protect against" | ✅ Completed | README "Security" and "What this app does not do". |
| Upgrade path mentioned | ⚠️ Partial | DEPLOYMENT.md (update stack, image tags); no dedicated upgrade guide. |
| Backup & restore guide | ⚠️ Partial | Backup in DEPLOYMENT.md; restore not step-by-step. |
| SECURITY.md (reporting, disclosure) | ❌ Missing | No SECURITY.md. |
| Versioning policy (e.g. SemVer) | ❌ Missing | No versioning policy doc. |
| Changelog / release notes | ❌ Missing | No CHANGELOG. |

### Legal and ethical

| Item | Status | Reference / note |
|------|--------|------------------|
| License chosen and in repo | ✅ Completed | [LICENSE](./LICENSE) (Polyform Noncommercial 1.0.0); package.json `license` field. |
| "Not medical advice" disclaimer | ✅ Completed | README "Boundaries (important)". |
| Data ownership statement | ✅ Completed | README "Privacy and data ownership" and "Data belongs to you". |
| COPPA/GDPR considerations documented | ❌ Missing | Not documented. |

### Testing and homelab

| Item | Status | Reference / note |
|------|--------|------------------|
| Unit tests for core logic | ✅ Completed | `backend/src/lib/__tests__/`, `backend/src/routes/__tests__/` (e.g. audit, field-diff, visits). |
| Fresh install tested | ✅ Completed | Docker-based; manual testing. |
| Works behind reverse proxy | ✅ Completed | DEPLOYMENT.md (Nginx Proxy Manager, etc.). |
| Clear upgrade path (no data loss) | ✅ Completed | Migrations; DEPLOYMENT update steps. |
| Integration tests (auth/permissions) | ❌ Missing | No API-level auth/permission tests. |
| Restore tested | ❌ Missing | Not tested. |
| Load tested | ❌ Missing | Not done. |
| IPv6 / timezone / clock drift | ❌ Missing | Not documented or tested. |

