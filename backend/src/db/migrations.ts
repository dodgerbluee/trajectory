/**
 * Database Migration System
 * 
 * Handles schema creation and upgrades automatically on application startup.
 * 
 * How it works:
 * 1. On first run against an empty database, creates a migrations table to track applied migrations
 * 2. Scans the migrations directory for SQL files (sorted by filename)
 * 3. Applies each migration that hasn't been applied yet
 * 4. Records applied migrations in the migrations table
 * 5. All migrations are idempotent (safe to run multiple times)
 * 
 * Migration files should be named: YYYYMMDD-HHMMSS-description.sql
 * Example: 20250125-120000-initial-schema.sql
 */

import { query, pool } from './connection.js';
import { readdir, readFile } from 'fs/promises';
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
  } catch (error: any) {
    // If migrations table doesn't exist yet, return empty array
    // This will be handled by ensureMigrationsTable
    if (error.code === '42P01') { // relation does not exist
      return [];
    }
    throw error;
  }
}

/**
 * Execute a migration SQL file
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
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Migration ${name} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all migration files from the migrations directory
 * Returns array of [filename, fullPath] tuples
 */
async function getMigrationFiles(): Promise<Array<[string, string]>> {
  try {
    // Determine migrations directory path
    // In production (from dist/): migrations are at ../migrations (relative to dist/db/)
    // In dev (from src/): migrations are at ../../migrations (relative to src/db/)
    // Also check process.cwd() for absolute path scenarios
    let migrationsDir: string;
    
    // Try relative path first (production)
    const relativePath = join(__dirname, '..', '..', 'migrations');
    try {
      await readdir(relativePath);
      migrationsDir = relativePath;
    } catch {
      // Try absolute path from cwd (dev or alternative structure)
      migrationsDir = join(process.cwd(), 'backend', 'migrations');
      try {
        await readdir(migrationsDir);
      } catch {
        // Try root-level migrations (if backend structure is different)
        migrationsDir = join(process.cwd(), 'migrations');
        await readdir(migrationsDir);
      }
    }
    
    const files = await readdir(migrationsDir);
    
    // Filter to only .sql files and sort by filename
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => [file, join(migrationsDir, file)] as [string, string]);
    
    return sqlFiles;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Migrations directory doesn't exist - return empty array
      return [];
    }
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...\n');
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Found ${appliedMigrations.length} previously applied migration(s)`);
    
    // Get all migration files (returns [filename, fullPath] tuples)
    const migrationFiles = await getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration file(s) in directory\n`);
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found. Skipping migrations.');
      return;
    }
    
    // Filter to only pending migrations (compare by filename)
    const pendingMigrations = migrationFiles.filter(
      ([filename]) => !appliedMigrations.includes(filename)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('All migrations are up to date.\n');
      return;
    }
    
    console.log(`Applying ${pendingMigrations.length} pending migration(s):\n`);
    
    // Apply each pending migration
    for (const [filename, fullPath] of pendingMigrations) {
      const sql = await readFile(fullPath, 'utf-8');
      await executeMigration(filename, sql);
    }
    
    console.log(`\n✓ All migrations applied successfully\n`);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  }
}
