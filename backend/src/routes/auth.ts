/**
 * Authentication routes
 * Handles user registration, login, token refresh, logout, and password reset
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { query, transaction } from '../db/connection.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateResetToken,
  hashToken,
  validatePasswordStrength,
  validateEmail,
} from '../lib/auth.js';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '../middleware/error-handler.js';
import { validateRequired } from '../middleware/validation.js';
import { createResponse } from '../types/api.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { loginRateLimiter, passwordResetRateLimiter } from '../middleware/rate-limit.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const authRouter = express.Router();

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
}

/**
 * POST /api/auth/register
 * Register a new user
 */
authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email, password, name } = req.body;

    // Validate input
    const emailValue = validateRequired(email, 'email');
    const passwordValue = validateRequired(password, 'password');
    const nameValue = validateRequired(name, 'name');

    // Validate email format
    if (!validateEmail(emailValue)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(passwordValue);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '), 'password');
    }

    // Check if user already exists
    const existingUser = await query<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [emailValue.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(passwordValue);

    // Create user
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [emailValue.toLowerCase(), passwordHash, nameValue]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token in database
    const tokenHash = hashToken(refreshToken);
    await query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [user.id, tokenHash, req.get('user-agent') || null, req.ip]
    );

    res.status(201).json(
      createResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      })
    );
  })
);

/**
 * POST /api/auth/login
 * Login user and return tokens
 */
authRouter.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email, password } = req.body;

    // Validate input
    const emailValue = validateRequired(email, 'email');
    const passwordValue = validateRequired(password, 'password');

    // Find user
    const userResult = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [emailValue.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Log failed attempt
      await query(
        'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
        [emailValue.toLowerCase(), req.ip, false]
      );
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const passwordValid = await verifyPassword(passwordValue, user.password_hash);

    if (!passwordValid) {
      // Increment failed attempts
      const newFailedAttempts = user.failed_login_attempts + 1;
      const lockUntil = newFailedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await query(
        `UPDATE users 
         SET failed_login_attempts = $1, locked_until = $2
         WHERE id = $3`,
        [newFailedAttempts, lockUntil, user.id]
      );

      // Log failed attempt
      await query(
        'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
        [emailValue.toLowerCase(), req.ip, false]
      );

      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset failed attempts and unlock account
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Log successful attempt
    await query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
      [emailValue.toLowerCase(), req.ip, true]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token in database
    const tokenHash = hashToken(refreshToken);
    await query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [user.id, tokenHash, req.get('user-agent') || null, req.ip]
    );

    res.json(
      createResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      })
    );
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required', 'refreshToken');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken, true);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if token exists in database
    const tokenHash = hashToken(refreshToken);
    const sessionResult = await query(
      `SELECT * FROM user_sessions 
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user
    const userResult = await query<UserRow>(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id, user.email);

    // Update session with new refresh token
    const newTokenHash = hashToken(newRefreshToken);
    await query(
      `UPDATE user_sessions 
       SET token_hash = $1, expires_at = NOW() + INTERVAL '7 days', last_used_at = NOW()
       WHERE token_hash = $2`,
      [newTokenHash, tokenHash]
    );

    res.json(
      createResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      })
    );
  })
);

/**
 * POST /api/auth/logout
 * Logout user and invalidate refresh token
 */
authRouter.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash]);
    }

    res.status(204).send();
  })
);

/**
 * GET /api/auth/me
 * Get current user information
 */
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userResult = await query<UserRow>(
      'SELECT id, email, name, email_verified, created_at, last_login_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = userResult.rows[0];

    res.json(
      createResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        createdAt: user.created_at.toISOString(),
        lastLoginAt: user.last_login_at?.toISOString() || null,
      })
    );
  })
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = req.body;

    const emailValue = validateRequired(email, 'email');

    if (!validateEmail(emailValue)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    // Find user
    const userResult = await query<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [emailValue.toLowerCase()]
    );

    // Don't reveal if user exists (security best practice)
    if (userResult.rows.length === 0) {
      res.json(createResponse({ message: 'If the email exists, a password reset link has been sent' }));
      return;
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = generateResetToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store reset token
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // In production, send email with reset token
    // For now, we'll just return success (in production, don't return the token)
    // TODO: Send email with reset link containing the token

    res.json(createResponse({ message: 'If the email exists, a password reset link has been sent' }));
  })
);

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
authRouter.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { token, password } = req.body;

    const tokenValue = validateRequired(token, 'token');
    const passwordValue = validateRequired(password, 'password');

    // Validate password strength
    const passwordValidation = validatePasswordStrength(passwordValue);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '), 'password');
    }

    // Find reset token
    const tokenHash = hashToken(tokenValue);
    const tokenResult = await query(
      `SELECT prt.*, u.id as user_id
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used = FALSE`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const passwordHash = await hashPassword(passwordValue);

    // Update password and mark token as used
    await transaction(async (client) => {
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        passwordHash,
        resetToken.user_id,
      ]);
      await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [
        resetToken.id,
      ]);
      // Invalidate all sessions for security
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [resetToken.user_id]);
    });

    res.json(createResponse({ message: 'Password reset successfully' }));
  })
);

/**
 * PUT /api/auth/update-username
 * Update user's username
 */
authRouter.put(
  '/update-username',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { newUsername, currentPassword } = req.body;

    const newUsernameValue = validateRequired(newUsername, 'newUsername');
    const currentPasswordValue = validateRequired(currentPassword, 'currentPassword');

    // Validate username length
    if (newUsernameValue.trim().length < 2) {
      throw new ValidationError('Username must be at least 2 characters', 'newUsername');
    }

    // Get current user
    const userResult = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = userResult.rows[0];

    // Verify current password
    const passwordValid = await verifyPassword(currentPasswordValue, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Check if username is already taken
    const existingUser = await query<UserRow>(
      'SELECT id FROM users WHERE name = $1 AND id != $2',
      [newUsernameValue.trim(), req.userId]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('Username is already taken');
    }

    // Update username
    await query(
      'UPDATE users SET name = $1 WHERE id = $2',
      [newUsernameValue.trim(), req.userId]
    );

    res.json(createResponse({ message: 'Username updated successfully' }));
  })
);

/**
 * PUT /api/auth/update-password
 * Update user's password
 */
authRouter.put(
  '/update-password',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    const currentPasswordValue = validateRequired(currentPassword, 'currentPassword');
    const newPasswordValue = validateRequired(newPassword, 'newPassword');

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPasswordValue);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '), 'newPassword');
    }

    // Get current user
    const userResult = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = userResult.rows[0];

    // Verify current password
    const passwordValid = await verifyPassword(currentPasswordValue, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPasswordValue);

    // Update password and invalidate all sessions
    await transaction(async (client) => {
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        passwordHash,
        req.userId,
      ]);
      // Invalidate all sessions for security
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [req.userId]);
    });

    res.json(createResponse({ message: 'Password updated successfully' }));
  })
);
