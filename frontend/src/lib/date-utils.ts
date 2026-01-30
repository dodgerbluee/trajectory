// App timezone from server (/health); used for date/time formatting. Default UTC until loaded.
let appTimezone = 'UTC';

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

let currentDateFormat: DateFormat = 'MM/DD/YYYY';

export function setAppTimezone(tz: string): void {
  appTimezone = tz || 'UTC';
}

export function getAppTimezone(): string {
  return appTimezone;
}

export function getDateFormat(): DateFormat {
  return currentDateFormat;
}

export function setDateFormat(format: DateFormat): void {
  currentDateFormat = format;
}

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
 * Format date for display using the current user preference (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD).
 * Parses YYYY-MM-DD string directly to avoid timezone issues.
 */
export function formatDate(dateString: string): string {
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) {
    const date = new Date(dateString + 'T12:00:00');
    return formatDateWithFormat(date, currentDateFormat);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const yearStr = String(year);
  switch (currentDateFormat) {
    case 'MM/DD/YYYY':
      return `${monthStr}/${dayStr}/${yearStr}`;
    case 'DD/MM/YYYY':
      return `${dayStr}/${monthStr}/${yearStr}`;
    case 'YYYY-MM-DD':
      return `${yearStr}-${monthStr}-${dayStr}`;
    default:
      return `${monthStr}/${dayStr}/${yearStr}`;
  }
}

/** Format a Date using a specific format (for one-off display). */
export function formatDateWithFormat(date: Date, format: DateFormat): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${month}/${day}/${year}`;
  }
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
    hour12: true,
    timeZone: getAppTimezone(),
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
    hour12: true,
    timeZone: getAppTimezone(),
  });
  return formatted === 'Invalid Date' ? String(value) : formatted;
}
