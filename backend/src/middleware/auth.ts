/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';
import { UnauthorizedError, ForbiddenError } from './error-handler.js';
import { getIsInstanceAdmin } from '../lib/instance-admin.js';

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
 * Require instance admin. Use after authenticate(); returns 403 if user is not instance admin.
 */
export async function requireInstanceAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    if (userId == null) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!(await getIsInstanceAdmin(userId))) {
      next(new ForbiddenError('Instance admin access required'));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticate from Bearer header or query.token (for img src etc).
 * Use for GET avatar so <img src="...?token=..."> works.
 */
export async function authenticateHeaderOrQuery(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
      token = req.query.token.trim();
    }
    if (!token) {
      next(new UnauthorizedError('Missing or invalid authorization'));
      return;
    }
    const { userId, email } = verifyToken(token, false);
    req.userId = userId;
    req.userEmail = email;
    next();
  } catch {
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
