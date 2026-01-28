/**
 * Medical events routes
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import type { MedicalEventRow, CreateMedicalEventInput, EventType } from '../types/database.js';
import { NotFoundError } from '../middleware/error-handler.js';
import {
  validateRequired,
  validateDate,
  validateOptionalDate,
  validateEnum,
  validatePositiveInteger,
  validateDateRange,
} from '../middleware/validation.js';
import { 
  parsePaginationParams, 
  parseDateRange,
  buildDateRangeFilter 
} from '../middleware/query-parser.js';
import { createResponse, createPaginatedResponse } from '../types/api.js';

export const medicalEventsRouter = express.Router({ mergeParams: true });

const EVENT_TYPES = ['doctor_visit', 'illness'] as const;

/**
 * GET /api/children/:childId/medical-events
 * Get all medical events for a child with pagination and date filtering
 * Query params: page, limit, start_date, end_date, event_type
 */
medicalEventsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = validatePositiveInteger(req.params.childId, 'childId');
    const pagination = parsePaginationParams(req.query);
    const dateRange = parseDateRange(req.query);

    // Build WHERE clause
    const conditions = ['child_id = $1'];
    const values: unknown[] = [childId];
    let paramIndex = 2;

    // Date range filter on start_date
    const dateFilter = buildDateRangeFilter(dateRange, 'start_date', paramIndex);
    if (dateFilter.clause) {
      conditions.push(dateFilter.clause);
      values.push(...dateFilter.values);
      paramIndex = dateFilter.nextIndex;
    }

    // Optional event_type filter
    if (req.query.event_type) {
      const eventType = validateEnum<EventType>(
        req.query.event_type,
        'event_type',
        EVENT_TYPES
      );
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(eventType);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count with filters
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM medical_events WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results with filters
    const result = await query<MedicalEventRow>(
      `SELECT * FROM medical_events 
       WHERE ${whereClause}
       ORDER BY start_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, pagination.limit, pagination.offset]
    );

    const events = result.rows.map(formatEventForResponse);

    res.json(createPaginatedResponse(events, total, pagination, {
      child_id: childId,
      ...dateRange,
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/medical-events/:id
 * Get a single medical event by ID
 */
medicalEventsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    const result = await query<MedicalEventRow>(
      'SELECT * FROM medical_events WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Medical event');
    }

    res.json(createResponse(formatEventForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/children/:childId/medical-events
 * Create a new medical event
 */
medicalEventsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = validatePositiveInteger(req.params.childId, 'childId');

    const input: CreateMedicalEventInput = {
      child_id: childId,
      event_type: validateEnum<EventType>(req.body.event_type, 'event_type', EVENT_TYPES),
      start_date: validateDate(req.body.start_date, 'start_date'),
      end_date: validateOptionalDate(req.body.end_date, 'end_date'),
      description: validateRequired(req.body.description, 'description'),
    };

    // Validate date range
    validateDateRange(input.start_date, input.end_date);

    const result = await query<MedicalEventRow>(
      `INSERT INTO medical_events (
        child_id, event_type, start_date, end_date, description
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        input.child_id,
        input.event_type,
        input.start_date,
        input.end_date,
        input.description,
      ]
    );

    res.status(201).json(createResponse(formatEventForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/medical-events/:id
 * Update a medical event
 */
medicalEventsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (req.body.event_type !== undefined) {
      updates.push(`event_type = $${paramCount++}`);
      values.push(validateEnum<EventType>(req.body.event_type, 'event_type', EVENT_TYPES));
    }

    if (req.body.start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(validateDate(req.body.start_date, 'start_date'));
    }

    if (req.body.end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(validateOptionalDate(req.body.end_date, 'end_date'));
    }

    if (req.body.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(validateRequired(req.body.description, 'description'));
    }

    if (updates.length === 0) {
      throw new NotFoundError('Medical event');
    }

    values.push(id);

    const result = await query<MedicalEventRow>(
      `UPDATE medical_events
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Medical event');
    }

    res.json(createResponse(formatEventForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/medical-events/:id
 * Delete a medical event
 */
medicalEventsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    const result = await query(
      'DELETE FROM medical_events WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Medical event');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Format medical event row for API response
 * Converts dates to ISO strings
 */
function formatEventForResponse(row: MedicalEventRow) {
  return {
    id: row.id,
    child_id: row.child_id,
    event_type: row.event_type,
    start_date: row.start_date.toISOString().split('T')[0],
    end_date: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
    description: row.description,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
