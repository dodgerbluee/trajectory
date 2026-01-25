/**
 * Input validation utilities
 */

import { ValidationError } from './error-handler.js';

/**
 * Validate required string field
 */
export function validateRequired(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value.trim();
}

/**
 * Validate optional string field
 */
export function validateOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ValidationError('Invalid string value');
  }
  return value.trim() || null;
}

/**
 * Validate date string (YYYY-MM-DD format)
 */
export function validateDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string in YYYY-MM-DD format`);
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format`);
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`);
  }
  
  return value;
}

/**
 * Validate optional date string
 */
export function validateOptionalDate(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return validateDate(value, fieldName);
}

/**
 * Validate number field
 */
export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): number {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
  
  return num;
}

/**
 * Validate optional number field
 */
export function validateOptionalNumber(
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number
): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  return validateNumber(value, fieldName, min, max);
}

/**
 * Validate percentile (0-100)
 */
export function validatePercentile(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  return validateNumber(value, fieldName, 0, 100);
}

/**
 * Validate weight ounces (0-15)
 */
export function validateWeightOunces(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new ValidationError('weight_ounces must be a number');
  }
  
  if (!Number.isInteger(num)) {
    throw new ValidationError('weight_ounces must be an integer');
  }
  
  if (num < 0 || num >= 16) {
    throw new ValidationError('weight_ounces must be between 0 and 15');
  }
  
  return num;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  
  return value as T;
}

/**
 * Validate positive integer (for IDs)
 */
export function validatePositiveInteger(value: unknown, fieldName: string): number {
  const num = Number(value);
  
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  
  return num;
}

/**
 * Validate date range (end >= start)
 */
export function validateDateRange(startDate: string, endDate: string | null | undefined): void {
  if (!endDate) {
    return;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    throw new ValidationError('end_date must be greater than or equal to start_date');
  }
}

/**
 * Validate that at least one measurement value is provided
 */
export function validateHasMeasurement(
  weight: number | null | undefined,
  height: number | null | undefined,
  headCircumference: number | null | undefined
): void {
  if (!weight && !height && !headCircumference) {
    throw new ValidationError(
      'At least one measurement (weight, height, or head_circumference) is required'
    );
  }
}
