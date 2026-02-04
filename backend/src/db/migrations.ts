/**
 * Database migrations
 *
 * On startup: ensures migrations table exists, then applies all unapplied .sql files from backend/migrations/.
 */

import { query, pool } from './connection.js';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getMigrationFiles(): Promise<string[]> {
  const possibleDirs = [
    join(__dirname, '..', '..', 'migrations'),
    join(process.cwd(), 'backend', 'migrations'),
    join(process.cwd(), 'migrations'),
  ];

  for (const dir of possibleDirs) {
    try {
      const files = await readdir(dir);
      return files
        .filter(f => f.endsWith('.sql') && f !== 'schema.sql')
        .sort();
    } catch {
      continue;
    }
  }

  return [];
}

async function getMigrationPath(filename: string): Promise<string | null> {
  const possiblePaths = [
    join(__dirname, '..', '..', 'migrations', filename),
    join(process.cwd(), 'backend', 'migrations', filename),
    join(process.cwd(), 'migrations', filename),
  ];

  for (const path of possiblePaths) {
    try {
      await readFile(path, 'utf-8');
      return path;
    } catch {
      continue;
    }
  }

  return null;
}

async function applyIncrementalMigrations(): Promise<void> {
  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = await getMigrationFiles();

  if (migrationFiles.length === 0) {
    return;
  }

  for (const filename of migrationFiles) {
    if (appliedMigrations.includes(filename)) {
      continue;
    }

    const path = await getMigrationPath(filename);
    if (!path) {
      console.warn(`Warning: Migration file ${filename} not found, skipping`);
      continue;
    }

    const sql = await readFile(path, 'utf-8');
    await executeMigration(filename, sql);
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    const result = await query<MigrationRecord>('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  } catch (error: unknown) {
    const err = error as Partial<{ code: unknown }>;
    if (err.code === '42P01') {
      return [];
    }
    throw error;
  }
}

// Execute a migration in a transaction (rolled back if it fails)
async function executeMigration(name: string, sql: string): Promise<void> {
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(sql);
    
    await client.query('INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    
    await client.query('COMMIT');
    console.log(`  ✓ Migration ${name} applied successfully`);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    // Log concise error message instead of full stack trace
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Migration ${name} failed: ${errorMessage}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply schema.sql if it hasn't been applied yet
 */
async function applyBaseSchema(): Promise<void> {
  const appliedMigrations = await getAppliedMigrations();
  const schemaName = 'schema.sql';
  
  // Check if schema.sql has been applied
  if (appliedMigrations.includes(schemaName)) {
    return; // Already applied
  }
  
  // Find schema.sql file using the same logic as getMigrationFiles
  let schemaPath: string | null = null;
  const possiblePaths = [
    join(__dirname, '..', '..', 'migrations', schemaName),
    join(process.cwd(), 'backend', 'migrations', schemaName),
    join(process.cwd(), 'migrations', schemaName),
  ];
  
  for (const path of possiblePaths) {
    try {
      await readFile(path, 'utf-8');
      schemaPath = path;
      break;
    } catch {
      // Try next path
      continue;
    }
  }
  
  if (!schemaPath) {
    console.log('schema.sql not found, skipping base schema application\n');
    return;
  }
  
  const sql = await readFile(schemaPath, 'utf-8');
  console.log('Applying base schema (schema.sql)...\n');
  await executeMigration(schemaName, sql);
  console.log('✓ Base schema applied successfully\n');
}

/**
 * Run database setup: apply schema.sql if not yet applied, then apply incremental migrations.
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...\n');

  try {
    await ensureMigrationsTable();
    await applyBaseSchema();
    await applyIncrementalMigrations();

    const appliedMigrations = await getAppliedMigrations();
    console.log(`Applied migrations: ${appliedMigrations.join(', ') || '(none)'}\n`);
    console.log('✓ Database schema up to date\n');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n✗ Migration failed: ${errorMessage}`);
    throw error;
  }
}
