# Database setup (backend)

This directory holds the **schema** the app uses to set up the database on startup.

## schema.sql

Single source of truth for the database schema (tables, indexes, triggers). Applied by the backend on startup via `src/db/migrations.ts`. Idempotent (IF NOT EXISTS etc.); safe on fresh or existing DB.

The app records when `schema.sql` has been applied in a `migrations` table and does not re-run it.


**Note:** `../../database/init.sql` is a Docker Postgres init script that includes all schema and migration changes consolidated together. It is kept in sync with `schema.sql`.

## Manual run

To run database setup without starting the server:

```bash
npm run migrate
```

Or in production:

```bash
node dist/cli.js migrate
```
