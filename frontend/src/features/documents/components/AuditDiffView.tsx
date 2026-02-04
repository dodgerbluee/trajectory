/**
 * AuditDiffView - Renders field-level before/after diffs for change history.
 * Supports text, numbers, dates, booleans, arrays, and null/empty values.
 */

import { formatDate } from '@lib/date-utils';
import styles from './AuditDiffView.module.css';

export interface AuditDiffViewProps {
  /** Field-level changes: { fieldName: { before, after } } */
  changes: Record<string, { before: unknown; after: unknown }>;
  /** Optional map of field names to human-readable labels */
  fieldLabels?: Record<string, string>;
  /** Optional custom formatter for specific fields */
  formatValue?: (field: string, value: unknown) => string;
}

type ChangeType = 'added' | 'removed' | 'changed';

/**
 * Determine change type: added (before null/undefined), removed (after null/empty), or changed.
 */
function getChangeType(before: unknown, after: unknown): ChangeType {
  const beforeEmpty = before === null || before === undefined || before === '';
  const afterEmpty = after === null || after === undefined || after === '';
  
  if (beforeEmpty && !afterEmpty) return 'added';
  if (!beforeEmpty && afterEmpty) return 'removed';
  return 'changed';
}

/**
 * Format a value for display based on its type.
 */
function formatValueForDisplay(value: unknown, fieldName: string): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'number') {
    // Special handling for dates that might be stored as numbers (timestamps)
    // But typically dates come as strings, so this is mainly for numeric fields
    return String(value);
  }
  
  if (typeof value === 'string') {
    // Check if it's a date string (YYYY-MM-DD or ISO format)
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      const formatted = formatDate(value);
      return formatted === 'Invalid Date' ? value : formatted;
    }
    return value;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)';
    return value.map(v => formatValueForDisplay(v, fieldName)).join(', ');
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  
  return String(value);
}

/**
 * Get human-readable field label (capitalize and replace underscores).
 */
function getFieldLabel(fieldName: string, fieldLabels?: Record<string, string>): string {
  if (fieldLabels?.[fieldName]) {
    return fieldLabels[fieldName];
  }
  
  // Convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a value is effectively empty (null, undefined, empty string, or object/array with only empty values).
 * This helps filter out noisy changes like vision_refraction with all null values.
 */
function isEffectivelyEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEffectivelyEmpty);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    return keys.every(key => isEffectivelyEmpty(obj[key]));
  }
  return false;
}

/**
 * Check if a change entry should be filtered out (both before and after are effectively empty).
 */
function shouldFilterChange(before: unknown, after: unknown): boolean {
  return isEffectivelyEmpty(before) && isEffectivelyEmpty(after);
}

function AuditDiffView({ changes, fieldLabels, formatValue }: AuditDiffViewProps) {
  // Filter out effectively empty changes (e.g., vision_refraction with all null values)
  const filteredChanges = Object.entries(changes).filter(([_, change]) => 
    !shouldFilterChange(change.before, change.after)
  );
  
  if (filteredChanges.length === 0) {
    return (
      <div className={styles.empty} data-audit-diff>
        <span className={styles.emptyText}>No field changes</span>
      </div>
    );
  }

  return (
    <div className={styles.root} data-audit-diff>
      {filteredChanges.map(([fieldName, change]) => {
        const { before, after } = change;
        const changeType = getChangeType(before, after);
        const label = getFieldLabel(fieldName, fieldLabels);
        
        // Use custom formatter if provided, otherwise use default
        const beforeFormatted = formatValue 
          ? formatValue(fieldName, before)
          : formatValueForDisplay(before, fieldName);
        const afterFormatted = formatValue
          ? formatValue(fieldName, after)
          : formatValueForDisplay(after, fieldName);
        
        const fieldClass = [
          styles.field,
          changeType === 'added' && styles.fieldAdded,
          changeType === 'removed' && styles.fieldRemoved,
          changeType === 'changed' && styles.fieldChanged,
        ].filter(Boolean).join(' ');
        
        return (
          <div key={fieldName} className={fieldClass}>
            <div className={styles.fieldLabel}>{label}</div>
            <div className={styles.fieldValues}>
              {changeType === 'added' ? (
                <>
                  <span className={styles.before}>—</span>
                  <span className={styles.arrow}>→</span>
                  <span className={`${styles.after} ${styles.afterAdded}`}>{afterFormatted}</span>
                </>
              ) : changeType === 'removed' ? (
                <>
                  <span className={`${styles.before} ${styles.beforeRemoved}`}>{beforeFormatted}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.after}>—</span>
                </>
              ) : (
                <>
                  <span className={`${styles.before} ${styles.beforeChanged}`}>{beforeFormatted}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={`${styles.after} ${styles.afterChanged}`}>{afterFormatted}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AuditDiffView;
