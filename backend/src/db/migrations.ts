/**
 * Database schema setup
 *
 * On startup: ensures migrations table exists, then applies schema.sql if not yet applied.
 * Single schema file (idempotent); no incremental migration files.
 */

import { query, pool } from './connection.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

/**
 * Create the migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const result = await query<MigrationRecord>('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  } catch (error: unknown) {
    // If migrations table doesn't exist yet, return empty array
    // This will be handled by ensureMigrationsTable
    const err = error as Partial<{ code: unknown }>;
    if (err.code === '42P01') { // relation does not exist
      return [];
    }
    throw error;
  }
}

/**
 * Execute a migration SQL file
 * Wrapped in a transaction for atomicity - if migration fails, it's rolled back
 */
async function executeMigration(name: string, sql: string): Promise<void> {
  console.log(`  Applying migration: ${name}`);
  
  // Use a transaction to ensure atomicity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration
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
 * Run database setup: apply schema.sql if not yet applied.
 * Single schema file (no incremental migrations).
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...\n');

  try {
    await ensureMigrationsTable();
    await applyBaseSchema();

    const appliedMigrations = await getAppliedMigrations();
    console.log(`Applied migrations: ${appliedMigrations.join(', ') || '(none)'}\n`);
    console.log('✓ Database schema up to date\n');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n✗ Migration failed: ${errorMessage}`);
    throw error;
  }
}
