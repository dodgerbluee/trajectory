/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): { years: number; months: number } {
  const today = new Date();
  // Parse date string directly to avoid timezone issues
  const dateStr = dateOfBirth.split('T')[0];
  const parts = dateStr.split('-');
  const birthDate = parts.length === 3 
    ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    : new Date(dateOfBirth);
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Adjust if birthday hasn't occurred this month yet
  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  return { years, months };
}

/**
 * Format age for display
 */
export function formatAge(years: number, months: number): string {
  if (years === 0) {
    return `${months} ${months === 1 ? 'month' : 'months'} old`;
  } else if (months === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'} old`;
  } else {
    return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'} old`;
  }
}

/**
 * Format date for display
 * Parses YYYY-MM-DD string directly to avoid timezone issues
 */
export function formatDate(dateString: string): string {
  // Parse YYYY-MM-DD format directly to avoid timezone conversion
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) {
    // Fallback to Date object if format is unexpected
    const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone edge cases
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date/time for display; never returns "Invalid Date".
 * Use for audit history and any external/API date values.
 */
export function safeFormatDateTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : String(value);
  }
  const formatted = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return formatted === 'Invalid Date' ? String(value) : formatted;
}
