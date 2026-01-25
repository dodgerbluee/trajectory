/**
 * Query parameter parsing utilities
 */

import { ValidationError } from './error-handler.js';
import type { DateRangeParams } from '../types/api.js';
import { parsePaginationParams } from '../types/api.js';

/**
 * Parse date range from query parameters
 */
export function parseDateRange(query: any): DateRangeParams {
  const params: DateRangeParams = {};

  if (query.start_date) {
    if (!isValidDateString(query.start_date)) {
      throw new ValidationError('start_date must be in YYYY-MM-DD format');
    }
    params.start_date = query.start_date;
  }

  if (query.end_date) {
    if (!isValidDateString(query.end_date)) {
      throw new ValidationError('end_date must be in YYYY-MM-DD format');
    }
    params.end_date = query.end_date;
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
