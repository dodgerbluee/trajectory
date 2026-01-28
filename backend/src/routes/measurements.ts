/**
 * Measurements routes
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import type { MeasurementRow, CreateMeasurementInput } from '../types/database.js';
import { NotFoundError } from '../middleware/error-handler.js';
import {
  validateDate,
  validateOptionalString,
  validateOptionalNumber,
  validatePercentile,
  validateWeightOunces,
  validatePositiveInteger,
  validateHasMeasurement,
} from '../middleware/validation.js';
import { 
  parsePaginationParams, 
  parseDateRange,
  buildDateRangeFilter 
} from '../middleware/query-parser.js';
import { createResponse, createPaginatedResponse } from '../types/api.js';

export const measurementsRouter = express.Router({ mergeParams: true });

/**
 * GET /api/children/:childId/measurements
 * Get all measurements for a child with pagination and date filtering
 * Query params: page, limit, start_date, end_date
 */
measurementsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = validatePositiveInteger(req.params.childId, 'childId');
    const pagination = parsePaginationParams(req.query);
    const dateRange = parseDateRange(req.query);

    // Build WHERE clause
    const conditions = ['child_id = $1'];
    const values: unknown[] = [childId];
    let paramIndex = 2;

    const dateFilter = buildDateRangeFilter(dateRange, 'measurement_date', paramIndex);
    if (dateFilter.clause) {
      conditions.push(dateFilter.clause);
      values.push(...dateFilter.values);
      paramIndex = dateFilter.nextIndex;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count with filters
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM measurements WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results with filters
    const result = await query<MeasurementRow>(
      `SELECT * FROM measurements 
       WHERE ${whereClause}
       ORDER BY measurement_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, pagination.limit, pagination.offset]
    );

    const measurements = result.rows.map(formatMeasurementForResponse);

    res.json(createPaginatedResponse(measurements, total, pagination, {
      child_id: childId,
      ...dateRange,
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/measurements/:id
 * Get a single measurement by ID
 */
measurementsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    const result = await query<MeasurementRow>(
      'SELECT * FROM measurements WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Measurement');
    }

    res.json(createResponse(formatMeasurementForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/children/:childId/measurements
 * Create a new measurement
 */
measurementsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = validatePositiveInteger(req.params.childId, 'childId');

    const input: CreateMeasurementInput = {
      child_id: childId,
      measurement_date: validateDate(req.body.measurement_date, 'measurement_date'),
      label: validateOptionalString(req.body.label),
      weight_value: validateOptionalNumber(req.body.weight_value, 'weight_value', 0),
      weight_ounces: validateWeightOunces(req.body.weight_ounces),
      weight_percentile: validatePercentile(req.body.weight_percentile, 'weight_percentile'),
      height_value: validateOptionalNumber(req.body.height_value, 'height_value', 0),
      height_percentile: validatePercentile(req.body.height_percentile, 'height_percentile'),
      head_circumference_value: validateOptionalNumber(
        req.body.head_circumference_value,
        'head_circumference_value',
        0
      ),
      head_circumference_percentile: validatePercentile(
        req.body.head_circumference_percentile,
        'head_circumference_percentile'
      ),
    };

    // Validate at least one measurement is provided
    validateHasMeasurement(
      input.weight_value,
      input.height_value,
      input.head_circumference_value
    );

    const result = await query<MeasurementRow>(
      `INSERT INTO measurements (
        child_id, measurement_date, label,
        weight_value, weight_ounces, weight_percentile,
        height_value, height_percentile,
        head_circumference_value, head_circumference_percentile
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        input.child_id,
        input.measurement_date,
        input.label,
        input.weight_value,
        input.weight_ounces,
        input.weight_percentile,
        input.height_value,
        input.height_percentile,
        input.head_circumference_value,
        input.head_circumference_percentile,
      ]
    );

    res.status(201).json(createResponse(formatMeasurementForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/measurements/:id
 * Update a measurement
 */
measurementsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (req.body.measurement_date !== undefined) {
      updates.push(`measurement_date = $${paramCount++}`);
      values.push(validateDate(req.body.measurement_date, 'measurement_date'));
    }

    if (req.body.label !== undefined) {
      updates.push(`label = $${paramCount++}`);
      values.push(validateOptionalString(req.body.label));
    }

    if (req.body.weight_value !== undefined) {
      updates.push(`weight_value = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.weight_value, 'weight_value', 0));
    }

    if (req.body.weight_ounces !== undefined) {
      updates.push(`weight_ounces = $${paramCount++}`);
      values.push(validateWeightOunces(req.body.weight_ounces));
    }

    if (req.body.weight_percentile !== undefined) {
      updates.push(`weight_percentile = $${paramCount++}`);
      values.push(validatePercentile(req.body.weight_percentile, 'weight_percentile'));
    }

    if (req.body.height_value !== undefined) {
      updates.push(`height_value = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.height_value, 'height_value', 0));
    }

    if (req.body.height_percentile !== undefined) {
      updates.push(`height_percentile = $${paramCount++}`);
      values.push(validatePercentile(req.body.height_percentile, 'height_percentile'));
    }

    if (req.body.head_circumference_value !== undefined) {
      updates.push(`head_circumference_value = $${paramCount++}`);
      values.push(
        validateOptionalNumber(req.body.head_circumference_value, 'head_circumference_value', 0)
      );
    }

    if (req.body.head_circumference_percentile !== undefined) {
      updates.push(`head_circumference_percentile = $${paramCount++}`);
      values.push(
        validatePercentile(req.body.head_circumference_percentile, 'head_circumference_percentile')
      );
    }

    if (updates.length === 0) {
      throw new NotFoundError('Measurement');
    }

    values.push(id);

    const result = await query<MeasurementRow>(
      `UPDATE measurements
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Measurement');
    }

    res.json(createResponse(formatMeasurementForResponse(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/measurements/:id
 * Delete a measurement
 */
measurementsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = validatePositiveInteger(req.params.id, 'id');

    const result = await query(
      'DELETE FROM measurements WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Measurement');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Format measurement row for API response
 * Converts dates to ISO strings and decimals to numbers
 */
function formatMeasurementForResponse(row: MeasurementRow) {
  return {
    id: row.id,
    child_id: row.child_id,
    measurement_date: row.measurement_date.toISOString().split('T')[0],
    label: row.label,
    weight_value: row.weight_value ? parseFloat(row.weight_value) : null,
    weight_ounces: row.weight_ounces,
    weight_percentile: row.weight_percentile ? parseFloat(row.weight_percentile) : null,
    height_value: row.height_value ? parseFloat(row.height_value) : null,
    height_percentile: row.height_percentile ? parseFloat(row.height_percentile) : null,
    head_circumference_value: row.head_circumference_value
      ? parseFloat(row.head_circumference_value)
      : null,
    head_circumference_percentile: row.head_circumference_percentile
      ? parseFloat(row.head_circumference_percentile)
      : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
