# Trajectory

Self-hosted, privacy-first app for tracking children's health data: growth, visits, illnesses, vaccines, and documents. For families and homelab users who want to keep this data on their own infrastructure.

**Who it's for:** Parents and caregivers who self-host. Data stays on your server; no cloud account required. You create the first user and manage access via families (one family per household today; multi-user sharing is in progress).

---

## Privacy and data ownership

- **Your data stays with you.** All data is stored in your own database and file storage. The app does not send health data to any third party.
- **This app does not phone home.** No analytics, telemetry, or usage tracking. No external calls except what you configure (e.g. optional email for password reset).
- **Data belongs to you.** As the self-hosted operator, you control the data. Back up your database and volumes; see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for a backup approach. Export and restore tooling are planned.

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
- **Deployment:** Run behind HTTPS in production. Use a reverse proxy (e.g. Nginx, Caddy, Nginx Proxy Manager) for TLS; the app does not terminate TLS. Secrets (database URL, JWT secrets) via environment variables; see `.env.example` and [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).
- **What this app does not do:** It does not encrypt data at rest (relies on your disk/volume security). It does not enforce TLS (your reverse proxy must). It does not provide a formal threat model document yet.
- **Data in logs:** In production (`NODE_ENV=production`), the app does not log request bodies or other plaintext health data. Set `NODE_ENV=production` in production.
- **Session tokens:** The app uses JWT access and refresh tokens in the `Authorization` header (Bearer). Tokens are not stored in cookies. Storage of tokens is the client's responsibility (e.g. memory or localStorage); use secure practices on the client.
- **CSRF:** State-changing APIs require the JWT in the `Authorization` header. There is no cookie-based session, so traditional CSRF (cross-site request forgery via cookies) does not apply. Same-origin or CORS policy should be configured appropriately.
- **XSS:** The frontend is React; React escapes text by default. Sensitive output paths should avoid `dangerouslySetInnerHTML`; the app does not use it for user content.

---

## Quick start

**Requirements:** Docker and Docker Compose.

1. Clone the repo and create env from the production example:
   ```bash
   cp .env.prod.example .env
   ```
2. Edit `.env`: set a strong `DB_PASSWORD`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` (the app will not start in production with placeholder secrets); set `IMAGE` to your app image (e.g. from GitHub Container Registry).
3. Start the stack:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
4. Put the app behind HTTPS (reverse proxy). Open the app, register the first user, and start adding children.

For Portainer, Nginx Proxy Manager, backup, restore, upgrade, and rollback, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md). For versioning and release notes, see [docs/VERSIONING.md](./docs/VERSIONING.md).

**Development (run from source):** Use `docker-compose up` for backend + DB, or run backend and frontend separately; see [backend/README.md](./backend/README.md) and [frontend](./frontend).

**Stop:** `docker-compose -f docker-compose.prod.yml down`

---

## License and support

- **License:** [Polyform Noncommercial 1.0.0](./LICENSE). Free for noncommercial use. You may not sell or commercially distribute the software. The copyright holder may offer paid features or commercial terms separately.
- **Docs:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) (production, backup, updates). [backend/README.md](./backend/README.md) and [frontend](./frontend) for development. Detailed docs (e.g. threat model, restore) are planned.
- **Security:** If you find a vulnerability, see [docs/SECURITY.md](./docs/SECURITY.md); report responsibly (e.g. private disclosure to the maintainers).

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

## Repository Analytics

![Repobeats analytics](https://repobeats.axiom.co/api/embed/39986e2891a5d4afb63ddbb16135a45180d964a6.svg "Repobeats analytics image")

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=dodgerbluee/trajectory&type=Date)](https://star-history.com/#dodgerbluee/trajectory&Date)

---

## Contributors

Thank you to all the contributors who have helped make Trajectory better!

[![Contributors](https://contrib.rocks/image?repo=dodgerbluee/trajectory)](https://github.com/dodgerbluee/trajectory/graphs/contributors)

