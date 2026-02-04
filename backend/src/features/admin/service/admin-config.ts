/**
 * Runtime admin configuration (in-memory).
 * Used for settings that can change without restart (e.g. log level).
 * Falls back to env vars when not set.
 */

export type LogLevelValue = 'info' | 'debug';

const VALID_LOG_LEVELS: LogLevelValue[] = ['info', 'debug'];

let runtimeLogLevel: LogLevelValue | null = null;

/**
 * Get effective log level: runtime value if set, else process.env.LOG_LEVEL, else 'info'.
 */
export function getRuntimeLogLevel(): LogLevelValue {
  if (runtimeLogLevel !== null) return runtimeLogLevel;
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (VALID_LOG_LEVELS.includes(env as LogLevelValue)) return env as LogLevelValue;
  return 'info';
}

/**
 * Set log level at runtime (admin only). Persists until process restart.
 */
export function setRuntimeLogLevel(level: LogLevelValue): void {
  if (!VALID_LOG_LEVELS.includes(level)) {
    throw new Error(`Invalid log level: ${level}. Must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
  }
  runtimeLogLevel = level;
}

/**
 * Get current admin config for API response.
 */
export function getAdminConfig(): { log_level: LogLevelValue } {
  return { log_level: getRuntimeLogLevel() };
}

/**
 * Update admin config. Returns updated config.
 */
export function updateAdminConfig(patch: { log_level?: LogLevelValue }): { log_level: LogLevelValue } {
  if (patch.log_level !== undefined) {
    setRuntimeLogLevel(patch.log_level);
  }
  return getAdminConfig();
}
