/**
 * Generic field-level diff for audit: compare previous persisted state vs incoming update.
 * No hardcoded field names; works for Visit, Illness, and future entities.
 *
 * Partial updates / multiple forms:
 * - Only keys present in the payload are considered. Omitted keys are never treated as
 *   deletions or changes — so different forms can send different subsets of fields.
 * - A key is "explicitly updated" only when it appears in the request body (even if null).
 */

/** Stored shape: one entry per changed field */
export type AuditChanges = Record<string, { before: unknown; after: unknown }>;

const DEFAULT_EXCLUDE_KEYS = new Set(['id', 'created_at', 'updated_at']);

/** ISO date-only regex (YYYY-MM-DD) */
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check if a value is "effectively empty" - recursively checks objects/arrays
 * to see if all nested values are null, undefined, empty strings, or other effectively empty structures.
 * This helps suppress noisy diffs from objects like { od: { sphere: null, ... }, os: { sphere: null, ... } }
 * which should be treated as equivalent to null.
 */
function isEffectivelyEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && !Number.isFinite(value)) return true;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEffectivelyEmpty);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    // Check all keys - if any value is not effectively empty, the whole object is not empty
    // Also handle undefined values (which won't be in Object.keys but might be in the object)
    for (const key of keys) {
      const val = obj[key];
      // Skip undefined (not enumerable) and check if value is effectively empty
      if (val !== undefined && !isEffectivelyEmpty(val)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Normalize a value for comparison so DB/API representation differences don't cause false diffs.
 * - Dates → ISO date string (YYYY-MM-DD); date-like strings normalized to same form
 * - Numbers from strings → number
 * - Strings → trimmed for comparison
 * - Arrays/objects → stable JSON string (sorted keys for objects)
 * - null/undefined/empty string → null
 * - Objects/arrays with only null/empty values → null (suppresses noisy diffs)
 */
export function normalizeForCompare(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Normalize whitespace: collapse multiple spaces/newlines/tabs to single space
    // This prevents noisy diffs from whitespace-only changes
    const normalized = trimmed.replace(/\s+/g, ' ');
    
    // Normalize date-like strings to YYYY-MM-DD so "2026-01-15" and "2026-01-15T00:00:00.000Z" compare equal
    if (DATE_ONLY_REGEX.test(normalized)) return normalized;
    // Try to parse as number before treating as date (so "100" and "24.5" become numbers, not year 100)
    const n = parseFloat(normalized);
    if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(normalized)) return n;
    const asDate = new Date(normalized);
    if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().split('T')[0];

    return normalized;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (Array.isArray(value)) {
    // If array is effectively empty, normalize to null
    if (isEffectivelyEmpty(value)) return null;
    const normalized = value.map(normalizeForCompare);
    return JSON.stringify(normalized);
  }
  if (typeof value === 'object') {
    // If object is effectively empty (all nested values are null/empty), normalize to null
    // This suppresses diffs like { od: { sphere: null, ... }, os: { sphere: null, ... } } vs null
    if (isEffectivelyEmpty(value)) return null;
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const obj: Record<string, unknown> = {};
    for (const k of keys) {
      const normalized = normalizeForCompare((value as Record<string, unknown>)[k]);
      // Filter out null/undefined values to ensure consistent serialization
      // This ensures { notes: null } and { } serialize the same way
      if (normalized !== null && normalized !== undefined) {
        obj[k] = normalized;
      }
    }
    // If after filtering all keys are gone, treat as null
    if (Object.keys(obj).length === 0) return null;
    return JSON.stringify(obj);
  }
  return value;
}

/**
 * Normalize only "empty" values to null for diff storage (so after: null for removal).
 * Leaves arrays and objects as-is; used for the "after" field so tests and API get raw values.
 */
function emptyToNull(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

/**
 * Compare two values (after normalization) for equality.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  if (na === null || nb === null) return na === nb;
  if (typeof na === 'object' || typeof nb === 'object') {
    return JSON.stringify(na) === JSON.stringify(nb);
  }
  return na === nb;
}

export interface BuildFieldDiffOptions {
  /** Keys to skip (e.g. id, created_at, updated_at, child_id for visits) */
  excludeKeys?: string[];
}

/**
 * Build a structured diff object from current (persisted) state and incoming payload.
 *
 * Only keys present in payload are considered — omitted keys are never treated as deletions.
 * Use this for partial updates: each form sends only the fields it edits; only those fields
 * are compared and recorded.
 *
 * For each key in payload we detect:
 * - added: current had no value → { before: null, after }
 * - modified: both present but different (after normalization) → { before, after }
 * - removed/cleared: payload value is null/empty → { before, after: null }
 *
 * @param current - Full current record (API/shape from DB); pass as Record<string, unknown> if needed
 * @param payload - Incoming update; must contain only keys that were explicitly sent in the request
 * @param options - excludeKeys to skip (default: id, created_at, updated_at)
 * @returns Object keyed by field name, value { before, after } for storage in audit_events.changes
 */
export function buildFieldDiff(
  current: Record<string, unknown>,
  payload: Record<string, unknown>,
  options?: BuildFieldDiffOptions
): AuditChanges {
  const exclude = new Set([
    ...DEFAULT_EXCLUDE_KEYS,
    ...(options?.excludeKeys ?? []),
  ]);
  const changes: AuditChanges = {};

  // Iterate only over payload keys — omitted fields are never considered (no false deletions)
  for (const key of Object.keys(payload)) {
    if (exclude.has(key)) continue;

    const afterVal = payload[key];
    const beforeVal = current[key];

    if (valuesEqual(beforeVal, afterVal)) continue;

    // Additional check: if both values are effectively empty, skip this change
    // This catches edge cases where normalization might not fully suppress the diff
    if (shouldFilterChange(beforeVal, afterVal)) continue;

    changes[key] = {
      before: beforeVal === undefined ? null : beforeVal,
      after: emptyToNull(afterVal),
    };
  }

  return changes;
}

/**
 * Build a short summary string from the changes object.
 * Filters out effectively empty changes (e.g., vision_refraction with all null values) before generating summary.
 * When we have field-level change data, returns a detailed description (e.g. "Updated visit_date, notes").
 * When we have no usable keys (e.g. legacy entry), returns empty; API can fall back to stored summary or "Updated visit".
 *
 * @param changes - The audit changes object
 * @param _entityType - Optional entity type ('visit' or 'illness'); reserved for future fallback when no keys
 */
export function auditChangesSummary(changes: AuditChanges, _entityType?: 'visit' | 'illness'): string {
  // Filter out effectively empty changes before generating summary
  const filteredKeys = Object.keys(changes).filter(key => {
    const change = changes[key];
    return !shouldFilterChange(change.before, change.after);
  });

  if (filteredKeys.length === 0) return '';

  // When we have change data, show what was updated (not generic "Updated visit")
  if (filteredKeys.length <= 3) {
    return `Updated ${filteredKeys.join(', ')}`;
  }
  return `Updated ${filteredKeys.length} fields: ${filteredKeys.slice(0, 3).join(', ')}...`;
}

/**
 * Helper function to check if a change should be filtered out (both before and after are effectively empty).
 * Exported for use in other modules.
 */
export function shouldFilterChange(before: unknown, after: unknown): boolean {
  return isEffectivelyEmpty(before) && isEffectivelyEmpty(after);
}
