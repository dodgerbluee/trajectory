/**
 * Error logging utilities
 */

import type { Request } from 'express';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
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

  // In production, you might send this to a logging service
  console.error(JSON.stringify(entry, null, 2));
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

  console.warn(JSON.stringify({ ...entry, ...context }, null, 2));
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

  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify({ ...entry, ...context }, null, 2));
  }
}
