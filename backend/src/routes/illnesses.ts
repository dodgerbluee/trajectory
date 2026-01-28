/**
 * Illness Routes - Standalone illness tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { createResponse } from '../types/api.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import type { IllnessRow, CreateIllnessInput, UpdateIllnessInput, IllnessType, HeatmapData, HeatmapDay } from '../types/database.js';
import { illnessRowToIllness } from '../types/database.js';
import { validateOptionalString, validateDate, validateOptionalDate, validateNumber } from '../middleware/validation.js';

const router = Router();

// ============================================================================
// Validation helpers
// ============================================================================

function validateIllnessType(value: unknown): IllnessType {
  if (typeof value !== 'string') {
    throw new BadRequestError('illness_type must be a string');
  }
  const validTypes = ['flu', 'strep', 'rsv', 'covid', 'cold', 'stomach_bug', 'ear_infection', 'hand_foot_mouth', 'croup', 'pink_eye', 'other'];
  if (!validTypes.includes(value)) {
    throw new BadRequestError(`illness_type must be one of: ${validTypes.join(', ')}`);
  }
  return value as IllnessType;
}

// ============================================================================
// GET /api/illnesses - List illnesses with filtering
// ============================================================================

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;
    const illnessType = req.query.illness_type as IllnessType | undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    let queryText = 'SELECT * FROM illnesses WHERE 1=1';
    const queryParams: unknown[] = [];
    let paramCount = 1;

    if (childId) {
      queryText += ` AND child_id = $${paramCount++}`;
      queryParams.push(childId);
    }

    if (illnessType) {
      queryText += ` AND illness_type = $${paramCount++}`;
      queryParams.push(illnessType);
    }

    if (startDate) {
      queryText += ` AND start_date >= $${paramCount++}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      queryText += ` AND (end_date IS NULL OR end_date <= $${paramCount++})`;
      queryParams.push(endDate);
    }

    queryText += ` ORDER BY start_date DESC, id DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);

    const result = await query<IllnessRow>(queryText, queryParams);
    const illnesses = result.rows.map(illnessRowToIllness);

    res.json(createResponse(illnesses));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/illnesses/:id - Get single illness
// ============================================================================

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid illness ID');
    }

    const result = await query<IllnessRow>(
      'SELECT * FROM illnesses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Illness');
    }

    res.json(createResponse(illnessRowToIllness(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/illnesses - Create new illness
// ============================================================================

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateIllnessInput = {
      child_id: parseInt(req.body.child_id),
      illness_type: validateIllnessType(req.body.illness_type),
      start_date: validateDate(req.body.start_date, 'start_date'),
      end_date: validateOptionalDate(req.body.end_date, 'end_date'),
      symptoms: validateOptionalString(req.body.symptoms),
      temperature: req.body.temperature !== undefined && req.body.temperature !== null 
        ? validateNumber(req.body.temperature, 'temperature', 95, 110)
        : null,
      severity: req.body.severity !== undefined && req.body.severity !== null
        ? validateNumber(req.body.severity, 'severity', 1, 10)
        : null,
      visit_id: req.body.visit_id ? parseInt(req.body.visit_id) : null,
      notes: validateOptionalString(req.body.notes),
    };

    // Validate child exists
    const childCheck = await query<{ id: number }>(
      'SELECT id FROM children WHERE id = $1',
      [input.child_id]
    );
    if (childCheck.rows.length === 0) {
      throw new NotFoundError('Child');
    }

    // Validate visit exists if provided
    if (input.visit_id) {
      const visitCheck = await query<{ id: number }>(
        'SELECT id FROM visits WHERE id = $1',
        [input.visit_id]
      );
      if (visitCheck.rows.length === 0) {
        throw new NotFoundError('Visit');
      }
    }

    // Validate end_date >= start_date
    if (input.end_date && input.end_date < input.start_date) {
      throw new BadRequestError('end_date must be greater than or equal to start_date');
    }

    const result = await query<IllnessRow>(
      `INSERT INTO illnesses (
        child_id, illness_type, start_date, end_date, symptoms, temperature, severity, visit_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        input.child_id,
        input.illness_type,
        input.start_date,
        input.end_date,
        input.symptoms,
        input.temperature,
        input.severity,
        input.visit_id,
        input.notes,
      ]
    );

    res.status(201).json(createResponse(illnessRowToIllness(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/illnesses/:id - Update illness
// ============================================================================

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid illness ID');
    }

    // Check illness exists
    const existing = await query<IllnessRow>(
      'SELECT * FROM illnesses WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      throw new NotFoundError('Illness');
    }

    const existingIllness = illnessRowToIllness(existing.rows[0]);
    const input: UpdateIllnessInput = {};

    if (req.body.illness_type !== undefined) {
      input.illness_type = validateIllnessType(req.body.illness_type);
    }
    if (req.body.start_date !== undefined) {
      input.start_date = validateDate(req.body.start_date, 'start_date');
    }
    if (req.body.end_date !== undefined) {
      input.end_date = validateOptionalDate(req.body.end_date, 'end_date');
    }
    if (req.body.symptoms !== undefined) {
      input.symptoms = validateOptionalString(req.body.symptoms);
    }
    if (req.body.temperature !== undefined) {
      input.temperature = req.body.temperature !== null
        ? validateNumber(req.body.temperature, 'temperature', 95, 110)
        : null;
    }
    if (req.body.severity !== undefined) {
      input.severity = req.body.severity !== null
        ? validateNumber(req.body.severity, 'severity', 1, 10)
        : null;
    }
    if (req.body.visit_id !== undefined) {
      input.visit_id = req.body.visit_id ? parseInt(req.body.visit_id) : null;
    }
    if (req.body.notes !== undefined) {
      input.notes = validateOptionalString(req.body.notes);
    }

    // Validate visit exists if provided
    if (input.visit_id !== undefined && input.visit_id !== null) {
      const visitCheck = await query<{ id: number }>(
        'SELECT id FROM visits WHERE id = $1',
        [input.visit_id]
      );
      if (visitCheck.rows.length === 0) {
        throw new NotFoundError('Visit');
      }
    }

    // Validate end_date >= start_date
    const startDate = input.start_date || existingIllness.start_date;
    const endDate = input.end_date !== undefined ? input.end_date : existingIllness.end_date;
    if (endDate && endDate < startDate) {
      throw new BadRequestError('end_date must be greater than or equal to start_date');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (input.illness_type !== undefined) {
      updates.push(`illness_type = $${paramCount++}`);
      values.push(input.illness_type);
    }
    if (input.start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(input.start_date);
    }
    if (input.end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(input.end_date);
    }
    if (input.symptoms !== undefined) {
      updates.push(`symptoms = $${paramCount++}`);
      values.push(input.symptoms);
    }
    if (input.temperature !== undefined) {
      updates.push(`temperature = $${paramCount++}`);
      values.push(input.temperature);
    }
    if (input.severity !== undefined) {
      updates.push(`severity = $${paramCount++}`);
      values.push(input.severity);
    }
    if (input.visit_id !== undefined) {
      updates.push(`visit_id = $${paramCount++}`);
      values.push(input.visit_id);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(input.notes);
    }

    if (updates.length === 0) {
      // No updates provided, return existing
      res.json(createResponse(existingIllness));
      return;
    }

    values.push(id);
    const queryText = `UPDATE illnesses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await query<IllnessRow>(queryText, values);
    res.json(createResponse(illnessRowToIllness(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/illnesses/:id - Delete illness
// ============================================================================

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid illness ID');
    }

    const result = await query<{ id: number }>(
      'DELETE FROM illnesses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Illness');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/illnesses/metrics/heatmap - Get heatmap data for year
// ============================================================================

router.get('/metrics/heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;

    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestError('Invalid year');
    }

    // Generate date series for the year
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;
    const currentDate = new Date().toISOString().split('T')[0];

    // Query to get all days where children were sick
    // When all children: return whole number count
    // When single child: return severity (1-10) for color intensity
    const queryText = childId
      ? `
        WITH date_series AS (
          SELECT generate_series(
            $1::date,
            LEAST($2::date, $3::date),
            '1 day'::interval
          )::date AS date
        ),
        illness_days AS (
          SELECT 
            d.date,
            i.child_id,
            COALESCE(i.severity, 5) as severity -- Default to 5 if severity is null
          FROM date_series d
          INNER JOIN illnesses i ON i.start_date <= d.date
            AND (i.end_date IS NULL OR i.end_date >= d.date)
            AND i.child_id = $4
        )
        SELECT 
          date::text as date,
          MAX(severity) as severity_value,
          ARRAY_AGG(DISTINCT child_id) as children
        FROM illness_days
        GROUP BY date
        ORDER BY date
      `
      : `
        WITH date_series AS (
          SELECT generate_series(
            $1::date,
            LEAST($2::date, $3::date),
            '1 day'::interval
          )::date AS date
        ),
        illness_days AS (
          SELECT 
            d.date,
            i.child_id
          FROM date_series d
          INNER JOIN illnesses i ON i.start_date <= d.date
            AND (i.end_date IS NULL OR i.end_date >= d.date)
        )
        SELECT 
          date::text as date,
          COUNT(DISTINCT child_id) as count,
          ARRAY_AGG(DISTINCT child_id) as children
        FROM illness_days
        GROUP BY date
        ORDER BY date
      `;

    const params = childId 
      ? [startOfYear, endOfYear, currentDate, childId]
      : [startOfYear, endOfYear, currentDate];

    // For single child: use severity (1-10) directly
    // For all children: use whole number count
    let days: HeatmapDay[];
    
    if (childId) {
      const result = await query<{ date: string; severity_value: string; children: number[] }>(queryText, params);
      days = result.rows.map(row => ({
        date: row.date,
        count: parseFloat(row.severity_value || '0'), // Severity value (1-10)
        children: row.children || [],
      }));
    } else {
      const result = await query<{ date: string; count: number; children: number[] }>(queryText, params);
      days = result.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count.toString()), // Whole number count
        children: row.children || [],
      }));
    }

    const maxCount = days.length > 0 ? Math.max(...days.map(d => d.count)) : 0;

    const heatmapData: HeatmapData = {
      year,
      days,
      totalDays: days.length,
      maxCount,
    };

    res.json(createResponse(heatmapData));
  } catch (error) {
    next(error);
  }
});

export default router;
