# Trajectory

Self-hosted, privacy-first app for tracking children's health data: growth, visits, illnesses, vaccines, and documents. For families and homelab users who want to keep this data on their own infrastructure.

**Who it's for:** Parents and caregivers who self-host. Data stays on your server; no cloud account required. You create the first user and manage access via families (one family per household today; multi-user sharing is in progress).

---

## 📚 Documentation

For complete documentation, guides, and detailed information, please visit:

**[📖 https://dodgerbluee.github.io/trajectory-docs/](https://dodgerbluee.github.io/trajectory-docs/)**

This includes:
- **Quick Start** - Get up and running in minutes
- **Deployment Guide** - Production setup, backup, restore, and updates
- **User Guide** - Features, how-tos, and best practices
- **Security** - Threat model, authentication, and compliance information
- **Operations** - Monitoring, troubleshooting, and maintenance
- **FAQ** - Frequently asked questions

---

## Quick Links

| Resource | Link |
|----------|------|
| 📖 Full Documentation | [https://dodgerbluee.github.io/trajectory-docs/](https://dodgerbluee.github.io/trajectory-docs/) |
| 🚀 Quick Start Guide | [Quick Start](https://dodgerbluee.github.io/trajectory-docs/quick-start) |
| 🐳 Deployment Guide | [Deployment](https://dodgerbluee.github.io/trajectory-docs/deployment-docs) |
| 🔒 Security Info | [Security](https://dodgerbluee.github.io/trajectory-docs/security) |
| 💬 FAQ | [FAQ](https://dodgerbluee.github.io/trajectory-docs/faq) |
| 🐛 Report Issues | [GitHub Issues](https://github.com/dodgerbluee/trajectory/issues) |
| 📋 License | [Polyform Noncommercial 1.0.0](./LICENSE) |

---

## Project Layout

| Path | Description |
|------|-------------|
| `frontend/` | React + Vite UI |
| `backend/` | Express API (Node.js, TypeScript) |
| `database/` | PostgreSQL init script |
| `backend/migrations/` | Schema and migrations |

Scripts from repo root: `npm run install:all`, `npm run build`, `npm run lint`. See `backend/` and `frontend/` READMEs for development info.

---

## Development

**Development (run from source):** Use `docker-compose up` for backend + DB, or run backend and frontend separately; see [backend/README.md](./backend/README.md) and [frontend](./frontend).

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