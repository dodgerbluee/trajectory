/**
 * Authentication utilities
 * Password hashing, JWT token generation and verification
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

const PLACEHOLDER_SECRETS = new Set([
  '',
  'change-me-in-production',
  'change-me-in-production-refresh',
  'change-me-in-production-use-strong-random-secret',
  'change-me-in-production-use-strong-random-refresh-secret',
]);

function getRequiredSecret(name: string, value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim();
  if (process.env.NODE_ENV === 'production') {
    if (!raw || PLACEHOLDER_SECRETS.has(raw)) {
      throw new Error(
        `${name} must be set to a strong random value in production. Do not use the default placeholder. See .env.example and DEPLOYMENT.md.`
      );
    }
    return raw;
  }
  return raw || fallback;
}

const JWT_SECRET = getRequiredSecret(
  'JWT_SECRET',
  process.env.JWT_SECRET,
  'change-me-in-production'
);
const JWT_REFRESH_SECRET = getRequiredSecret(
  'JWT_REFRESH_SECRET',
  process.env.JWT_REFRESH_SECRET,
  'change-me-in-production-refresh'
);
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token (short-lived, 15 minutes)
 */
export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate a refresh token (longer-lived, 7 days)
 */
export function generateRefreshToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, isRefresh = false): { userId: number; email: string; type: string } {
  const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  const payload = decoded as JwtPayload & Partial<{ userId: unknown; email: unknown; type: unknown }>;
  if (typeof payload.userId !== 'number' || typeof payload.email !== 'string' || typeof payload.type !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { userId: payload.userId, email: payload.email, type: payload.type };
}

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage in database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
