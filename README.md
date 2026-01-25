# Trajectory

Self-hosted growth and medical history tracking for kids. Track measurements, wellness and sick visits, illnesses, vaccines, and attachments.

## Quick start

### Development Setup (Unified Container)

```bash
./start.sh
```

Requires Docker and Docker Compose. The script creates `.env` from `.env.example` if needed, starts all services, and prints frontend/backend URLs.

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:3000/api  

Stop with `./stop.sh`. Use `docker-compose down -v` to remove data.

### Production Setup

For production deployments, use the production docker-compose file:

1. **Create production environment file:**
   ```bash
   cp .env.prod.example .env
   ```

2. **Edit `.env` and set a strong password:**
   ```bash
   DB_PASSWORD=your_strong_password_here
   POSTGRES_DB=trajectory
   POSTGRES_USER=trajectory_user
   ```

3. **Start with production compose file:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Access the application:**
   - **App (UI + API):** http://localhost:3001
   - **Frontend UI:** http://localhost:3001/
   - **Backend API:** http://localhost:3001/api

5. **Stop the application:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

**Note:** The production setup uses a unified container that serves both frontend and backend from a single service. This is the recommended approach for production deployments. See [DEPLOYMENT.md](./DEPLOYMENT.md) for more deployment options including Nginx Proxy Manager setup.

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
