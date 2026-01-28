/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';
import { UnauthorizedError } from './error-handler.js';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

/**
 * Authenticate request using JWT token
 * Attaches userId and userEmail to request object
 */
export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const { userId, email } = verifyToken(token, false);
    
    req.userId = userId;
    req.userEmail = email;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Optional authentication - doesn't fail if token is missing
 * Useful for endpoints that work both authenticated and unauthenticated
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { userId, email } = verifyToken(token, false);
      req.userId = userId;
      req.userEmail = email;
    }
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}
