# Backend

Express API for Trajectory. TypeScript, `pg` for Postgres.

## Routes

| Path | Description |
|------|-------------|
| `GET/POST /api/children` | List/create kids |
| `GET/PUT/DELETE /api/children/:id` | Single child |
| `GET/POST /api/visits` | List/create visits (wellness, sick, injury, vision) |
| `GET/PUT/DELETE /api/visits/:id` | Single visit |
| `GET/POST /api/illnesses` | List/create illnesses |
| `GET/PUT/DELETE /api/illnesses/:id` | Single illness |
| `GET /api/illnesses/metrics/heatmap` | Illness heatmap data |
| `GET/POST /api/children/:childId/measurements` | Growth measurements per child |
| `GET/POST /api/children/:childId/medical-events` | Medical events per child |
| `GET/POST /api/children/:childId/avatar` | Avatar upload |
| Attachments | Measurement, visit, and child attachment uploads/list/delete |

## Environment

Create a `.env` (or copy from `.env.example`). Used by both Docker and local dev:

- `DATABASE_URL` — Postgres connection string (e.g. `postgresql://trajectory_user:password@localhost:5432/trajectory`)
- `PORT` — API port (default 3001)
- `UPLOAD_DIR` — Directory for attachment files
- `AVATAR_DIR` — Directory for avatar images

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run `dist/index.js` |
| `npm run lint` | ESLint on `src` |
| `npm run db:start` | `docker-compose up -d database` |
| `npm run db:reset` | Recreate DB (down -v, up database) |

## Local dev

1. Start Postgres: `npm run db:start` (or `docker-compose up` for full stack).
2. Ensure `DATABASE_URL` in `.env` points at that DB.
3. `npm run dev`.
