/**
 * Query parameter parsing utilities
 */

import { ValidationError } from './error-handler.js';
import type { DateRangeParams } from '../types/api.js';
import { parsePaginationParams } from '../types/api.js';
import type { ParsedQs } from 'qs';

/**
 * Parse date range from query parameters
 */
export function parseDateRange(query: ParsedQs): DateRangeParams {
  const params: DateRangeParams = {};

  const startVal = query.start_date;
  const start =
    typeof startVal === 'string' ? startVal :
    Array.isArray(startVal) && typeof startVal[0] === 'string' ? startVal[0] :
    undefined;

  if (start) {
    if (!isValidDateString(start)) {
      throw new ValidationError('start_date must be in YYYY-MM-DD format');
    }
    params.start_date = start;
  }

  const endVal = query.end_date;
  const end =
    typeof endVal === 'string' ? endVal :
    Array.isArray(endVal) && typeof endVal[0] === 'string' ? endVal[0] :
    undefined;

  if (end) {
    if (!isValidDateString(end)) {
      throw new ValidationError('end_date must be in YYYY-MM-DD format');
    }
    params.end_date = end;
  }

  // Validate range if both are provided
  if (params.start_date && params.end_date) {
    const start = new Date(params.start_date);
    const end = new Date(params.end_date);
    
    if (end < start) {
      throw new ValidationError('end_date must be greater than or equal to start_date');
    }
  }

  return params;
}

/**
 * Validate date string format
 */
function isValidDateString(value: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return false;
  }
  
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Build SQL WHERE clause for date range filtering
 */
export function buildDateRangeFilter(
  dateRange: DateRangeParams,
  dateColumn: string,
  startIndex: number
): { clause: string; values: string[]; nextIndex: number } {
  const conditions: string[] = [];
  const values: string[] = [];
  let paramIndex = startIndex;

  if (dateRange.start_date) {
    conditions.push(`${dateColumn} >= $${paramIndex++}`);
    values.push(dateRange.start_date);
  }

  if (dateRange.end_date) {
    conditions.push(`${dateColumn} <= $${paramIndex++}`);
    values.push(dateRange.end_date);
  }

  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : '',
    values,
    nextIndex: paramIndex,
  };
}

/**
 * Export pagination parser for convenience
 */
export { parsePaginationParams };
