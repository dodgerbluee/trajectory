/**
 * User management routes
 * - GET/PATCH /api/users/me/preferences: current user preferences (authenticated)
 * - GET /api/users, PUT /api/users/:id/instance-admin: instance admin only
 */

import { Router, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { authenticate, requireInstanceAdmin, type AuthRequest } from '../middleware/auth.js';
import { hashPassword, validatePasswordStrength } from '../lib/auth.js';
import { NotFoundError, BadRequestError } from '../middleware/error-handler.js';
import { validatePositiveInteger } from '../middleware/validation.js';
import { createResponse } from '../types/api.js';

interface UserListRow {
  id: number;
  email: string;
  username: string;
  is_instance_admin: boolean;
  created_at: Date;
  last_login_at: Date | null;
}

interface PreferencesRow {
  theme: string | null;
  date_format: string | null;
}

const THEME_VALUES = ['light', 'dark', 'system'];
const DATE_FORMAT_VALUES = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

export const usersRouter = Router();

usersRouter.use(authenticate);

/**
 * GET /api/users/me/preferences
 * Current user's theme and date_format. Authenticated only.
 */
usersRouter.get('/me/preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const result = await query<PreferencesRow>(
      'SELECT theme, date_format FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }
    const row = result.rows[0];
    res.json(
      createResponse({
        theme: row.theme ?? 'system',
        date_format: row.date_format ?? 'MM/DD/YYYY',
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/me/preferences
 * Update current user's theme and/or date_format. Authenticated only.
 */
usersRouter.patch('/me/preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { theme, date_format } = req.body as { theme?: string; date_format?: string };

    const updates: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (theme !== undefined) {
      const t = typeof theme === 'string' ? theme : null;
      if (t !== null && !THEME_VALUES.includes(t)) {
        throw new BadRequestError(`theme must be one of: ${THEME_VALUES.join(', ')}`);
      }
      updates.push(`theme = $${paramIndex++}`);
      values.push(t ?? 'system');
    }
    if (date_format !== undefined) {
      const df = typeof date_format === 'string' ? date_format : null;
      if (df !== null && !DATE_FORMAT_VALUES.includes(df)) {
        throw new BadRequestError(`date_format must be one of: ${DATE_FORMAT_VALUES.join(', ')}`);
      }
      updates.push(`date_format = $${paramIndex++}`);
      values.push(df ?? 'MM/DD/YYYY');
    }

    if (updates.length === 0) {
      const result = await query<PreferencesRow>(
        'SELECT theme, date_format FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) throw new NotFoundError('User');
      const row = result.rows[0];
      return res.json(
        createResponse({
          theme: row.theme ?? 'system',
          date_format: row.date_format ?? 'MM/DD/YYYY',
        })
      );
    }

    values.push(String(userId));
    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const result = await query<PreferencesRow>(
      'SELECT theme, date_format FROM users WHERE id = $1',
      [userId]
    );
    const row = result.rows[0];
    return res.json(
      createResponse({
        theme: row.theme ?? 'system',
        date_format: row.date_format ?? 'MM/DD/YYYY',
      })
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/users/me/onboarding
 * Set onboarding_completed to true. Authenticated only.
 */
usersRouter.patch('/me/onboarding', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const onboardingCompleted = req.body?.onboarding_completed;
    if (onboardingCompleted !== true) {
      throw new BadRequestError('onboarding_completed must be true');
    }
    await query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);
    res.json(createResponse({ onboarding_completed: true }));
  } catch (error) {
    next(error);
  }
});

usersRouter.use(requireInstanceAdmin);

/**
 * GET /api/users
 * List all users with created_at, last_login_at. Instance admin only.
 */
usersRouter.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query<UserListRow>(
      'SELECT id, email, username, is_instance_admin, created_at, last_login_at FROM users ORDER BY id'
    );
    const users = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      is_instance_admin: row.is_instance_admin,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
    }));
    res.json(createResponse(users));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * User detail with stats (total kids, visits, illnesses). Instance admin only.
 */
usersRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');
    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      is_instance_admin: boolean;
      created_at: Date;
      last_login_at: Date | null;
    }>(
      'SELECT id, email, username, is_instance_admin, created_at, last_login_at FROM users WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }
    const user = userResult.rows[0];

    const familyIdsResult = await query<{ family_id: number }>(
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [id]
    );
    const familyIds = familyIdsResult.rows.map((r) => r.family_id);
    let totalKids = 0;
    let totalVisits = 0;
    let totalIllnesses = 0;
    if (familyIds.length > 0) {
      const kidsResult = await query<{ count: string }>(
        'SELECT COUNT(*)::text as count FROM children WHERE family_id = ANY($1::int[])',
        [familyIds]
      );
      totalKids = parseInt(kidsResult.rows[0]?.count ?? '0', 10);
      const childIdsResult = await query<{ id: number }>(
        'SELECT id FROM children WHERE family_id = ANY($1::int[])',
        [familyIds]
      );
      const childIds = childIdsResult.rows.map((r) => r.id);
      if (childIds.length > 0) {
        const visitsResult = await query<{ count: string }>(
          'SELECT COUNT(*)::text as count FROM visits WHERE child_id = ANY($1::int[])',
          [childIds]
        );
        totalVisits = parseInt(visitsResult.rows[0]?.count ?? '0', 10);
        const illResult = await query<{ count: string }>(
          'SELECT COUNT(*)::text as count FROM illnesses WHERE child_id = ANY($1::int[])',
          [childIds]
        );
        totalIllnesses = parseInt(illResult.rows[0]?.count ?? '0', 10);
      }
    }

    res.json(
      createResponse({
        id: user.id,
        email: user.email,
        username: user.username,
        is_instance_admin: user.is_instance_admin,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        total_kids: totalKids,
        total_visits: totalVisits,
        total_illnesses: totalIllnesses,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:id/change-password
 * Admin sets a new password for a user. Instance admin only. No plaintext in logs.
 */
usersRouter.post(
  '/:id/change-password',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = validatePositiveInteger(req.params.id, 'id');
      const { newPassword } = req.body as { newPassword?: string };
      if (typeof newPassword !== 'string' || !newPassword.trim()) {
        throw new BadRequestError('newPassword is required');
      }
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new BadRequestError(passwordValidation.errors.join(' '));
      }
      const existing = await query<{ id: number }>('SELECT id FROM users WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        throw new NotFoundError('User');
      }
      const passwordHash = await hashPassword(newPassword.trim());
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
      res.json(createResponse({ success: true }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/users/:id/instance-admin
 * Set is_instance_admin for a user. Instance admin only.
 * Prevents revoking the last instance admin.
 */
usersRouter.put(
  '/:id/instance-admin',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = validatePositiveInteger(req.params.id, 'id');
      const value = req.body.is_instance_admin;
      if (typeof value !== 'boolean') {
        throw new BadRequestError('is_instance_admin must be a boolean');
      }

      const existing = await query<{ id: number; is_instance_admin: boolean }>(
        'SELECT id, is_instance_admin FROM users WHERE id = $1',
        [id]
      );
      if (existing.rows.length === 0) {
        throw new NotFoundError('User');
      }

      if (value === false) {
        const adminCount = await query<{ count: string }>(
          'SELECT COUNT(*)::text as count FROM users WHERE is_instance_admin = true',
          []
        );
        const count = parseInt(adminCount.rows[0]?.count ?? '0', 10);
        if (count <= 1) {
          throw new BadRequestError(
            'Cannot revoke the last instance admin. Grant another user first.'
          );
        }
      }

      await query(
        'UPDATE users SET is_instance_admin = $1 WHERE id = $2',
        [value, id]
      );

      res.json(createResponse({ success: true, is_instance_admin: value }));
    } catch (error) {
      next(error);
    }
  }
);
