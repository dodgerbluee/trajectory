/**
 * Illness Routes - Standalone illness tracking
 * All endpoints require auth; data is scoped to the user's family (children they can access).
 */

import { Router, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { createResponse, createPaginatedResponse, parsePaginationParams, type AuditHistoryEvent } from '../types/api.js';
import { canViewAuditHistory } from '../lib/audit.js';
import { UnauthorizedError, ConflictError } from '../middleware/error-handler.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler.js';
import type { IllnessRow, CreateIllnessInput, UpdateIllnessInput, IllnessType, HeatmapData, HeatmapDay } from '../types/database.js';
import { illnessRowToIllness } from '../types/database.js';
import { validateOptionalString, validateDate, validateOptionalDate, validateNumber } from '../middleware/validation.js';
import { buildFieldDiff, auditChangesSummary } from '../lib/field-diff.js';
import { recordAuditEvent } from '../lib/audit.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { getAccessibleChildIds, canAccessChild, canEditChild } from '../lib/family-access.js';

const router = Router();
router.use(authenticate);

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

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accessibleChildIds = await getAccessibleChildIds(req.userId!);
    if (accessibleChildIds.length === 0) {
      return res.json(createResponse([]));
    }

    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;
    const illnessType = req.query.illness_type as IllnessType | undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    let queryText = 'SELECT * FROM illnesses WHERE child_id = ANY($1::int[])';
    const queryParams: unknown[] = [accessibleChildIds];
    let paramCount = 2;

    if (childId) {
      if (!accessibleChildIds.includes(childId)) {
        return res.json(createResponse([]));
      }
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

    return res.json(createResponse(illnesses));
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// GET /api/illnesses/:id/history - Get change history (audit_events) for an illness
// ============================================================================

router.get('/:id/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid illness ID');
    }

    if (!await canViewAuditHistory('illness', id, req.userId ?? null)) {
      throw new UnauthorizedError('You do not have permission to view this history');
    }

    // Parse pagination params (default: page=1, limit=50, max=200)
    const pagination = parsePaginationParams(req.query);
    const maxLimit = 200; // Higher limit for history than default
    const limit = Math.min(maxLimit, pagination.limit);
    const offset = (pagination.page - 1) * limit;

    // Get total count for pagination metadata
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM audit_events
       WHERE entity_type = 'illness' AND entity_id = $1`,
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await query<{
      id: string;
      entity_type: string;
      entity_id: number;
      user_id: number | null;
      action: string;
      changed_at: Date;
      changes: unknown;
      summary: string | null;
      user_name: string | null;
      user_email: string | null;
    }>(
      `SELECT 
        ae.id,
        ae.entity_type,
        ae.entity_id,
        ae.user_id,
        ae.action,
        ae.changed_at,
        ae.changes,
        ae.summary,
        u.username as user_name,
        u.email as user_email
       FROM audit_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.entity_type = 'illness' AND ae.entity_id = $1
       ORDER BY ae.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const data: AuditHistoryEvent[] = result.rows.map(row => {
      const changes = (row.changes as Record<string, { before: unknown; after: unknown }>) ?? {};
      // Regenerate summary from changes to filter out effectively empty changes
      // This fixes old audit events that were created before the filtering logic
      const regeneratedSummary = auditChangesSummary(changes, 'illness');
      // Use regenerated summary if available, otherwise fall back to stored summary
      const summary = regeneratedSummary || row.summary;
      
      return {
        id: Number(row.id),
        entity_type: 'illness' as const,
        entity_id: row.entity_id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        action: row.action as AuditHistoryEvent['action'],
        changed_at: row.changed_at.toISOString(),
        changes,
        summary,
      };
    });

    res.json(createPaginatedResponse(data, total, { ...pagination, limit, offset }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/illnesses/:id - Get single illness
// ============================================================================

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    const illness = result.rows[0];
    if (!(await canAccessChild(req.userId!, illness.child_id))) {
      throw new NotFoundError('Illness');
    }

    res.json(createResponse(illnessRowToIllness(illness)));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/illnesses - Create new illness
// ============================================================================

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const childId = parseInt(req.body.child_id);
    if (!(await canAccessChild(req.userId!, childId))) {
      throw new NotFoundError('Child');
    }
    if (!(await canEditChild(req.userId!, childId))) {
      throw new ForbiddenError('You do not have permission to add illnesses for this child.');
    }

    const input: CreateIllnessInput = {
      child_id: childId,
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

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid illness ID');
    }

    const existing = await query<IllnessRow & { updated_at: Date }>(
      'SELECT *, updated_at FROM illnesses WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      throw new NotFoundError('Illness');
    }

    const existingRow = existing.rows[0];
    if (!(await canAccessChild(req.userId!, existingRow.child_id))) {
      throw new NotFoundError('Illness');
    }
    const existingIllness = illnessRowToIllness(existingRow);

    // Optimistic locking: check if client's version matches server's version
    const clientUpdatedAt = req.body.updated_at;
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      const serverTime = existingRow.updated_at;
      
      // Check for conflicts (client's version is stale)
      if (Math.abs(clientTime.getTime() - serverTime.getTime()) > 1000) { // 1 second tolerance
        throw new ConflictError(
          'Illness was modified by another user. Please refresh and try again.',
          { 
            currentVersion: serverTime.toISOString(),
            yourVersion: clientUpdatedAt 
          }
        );
      }
    }
    // Only add to input when req.body.X !== undefined so omitted fields are never tracked (partial updates / multiple forms).
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
    
    // Include updated_at in WHERE clause for optimistic locking
    const whereClause = clientUpdatedAt
      ? `WHERE id = $${paramCount} AND updated_at = $${paramCount + 1}`
      : `WHERE id = $${paramCount}`;
    const whereParams = clientUpdatedAt
      ? [...values, existingRow.updated_at]
      : values;
    
    const queryText = `UPDATE illnesses SET ${updates.join(', ')}, updated_at = NOW() ${whereClause} RETURNING *`;

    const result = await query<IllnessRow>(queryText, whereParams);
    
    if (result.rows.length === 0) {
      // No rows updated = conflict detected (if optimistic locking was used) or not found
      if (clientUpdatedAt) {
        throw new ConflictError(
          'Illness was modified by another user. Please refresh and try again.'
        );
      }
      throw new NotFoundError('Illness');
    }
    const updatedIllness = illnessRowToIllness(result.rows[0]);

    // Field-level audit: diff previous state vs incoming update, persist to audit_events
    const changes = buildFieldDiff(
      existingIllness as unknown as Record<string, unknown>,
      input as unknown as Record<string, unknown>,
      { excludeKeys: ['child_id'] }
    );
    if (Object.keys(changes).length > 0) {
      await recordAuditEvent({
        entityType: 'illness',
        entityId: id,
        userId: req.userId ?? null,
        action: 'updated',
        changes,
      });
    }

    res.json(createResponse(updatedIllness));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/illnesses/:id - Delete illness
// ============================================================================

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid illness ID');
    }

    const existing = await query<{ child_id: number }>('SELECT child_id FROM illnesses WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundError('Illness');
    }
    if (!(await canAccessChild(req.userId!, existing.rows[0].child_id))) {
      throw new NotFoundError('Illness');
    }
    if (!(await canEditChild(req.userId!, existing.rows[0].child_id))) {
      throw new ForbiddenError('You do not have permission to delete this illness.');
    }

    await query('DELETE FROM illnesses WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/illnesses/metrics/heatmap - Get heatmap data for year
// ============================================================================

router.get('/metrics/heatmap', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accessibleChildIds = await getAccessibleChildIds(req.userId!);
    if (accessibleChildIds.length === 0) {
      return res.json(createResponse({ year: req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear(), days: [], totalDays: 0, maxCount: 0 }));
    }

    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;

    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestError('Invalid year');
    }
    if (childId && !accessibleChildIds.includes(childId)) {
      throw new BadRequestError('Invalid child_id');
    }

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;
    const currentDate = new Date().toISOString().split('T')[0];

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
            AND i.child_id = ANY($4::int[])
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
      : [startOfYear, endOfYear, currentDate, accessibleChildIds];

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

    return res.json(createResponse(heatmapData));
  } catch (error) {
    return next(error);
  }
});

export default router;
