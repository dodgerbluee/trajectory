/**
 * Global error handling middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { logError } from './error-logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    message: string;
    type: string;
    statusCode: number;
    field?: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    path?: string;
    method?: string;
  };
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  err: Error,
  statusCode: number,
  req?: Request,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      message: err.message,
      type: err.name,
      statusCode,
      ...(err instanceof ValidationError && err.field ? { field: err.field } : {}),
      ...(details ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(req ? {
        path: req.path,
        method: req.method,
      } : {}),
    },
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle known AppErrors
  if (err instanceof AppError) {
    logError(err, req, err.statusCode);
    res.status(err.statusCode).json(createErrorResponse(err, err.statusCode, req));
    return;
  }

  // Handle database errors
  if ('code' in err) {
    const dbError = err as { code: string; detail?: string; constraint?: string };
    
    // Foreign key violation
    if (dbError.code === '23503') {
      const message = 'Referenced resource does not exist';
      logError(err, req, 400);
      res.status(400).json(createErrorResponse(
        new BadRequestError(message),
        400,
        req,
        { constraint: dbError.constraint }
      ));
      return;
    }
    
    // Unique violation
    if (dbError.code === '23505') {
      const message = 'Resource already exists';
      logError(err, req, 409);
      res.status(409).json(createErrorResponse(
        new ConflictError(message),
        409,
        req,
        { constraint: dbError.constraint }
      ));
      return;
    }
    
    // Check constraint violation
    if (dbError.code === '23514') {
      const message = 'Validation failed';
      logError(err, req, 400);
      res.status(400).json(createErrorResponse(
        new ValidationError(message),
        400,
        req,
        { detail: dbError.detail }
      ));
      return;
    }
    
    // Not null violation
    if (dbError.code === '23502') {
      const message = 'Required field is missing';
      logError(err, req, 400);
      res.status(400).json(createErrorResponse(
        new ValidationError(message),
        400,
        req
      ));
      return;
    }
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    logError(err, req, 400);
    res.status(400).json(createErrorResponse(
      new BadRequestError('Invalid JSON in request body'),
      400,
      req
    ));
    return;
  }

  // Unknown/unexpected errors
  logError(err, req, 500);
  
  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  
  res.status(500).json(createErrorResponse(
    new AppError(500, message, false),
    500,
    req
  ));
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error handler
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
