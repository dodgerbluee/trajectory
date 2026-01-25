# Trajectory

Self-hosted growth and medical history tracking for kids. Track measurements, wellness and sick visits, illnesses, vaccines, and attachments.

## Quick start

```bash
./start.sh
```

Requires Docker and Docker Compose. The script creates `.env` from `.env.example` if needed, starts all services, and prints frontend/backend URLs.

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:3001/api  

Stop with `./stop.sh`. Use `docker-compose down -v` to remove data.

## Project layout

- `frontend/` — React + Vite app
- `backend/` — Express API (Node.js, TypeScript)
- `database/` — PostgreSQL schema (`init.sql`)

## Scripts (from repo root)

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install deps for root, backend, frontend |
| `npm run dev` | Run backend and frontend in dev mode |
| `npm run build` | Build backend and frontend |
| `npm run lint` | Lint backend and frontend |

See `backend/` and `frontend/` READMEs for service-specific commands.
