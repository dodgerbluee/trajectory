/**
 * /api/me/* — endpoints scoped to the authenticated user's own profile state.
 *
 * Currently used for the "self-record" prompt that fires on first login when
 * the user has no children row with user_id = users.id. Either accepts the
 * profile (creating the self-row) or dismisses it (sets
 * users.self_record_prompt_dismissed = TRUE so we don't re-prompt).
 */

import express from 'express';
import type { Response } from 'express';
import { query } from '../db/connection.js';
import { ConflictError } from '../middleware/error-handler.js';
import {
  validateRequired,
  validateDate,
  validateEnum,
} from '../middleware/validation.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { createResponse } from '../types/api.js';
import { createSelfChildForUser } from '../features/families/service/family-access.js';

export const meRouter = express.Router();

meRouter.use(authenticate);

const GENDER_VALUES = ['male', 'female'] as const;

/**
 * POST /api/me/self-record
 * Body: { name, date_of_birth (YYYY-MM-DD), gender ('male' | 'female') }
 * Creates the authenticated user's self-child row. 409 if one already exists.
 *
 * Atomic via children_user_id_unique + ON CONFLICT inside
 * createSelfChildForUser, so racing requests from the same user always
 * resolve to one inserted row + one 409.
 */
meRouter.post(
  '/self-record',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    const name = validateRequired(req.body?.name, 'name');
    const date_of_birth = validateDate(req.body?.date_of_birth, 'date_of_birth');
    const gender = validateEnum(req.body?.gender, 'gender', GENDER_VALUES);

    const childId = await createSelfChildForUser(userId, {
      name,
      date_of_birth,
      gender,
    });

    if (childId == null) {
      // ON CONFLICT path: the row already existed. Mark the prompt dismissed
      // anyway so the client stops showing it on next /api/auth/me refresh.
      await query(
        'UPDATE users SET self_record_prompt_dismissed = TRUE WHERE id = $1',
        [userId]
      );
      throw new ConflictError('Self-record already exists');
    }

    // Mark the prompt as handled.
    await query(
      'UPDATE users SET self_record_prompt_dismissed = TRUE WHERE id = $1',
      [userId]
    );

    res.status(201).json(createResponse({ childId }));
  })
);

/**
 * POST /api/me/self-record/dismiss
 * Mark the self-record prompt as dismissed for the current user. Idempotent.
 */
meRouter.post(
  '/self-record/dismiss',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await query(
      'UPDATE users SET self_record_prompt_dismissed = TRUE WHERE id = $1',
      [req.userId!]
    );
    res.json(createResponse({ dismissed: true }));
  })
);
