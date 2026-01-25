/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate required field
 */
export function validateRequired(value: string | null | undefined, fieldName: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return undefined;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(value: string, fieldName: string): string | undefined {
  if (!value) {
    return `${fieldName} is required`;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return `${fieldName} must be in YYYY-MM-DD format`;
  }

  // Parse date string directly to avoid timezone issues
  const parts = value.split('-');
  if (parts.length !== 3) {
    return `${fieldName} is not a valid date`;
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) {
    return `${fieldName} is not a valid date`;
  }

  // Check if date is not in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) {
    return `${fieldName} cannot be in the future`;
  }

  return undefined;
}

/**
 * Validate number
 */
export function validateNumber(
  value: string | number,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean; integer?: boolean } = {}
): string | undefined {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (options.required && (value === '' || value === null || value === undefined)) {
    return `${fieldName} is required`;
  }

  if (value === '' || value === null || value === undefined) {
    return undefined; // Optional field
  }

  if (isNaN(numValue)) {
    return `${fieldName} must be a number`;
  }

  if (options.integer && !Number.isInteger(numValue)) {
    return `${fieldName} must be a whole number`;
  }

  if (options.min !== undefined && numValue < options.min) {
    return `${fieldName} must be at least ${options.min}`;
  }

  if (options.max !== undefined && numValue > options.max) {
    return `${fieldName} must be at most ${options.max}`;
  }

  return undefined;
}

/**
 * Validate percentile (0-100)
 */
export function validatePercentile(value: string | number, fieldName: string): string | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined; // Optional
  }

  return validateNumber(value, fieldName, { min: 0, max: 100 });
}

/**
 * Format date for input (YYYY-MM-DD)
 */
export function formatDateForInput(dateString: string): string {
  return dateString.split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  // Use local date components to avoid timezone issues
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate child form
 */
export function validateChildForm(data: {
  name: string;
  date_of_birth: string;
  notes?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const nameError = validateRequired(data.name, 'Name');
  if (nameError) errors.name = nameError;

  const dobError = validateDate(data.date_of_birth, 'Date of birth');
  if (dobError) errors.date_of_birth = dobError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate medical event form
 */
export function validateMedicalEventForm(data: {
  event_type: string;
  start_date: string;
  end_date?: string;
  description: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Event type required
  if (!data.event_type || !['doctor_visit', 'illness'].includes(data.event_type)) {
    errors.event_type = 'Event type must be either "Doctor Visit" or "Illness"';
  }

  // Start date required
  const startDateError = validateDate(data.start_date, 'Start date');
  if (startDateError) errors.start_date = startDateError;

  // End date optional but must be valid and after start date
  if (data.end_date) {
    const endDateError = validateDate(data.end_date, 'End date');
    if (endDateError) {
      errors.end_date = endDateError;
    } else if (data.start_date) {
      // Validate range
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      if (end < start) {
        errors.end_date = 'End date must be on or after start date';
      }
    }
  }

  // Description required
  const descriptionError = validateRequired(data.description, 'Description');
  if (descriptionError) errors.description = descriptionError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate measurement form
 */
export function validateMeasurementForm(data: {
  measurement_date: string;
  label?: string;
  weight_value?: number | string;
  weight_ounces?: number | string;
  weight_percentile?: number | string;
  height_value?: number | string;
  height_percentile?: number | string;
  head_circumference_value?: number | string;
  head_circumference_percentile?: number | string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Date is required
  const dateError = validateDate(data.measurement_date, 'Measurement date');
  if (dateError) errors.measurement_date = dateError;

  // At least one measurement value is required
  const hasWeight = data.weight_value !== '' && data.weight_value !== null && data.weight_value !== undefined;
  const hasHeight = data.height_value !== '' && data.height_value !== null && data.height_value !== undefined;
  const hasHead = data.head_circumference_value !== '' && data.head_circumference_value !== null && data.head_circumference_value !== undefined;

  if (!hasWeight && !hasHeight && !hasHead) {
    errors.measurements = 'At least one measurement (weight, height, or head circumference) is required';
  }

  // Validate weight value (if provided)
  if (hasWeight) {
    const weightError = validateNumber(data.weight_value!, 'Weight', { min: 0 });
    if (weightError) errors.weight_value = weightError;
  }

  // Validate weight ounces (if provided)
  if (data.weight_ounces !== '' && data.weight_ounces !== null && data.weight_ounces !== undefined) {
    const ouncesError = validateNumber(data.weight_ounces, 'Weight ounces', { min: 0, max: 15, integer: true });
    if (ouncesError) errors.weight_ounces = ouncesError;
  }

  // Validate weight percentile (if provided)
  if (data.weight_percentile !== '' && data.weight_percentile !== null && data.weight_percentile !== undefined) {
    const percentileError = validatePercentile(data.weight_percentile, 'Weight percentile');
    if (percentileError) errors.weight_percentile = percentileError;
  }

  // Validate height value (if provided)
  if (hasHeight) {
    const heightError = validateNumber(data.height_value!, 'Height', { min: 0 });
    if (heightError) errors.height_value = heightError;
  }

  // Validate height percentile (if provided)
  if (data.height_percentile !== '' && data.height_percentile !== null && data.height_percentile !== undefined) {
    const percentileError = validatePercentile(data.height_percentile, 'Height percentile');
    if (percentileError) errors.height_percentile = percentileError;
  }

  // Validate head circumference value (if provided)
  if (hasHead) {
    const headError = validateNumber(data.head_circumference_value!, 'Head circumference', { min: 0 });
    if (headError) errors.head_circumference_value = headError;
  }

  // Validate head circumference percentile (if provided)
  if (data.head_circumference_percentile !== '' && data.head_circumference_percentile !== null && data.head_circumference_percentile !== undefined) {
    const percentileError = validatePercentile(data.head_circumference_percentile, 'Head circumference percentile');
    if (percentileError) errors.head_circumference_percentile = percentileError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
