/**
 * Family and invite routes
 * List families for the user; create/list/revoke invites (owner/parent only).
 */

import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { hashToken } from '../features/auth/service/auth.js';
import { getFamilyIdsForUser, getFamilyRole, canEditFamily } from '../features/families/service/family-access.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/error-handler.js';
import { validatePositiveInteger, validateRequired } from '../middleware/validation.js';
import { createResponse } from '../types/api.js';

const INVITE_EXPIRY_DAYS = 7;

export const familiesRouter = Router();

familiesRouter.use(authenticate);

/**
 * POST /api/families
 * Create a new family and add the current user as owner.
 * Body: { name: string }
 */
familiesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId!;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      throw new BadRequestError('Family name is required.');
    }
    if (name.length > 255) {
      throw new BadRequestError('Family name must be 255 characters or less.');
    }
    const insert = await query<{ id: number; name: string }>(
      'INSERT INTO families (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    const familyId = insert.rows[0].id;
    await query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [familyId, userId, 'owner']
    );
    res.status(201).json(
      createResponse({
        id: familyId,
        name: insert.rows[0].name ?? name,
        role: 'owner',
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/families
 * List families the user is a member of (id, name, role).
 */
familiesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId!;
    const familyIds = await getFamilyIdsForUser(userId);
    if (familyIds.length === 0) {
      res.json(createResponse([]));
      return;
    }

    const result = await query<{ id: number; name: string | null }>(
      'SELECT id, name FROM families WHERE id = ANY($1::int[]) ORDER BY id',
      [familyIds]
    );

    const families = await Promise.all(
      result.rows.map(async (row) => {
        const role = await getFamilyRole(userId, row.id);
        return {
          id: row.id,
          name: row.name ?? 'My Family',
          role: role ?? undefined,
        };
      })
    );

    res.json(createResponse(families));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/families/:id
 * Update family name. Owner only.
 */
familiesRouter.patch(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const role = await getFamilyRole(req.userId!, familyId);
      if (role !== 'owner') {
        throw new ForbiddenError('Only the family owner can rename the family.');
      }

      const name = validateRequired(req.body?.name, 'name');
      if (name.length > 255) {
        throw new BadRequestError('Family name must be 255 characters or less.');
      }

      await query(
        'UPDATE families SET name = $1 WHERE id = $2',
        [name, familyId]
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/families/:id
 * Delete the family. Owner only. Fails if the family has any children.
 */
familiesRouter.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const role = await getFamilyRole(req.userId!, familyId);
      if (role !== 'owner') {
        throw new ForbiddenError('Only the family owner can delete the family.');
      }

      const childCount = await query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM children WHERE family_id = $1',
        [familyId]
      );
      if (parseInt(childCount.rows[0].count, 10) > 0) {
        throw new BadRequestError(
          'Cannot delete a family that has children. Remove or transfer the children first.'
        );
      }

      await query('DELETE FROM families WHERE id = $1', [familyId]);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/families/:id/members
 * List family members (user_id, name, email, role). User must be a member of the family.
 */
familiesRouter.get(
  '/:id/members',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const familyIds = await getFamilyIdsForUser(req.userId!);
      if (!familyIds.includes(familyId)) {
        throw new ForbiddenError('You do not have access to this family.');
      }

      const result = await query<{
        user_id: number;
        username: string;
        email: string;
        role: string;
      }>(
        `SELECT fm.user_id, u.username, u.email, fm.role
         FROM family_members fm
         INNER JOIN users u ON u.id = fm.user_id
         WHERE fm.family_id = $1
         ORDER BY fm.role = 'owner' DESC, u.username ASC`,
        [familyId]
      );

      const members = result.rows.map((row) => ({
        user_id: row.user_id,
        username: row.username,
        email: row.email,
        role: row.role,
      }));

      res.json(createResponse(members));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/families/:id/members/:userId
 * Update a member's role (parent | read_only). Requires canEditFamily. Cannot change owner role.
 */
familiesRouter.patch(
  '/:id/members/:userId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const targetUserId = validatePositiveInteger(req.params.userId, 'userId');

      if (!(await canEditFamily(req.userId!, familyId))) {
        throw new ForbiddenError('You do not have permission to edit members in this family.');
      }

      const newRole = req.body?.role;
      if (newRole !== 'parent' && newRole !== 'read_only') {
        throw new BadRequestError('role must be "parent" or "read_only"');
      }

      const currentRole = await getFamilyRole(targetUserId, familyId);
      if (currentRole == null) {
        throw new NotFoundError('Family member');
      }
      if (currentRole === 'owner') {
        throw new BadRequestError('Cannot change the role of an owner.');
      }

      const result = await query(
        'UPDATE family_members SET role = $1 WHERE family_id = $2 AND user_id = $3 RETURNING user_id, role',
        [newRole, familyId, targetUserId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Family member');
      }

      res.json(
        createResponse({
          user_id: result.rows[0].user_id,
          role: result.rows[0].role,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/families/:id/members/:userId
 * Remove a member from the family. Owners/parents can remove others; any member can remove themselves (leave).
 * Cannot remove the last owner.
 */
familiesRouter.delete(
  '/:id/members/:userId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const targetUserId = validatePositiveInteger(req.params.userId, 'userId');
      const isLeaving = targetUserId === req.userId;

      if (!isLeaving && !(await canEditFamily(req.userId!, familyId))) {
        throw new ForbiddenError('You do not have permission to remove members from this family.');
      }

      const role = await getFamilyRole(targetUserId, familyId);
      if (role == null) {
        throw new NotFoundError('Family member');
      }

      if (role === 'owner') {
        const ownerCount = await query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM family_members WHERE family_id = $1 AND role = $2',
          [familyId, 'owner']
        );
        if (parseInt(ownerCount.rows[0].count, 10) <= 1) {
          throw new BadRequestError('Cannot remove the last owner. Transfer ownership first or delete the family.');
        }
      }

      const result = await query(
        'DELETE FROM family_members WHERE family_id = $1 AND user_id = $2 RETURNING user_id',
        [familyId, targetUserId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Family member');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/families/:id/invites
 * List pending invites for the family. Requires canEditFamily.
 */
familiesRouter.get(
  '/:id/invites',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      if (!(await canEditFamily(req.userId!, familyId))) {
        throw new ForbiddenError('You do not have permission to view invites for this family.');
      }

      const result = await query<{
        id: number;
        role: string;
        expires_at: Date;
        created_at: Date;
        created_by: number | null;
      }>(
        `SELECT id, role, expires_at, created_at, created_by
         FROM family_invites
         WHERE family_id = $1 AND used_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [familyId]
      );

      const invites = result.rows.map((row) => ({
        id: row.id,
        role: row.role,
        expires_at: row.expires_at.toISOString(),
        created_at: row.created_at.toISOString(),
        created_by: row.created_by ?? undefined,
      }));

      res.json(createResponse(invites));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/families/:id/invites
 * Create an invite (returns token once). Requires canEditFamily.
 */
familiesRouter.post(
  '/:id/invites',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const role = req.body.role;
      if (role !== 'parent' && role !== 'read_only') {
        throw new BadRequestError('role must be "parent" or "read_only"');
      }

      if (!(await canEditFamily(req.userId!, familyId))) {
        throw new ForbiddenError('You do not have permission to create invites for this family.');
      }

      const token = crypto.randomBytes(16).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

      const result = await query<{ id: number; expires_at: Date; created_at: Date }>(
        `INSERT INTO family_invites (family_id, role, token_hash, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, expires_at, created_at`,
        [familyId, role, tokenHash, req.userId!, expiresAt]
      );

      const row = result.rows[0];
      res.status(201).json(
        createResponse({
          id: row.id,
          token,
          role,
          expires_at: row.expires_at.toISOString(),
          created_at: row.created_at.toISOString(),
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/families/:id/invites/:inviteId
 * Revoke an invite. Requires canEditFamily.
 */
familiesRouter.delete(
  '/:id/invites/:inviteId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const familyId = validatePositiveInteger(req.params.id, 'id');
      const inviteId = validatePositiveInteger(req.params.inviteId, 'inviteId');

      if (!(await canEditFamily(req.userId!, familyId))) {
        throw new ForbiddenError('You do not have permission to revoke invites for this family.');
      }

      const result = await query(
        'DELETE FROM family_invites WHERE id = $1 AND family_id = $2 RETURNING id',
        [inviteId, familyId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Invite');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
