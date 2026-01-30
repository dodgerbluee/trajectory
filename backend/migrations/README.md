# Database setup (backend)

This directory holds the **schema configuration** the app uses to set up the database on startup.

## SQL / setup files in this repo

| File | Purpose |
|------|--------|
| **backend/migrations/schema.sql** | Full DB schema (tables, indexes, triggers). Applied by the backend on startup via `src/db/migrations.ts`. Idempotent; safe on fresh or existing DB. |
| **database/init.sql** | Docker Postgres init script. Run by the Postgres container on first start when using `docker-compose` (mounted into `/docker-entrypoint-initdb.d/`). Creates schema for a new container volume. |

Use **backend/migrations/schema.sql** as the single source of truth for the current schema. Keep **database/init.sql** in sync if you use Docker init (or point Docker at the same schema).

## How backend setup works

1. On startup, the app runs `runMigrations()` in `src/db/migrations.ts`.
2. It ensures a `migrations` table exists (tracks which setup files have been applied).
3. It runs each `.sql` file in this directory that hasn’t been applied yet (alphabetically by filename).
4. `schema.sql` is idempotent (IF NOT EXISTS etc.), so it’s safe on an already-set-up DB.

## Manual run

To run database setup without starting the server:

```bash
npm run migrate
```

Or in production:

```bash
node dist/cli.js migrate
```
