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

export function calculateAge(dateOfBirth: string): { years: number; months: number } {
  const today = new Date();
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
  
  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  return { years, months };
}

export function formatAge(years: number, months: number): string {
  if (years === 0) {
    return `${months} ${months === 1 ? 'month' : 'months'} old`;
  } else if (months === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'} old`;
  } else {
    return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'} old`;
  }
}

// Format date using current user preference (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD).
// Parses YYYY-MM-DD directly to avoid timezone issues.
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

// Format time "HH:MM" or "HH:MM:SS" as 12-hour (e.g. "9:30 AM", "12:00 PM").
export function formatTime(hhmm: string): string {
  const parts = hhmm.trim().split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return hhmm;
  }
  if (h === 0) {
    return `12:${String(m).padStart(2, '0')} AM`;
  }
  if (h === 12) {
    return `12:${String(m).padStart(2, '0')} PM`;
  }
  if (h < 12) {
    return `${h}:${String(m).padStart(2, '0')} AM`;
  }
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
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
 * True if dateString (YYYY-MM-DD) is after today (local date).
 */
export function isFutureDate(dateString: string): boolean {
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}

/**
 * True if visit's visit_date is in the future (appointment).
 */
export function isFutureVisit(visit: { visit_date: string }): boolean {
  return isFutureDate(visit.visit_date);
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
