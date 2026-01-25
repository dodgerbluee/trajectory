# Database Migrations

This directory contains SQL migration files that are automatically applied on application startup.

## How It Works

1. **Automatic Execution**: Migrations run automatically when the application starts, before serving traffic
2. **Idempotent**: All migrations use `IF NOT EXISTS` and are safe to run multiple times
3. **Tracking**: Applied migrations are recorded in the `migrations` table in the database
4. **Ordering**: Migrations are applied in alphabetical order by filename

## Creating a New Migration

1. Create a new SQL file with the naming pattern: `YYYYMMDD-HHMMSS-description.sql`
   - Example: `20250126-143000-add-user-preferences.sql`
2. Use `IF NOT EXISTS` for all objects (tables, indexes, constraints, etc.)
3. Test the migration locally before committing

## Example Migration

```sql
-- Add a new column to an existing table
ALTER TABLE children ADD COLUMN IF NOT EXISTS favorite_color VARCHAR(50);

-- Create a new index
CREATE INDEX IF NOT EXISTS idx_children_favorite_color ON children(favorite_color);
```

## Manual Migration

If you need to run migrations manually (without starting the server):

```bash
npm run migrate
```

Or in production:

```bash
node dist/cli.js migrate
```

## First Run Initialization

On first run against an empty database:
1. The application creates the `migrations` table
2. All migration files are applied in order
3. The database is fully initialized and ready to use
4. No manual steps required
