/**
 * Error logging utilities
 * Respects LOG_LEVEL env (error | warn | info | debug). Default: info.
 */

import type { Request } from 'express';

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
  const v = (process.env.LOG_LEVEL || 'info').toUpperCase();
  if (v in LEVEL_PRIORITY) return v as LogLevel;
  return LogLevel.INFO;
}

/** True if the given level should be logged given LOG_LEVEL env. */
export function shouldLog(level: LogLevel): boolean {
  const configured = getConfiguredLevel();
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[configured];
}

/**
 * Log entry structure
 */
interface LogEntry {
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

  // In production, you might send this to a logging service; skipped in test to keep output clean
  if (process.env.NODE_ENV !== 'test') {
    console.error(JSON.stringify(entry, null, 2));
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
  }
}
