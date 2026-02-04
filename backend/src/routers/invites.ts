/**
 * Invite accept route
 * Authenticated user accepts a family invite by token.
 */

import { Router, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { hashToken } from '../features/auth/service/auth.js';
import { BadRequestError, ConflictError } from '../middleware/error-handler.js';
import { createResponse } from '../types/api.js';

export const invitesRouter = Router();

invitesRouter.use(authenticate);

/**
 * POST /api/invites/accept
 * Accept a family invite with the given token. Adds the authenticated user to the family.
 */
invitesRouter.post(
  '/accept',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
      if (!token) {
        throw new BadRequestError('Token is required');
      }

      const userId = req.userId!;
      const tokenHash = hashToken(token);

      const invite = await query<{
        id: number;
        family_id: number;
        role: string;
        expires_at: Date;
        used_at: Date | null;
      }>(
        'SELECT id, family_id, role, expires_at, used_at FROM family_invites WHERE token_hash = $1',
        [tokenHash]
      );

      if (invite.rows.length === 0) {
        throw new BadRequestError('Invalid or expired invite token');
      }

      const row = invite.rows[0];
      if (row.used_at) {
        throw new BadRequestError('This invite has already been used');
      }
      if (new Date(row.expires_at) <= new Date()) {
        throw new BadRequestError('This invite has expired');
      }

      const existing = await query<{ user_id: number }>(
        'SELECT user_id FROM family_members WHERE family_id = $1 AND user_id = $2',
        [row.family_id, userId]
      );
      if (existing.rows.length > 0) {
        throw new ConflictError('You are already a member of this family');
      }

      await query(
        'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
        [row.family_id, userId, row.role]
      );

      await query(
        'UPDATE family_invites SET used_at = NOW() WHERE id = $1',
        [row.id]
      );

      await query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);

      const familyRow = await query<{ name: string | null }>(
        'SELECT name FROM families WHERE id = $1',
        [row.family_id]
      );
      const familyName = familyRow.rows[0]?.name ?? 'Family';

      res.json(
        createResponse({
          success: true,
          family_id: row.family_id,
          family_name: familyName,
          role: row.role,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default invitesRouter;
