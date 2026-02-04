/**
 * Audit event persistence: write field-level change records to audit_events.
 */

import { query } from '../../../db/connection.js';
import type { AuditChanges } from './field-diff.js';
import { auditChangesSummary } from './field-diff.js';
import { canAccessChild } from '../../families/service/family-access.js';

export type AuditEntityType = 'visit' | 'illness';

export type AuditAction = 'created' | 'updated' | 'deleted';

export interface RecordAuditEventParams {
  entityType: AuditEntityType;
  entityId: number;
  userId: number | null;
  action: AuditAction;
  changes: AuditChanges;
  summary?: string | null;
  requestId?: string | null;
}

/**
 * Check if user has permission to view audit history for an entity.
 * Users can only view history for entities they can access (visits/illnesses
 * for children in their family).
 */
export async function canViewAuditHistory(
  entityType: AuditEntityType,
  entityId: number,
  userId: number | null
): Promise<boolean> {
  if (!userId) return false;

  if (entityType === 'visit') {
    const result = await query<{ child_id: number }>(
      `SELECT child_id FROM visits WHERE id = $1`,
      [entityId]
    );
    if (result.rows.length === 0) return false;
    return canAccessChild(userId, result.rows[0].child_id);
  }

  if (entityType === 'illness') {
    const result = await query<{ child_id: number }>(
      `SELECT child_id FROM illnesses WHERE id = $1`,
      [entityId]
    );
    if (result.rows.length === 0) return false;
    return canAccessChild(userId, result.rows[0].child_id);
  }

  return false;
}

/**
 * Persist one audit event to audit_events.
 * Call after a successful create/update/delete when changes is non-empty (or always for created/deleted).
 */
export async function recordAuditEvent(params: RecordAuditEventParams): Promise<void> {
  const { entityType, entityId, userId, action, changes, requestId } = params;
  const summary = params.summary ?? auditChangesSummary(changes, entityType);

  // Limit individual change value size to prevent excessive storage
  const sanitizedChanges = sanitizeChanges(changes);

  await query(
    `INSERT INTO audit_events (entity_type, entity_id, user_id, action, changes, summary, request_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
    [
      entityType,
      entityId,
      userId,
      action,
      JSON.stringify(sanitizedChanges),
      summary,
      requestId ?? null,
    ]
  );
}

/**
 * Sanitize changes to prevent excessive storage (truncate very long values).
 */
function sanitizeChanges(changes: AuditChanges): AuditChanges {
  const MAX_VALUE_LENGTH = 1000; // Truncate very long values
  const sanitized: AuditChanges = {};
  for (const [key, { before, after }] of Object.entries(changes)) {
    sanitized[key] = {
      before: truncateValue(before, MAX_VALUE_LENGTH),
      after: truncateValue(after, MAX_VALUE_LENGTH),
    };
  }
  return sanitized;
}

/**
 * Truncate string values that exceed maxLength.
 */
function truncateValue(value: unknown, maxLength: number): unknown {
  if (typeof value === 'string' && value.length > maxLength) {
    return value.substring(0, maxLength) + '...';
  }
  return value;
}
