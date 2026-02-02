/**
 * Error logging utilities
 * Respects runtime log level (admin config) or LOG_LEVEL env. Default: info.
 */

import type { Request } from 'express';
import { getRuntimeLogLevel } from '../lib/admin-config.js';

/**
 * Log levels (priority: error < warn < info < debug)
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
};

function getConfiguredLevel(): LogLevel {
  const v = getRuntimeLogLevel().toUpperCase();
  if (v in LEVEL_PRIORITY) return v as LogLevel;
  return LogLevel.INFO;
}

/** In-memory log buffer for admin logs view (no sensitive data). */
const MAX_LOG_BUFFER = 2000;
const logBuffer: LogEntry[] = [];

function pushToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
}

/** True if the given level should be logged given LOG_LEVEL env. */
export function shouldLog(level: LogLevel): boolean {
  const configured = getConfiguredLevel();
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[configured];
}

/**
 * Log entry structure (exported for admin API).
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    statusCode?: number;
  };
  request?: {
    method: string;
    path: string;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    ip?: string;
  };
}

/**
 * Get recent log entries for admin. Filter by level(s), paginate.
 */
export function getLogBuffer(options: {
  levels?: LogLevel[];
  limit?: number;
  offset?: number;
}): { entries: LogEntry[]; total: number } {
  const { levels, limit = 100, offset = 0 } = options;
  let slice = [...logBuffer].reverse();
  if (levels && levels.length > 0) {
    const set = new Set(levels);
    slice = slice.filter((e) => set.has(e.level));
  }
  const total = slice.length;
  slice = slice.slice(offset, offset + limit);
  return { entries: slice, total };
}

/**
 * Format and log error with context
 */
export function logError(
  error: Error,
  req?: Request,
  statusCode?: number
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    message: error.message,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      statusCode,
    },
  };

  if (req) {
    entry.request = {
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      // Don't log sensitive body data in production
      body: process.env.NODE_ENV === 'development' ? req.body : undefined,
      ip: req.ip,
    };
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(JSON.stringify(entry, null, 2));
    pushToBuffer(entry);
  }
}

/**
 * Log warning
 */
export function logWarning(message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.WARN,
    message,
  };

  if (process.env.NODE_ENV !== 'test' && shouldLog(LogLevel.WARN)) {
    console.warn(JSON.stringify({ ...entry, ...context }, null, 2));
    pushToBuffer(entry);
  }
}

/**
 * Log info
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    message,
  };

  if (process.env.NODE_ENV !== 'test' && shouldLog(LogLevel.INFO)) {
    console.log(JSON.stringify({ ...entry, ...context }, null, 2));
    pushToBuffer(entry);
  }
}

/**
 * Log debug
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.DEBUG,
    message,
  };

  if (process.env.NODE_ENV !== 'test' && shouldLog(LogLevel.DEBUG)) {
    console.log(JSON.stringify({ ...entry, ...context }, null, 2));
    pushToBuffer(entry);
  }
}

/**
 * Log an API request to the buffer (INFO level). Use in request middleware so admin logs show activity.
 * Only call for routes you want to appear (e.g. /api/*, /health) to avoid flooding the buffer.
 */
export function logRequest(req: Request): void {
  const message = `${req.method} ${req.path}`;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    message,
    request: {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, unknown>,
      ip: req.ip,
    },
  };

  if (process.env.NODE_ENV !== 'test' && shouldLog(LogLevel.INFO)) {
    pushToBuffer(entry);
  }
}
