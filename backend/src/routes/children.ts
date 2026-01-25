/**
 * Children routes
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import type { ChildRow, CreateChildInput, Gender } from '../types/database.js';
import { NotFoundError, ValidationError } from '../middleware/error-handler.js';
import {
  validateRequired,
  validateOptionalString,
  validateDate,
  validateOptionalNumber,
  validatePositiveInteger,
} from '../middleware/validation.js';
import { parsePaginationParams } from '../middleware/query-parser.js';
import { createResponse, createPaginatedResponse } from '../types/api.js';
import { measurementsRouter } from './measurements.js';

export const childrenRouter = express.Router();

// Nest measurements under children
childrenRouter.use('/:childId/measurements', measurementsRouter);

// Nest medical events under children
import { medicalEventsRouter } from './medical-events.js';
childrenRouter.use('/:childId/medical-events', medicalEventsRouter);

/**
 * GET /api/children
 * Get all children with pagination
 * Query params: page, limit
 */
childrenRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req.query);

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM children'
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await query<ChildRow>(
      'SELECT * FROM children ORDER BY name ASC LIMIT $1 OFFSET $2',
      [pagination.limit, pagination.offset]
    );

    const children = result.rows.map(formatChildForResponse);

    res.json(createPaginatedResponse(children, total, pagination));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/children/:id
 * Get a single child by ID
 */
childrenRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    const result = await query<ChildRow>(
      'SELECT * FROM children WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Child');
    }

    res.json(createResponse(formatChildForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/children
 * Create a new child
 */
childrenRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gender = validateRequired(req.body.gender, 'gender') as Gender;
    
    // Validate gender
    if (!['male', 'female'].includes(gender)) {
      throw new ValidationError('gender must be male or female');
    }

    const input: CreateChildInput = {
      name: validateRequired(req.body.name, 'name'),
      date_of_birth: validateDate(req.body.date_of_birth, 'date_of_birth'),
      gender: gender,
      avatar: validateOptionalString(req.body.avatar),
      notes: validateOptionalString(req.body.notes),
      due_date: req.body.due_date ? validateDate(req.body.due_date, 'due_date') : null,
      birth_weight: req.body.birth_weight !== undefined && req.body.birth_weight !== null 
        ? parseFloat(req.body.birth_weight) 
        : null,
      birth_weight_ounces: req.body.birth_weight_ounces !== undefined && req.body.birth_weight_ounces !== null
        ? validateOptionalNumber(req.body.birth_weight_ounces, 'birth_weight_ounces', 0, 15)
        : null,
      birth_height: req.body.birth_height !== undefined && req.body.birth_height !== null 
        ? parseFloat(req.body.birth_height) 
        : null,
    };

    const result = await query<ChildRow>(
      `INSERT INTO children (name, date_of_birth, gender, avatar, notes, due_date, birth_weight, birth_weight_ounces, birth_height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [input.name, input.date_of_birth, input.gender, input.avatar, input.notes, input.due_date, input.birth_weight, input.birth_weight_ounces, input.birth_height]
    );

    res.status(201).json(createResponse(formatChildForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/children/:id
 * Update a child
 */
childrenRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.body.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(validateRequired(req.body.name, 'name'));
    }

    if (req.body.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(validateDate(req.body.date_of_birth, 'date_of_birth'));
    }

    if (req.body.gender !== undefined) {
      const gender = validateOptionalString(req.body.gender) as Gender | null;
      if (gender && !['male', 'female'].includes(gender)) {
        throw new ValidationError('gender must be male or female');
      }
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }

    if (req.body.avatar !== undefined) {
      updates.push(`avatar = $${paramCount++}`);
      values.push(validateOptionalString(req.body.avatar));
    }

    if (req.body.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(validateOptionalString(req.body.notes));
    }

    if (req.body.due_date !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(req.body.due_date ? validateDate(req.body.due_date, 'due_date') : null);
    }

    if (req.body.birth_weight !== undefined) {
      updates.push(`birth_weight = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.birth_weight, 'birth_weight', 0));
    }

    if (req.body.birth_weight_ounces !== undefined) {
      updates.push(`birth_weight_ounces = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.birth_weight_ounces, 'birth_weight_ounces', 0, 15));
    }

    if (req.body.birth_height !== undefined) {
      updates.push(`birth_height = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.birth_height, 'birth_height', 0));
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const result = await query<ChildRow>(
      `UPDATE children
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Child');
    }

    res.json(createResponse(formatChildForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/children/:id
 * Delete a child (cascades to measurements and events)
 */
childrenRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    const result = await query(
      'DELETE FROM children WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Child');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Format child row for API response
 * Converts dates to ISO strings
 */
function formatChildForResponse(row: ChildRow) {
  const parseDecimal = (val: string | null): number | null => {
    if (val === null || val === undefined) return null;
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? null : parsed;
  };

  return {
    id: row.id,
    name: row.name,
    date_of_birth: row.date_of_birth.toISOString().split('T')[0],
    gender: row.gender,
    avatar: row.avatar,
    notes: row.notes,
    due_date: row.due_date ? row.due_date.toISOString().split('T')[0] : null,
    birth_weight: parseDecimal(row.birth_weight),
    birth_weight_ounces: row.birth_weight_ounces,
    birth_height: parseDecimal(row.birth_height),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
