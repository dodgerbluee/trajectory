/**
 * Global instance settings (DB-backed).
 * Used for admin config that should persist across restarts (e.g. log_level).
 */

import { query } from '../../../db/connection.js';

let ensured = false;

/**
 * Ensure instance_settings table and default row exist (for DBs created before this was added).
 */
export async function ensureInstanceSettingsTable(): Promise<void> {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS instance_settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await query(`
    INSERT INTO instance_settings (key, value) VALUES ('log_level', 'info')
    ON CONFLICT (key) DO NOTHING
  `);
  ensured = true;
}

/**
 * Get a setting value by key. Returns null if not found.
 */
export async function getInstanceSetting(key: string): Promise<string | null> {
  await ensureInstanceSettingsTable();
  const result = await query<{ value: string }>(
    'SELECT value FROM instance_settings WHERE key = $1',
    [key]
  );
  return result.rows[0]?.value ?? null;
}

/**
 * Set a setting value. Creates or updates the row.
 */
export async function setInstanceSetting(key: string, value: string): Promise<void> {
  await ensureInstanceSettingsTable();
  await query(
    `INSERT INTO instance_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}
