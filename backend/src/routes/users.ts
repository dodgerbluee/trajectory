/**
 * User management routes
 * - GET/PATCH /api/users/me/preferences: current user preferences (authenticated)
 * - GET /api/users, PUT /api/users/:id/instance-admin: instance admin only
 */

import { Router, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { authenticate, requireInstanceAdmin, type AuthRequest } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../middleware/error-handler.js';
import { validatePositiveInteger } from '../middleware/validation.js';
import { createResponse } from '../types/api.js';

interface UserListRow {
  id: number;
  email: string;
  name: string;
  is_instance_admin: boolean;
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

usersRouter.use(requireInstanceAdmin);

/**
 * GET /api/users
 * List all users (id, email, name, is_instance_admin). Instance admin only.
 */
usersRouter.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query<UserListRow>(
      'SELECT id, email, name, is_instance_admin FROM users ORDER BY id'
    );
    const users = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      is_instance_admin: row.is_instance_admin,
    }));
    res.json(createResponse(users));
  } catch (error) {
    next(error);
  }
});

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
