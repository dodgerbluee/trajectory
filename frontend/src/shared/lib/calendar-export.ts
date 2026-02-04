/**
 * Export events to iCalendar (.ics) for import into Google Calendar, Apple Calendar, etc.
 */

export interface CalendarEvent {
  /** Event title (e.g. "Dental - Emma") */
  title: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Unique id for the event (e.g. "visit-123@trajectory") */
  uid: string;
}

/** Escape special characters for ICS text (RFC 5545) */
function escapeIcsText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Convert YYYY-MM-DD to YYYYMMDD for ICS VALUE=DATE */
function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/**
 * Build iCalendar (RFC 5545) content for a list of all-day events.
 */
export function buildIcsFromEvents(events: CalendarEvent[]): string {
  const now = new Date();
  const dtstamp =
    now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') +
    'T' +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0') +
    String(now.getUTCSeconds()).padStart(2, '0') +
    'Z';

  const vevents = events
    .map((e) => {
      const start = toIcsDate(e.date);
      const endDate = new Date(e.date + 'T12:00:00Z');
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end =
        endDate.getUTCFullYear() +
        String(endDate.getUTCMonth() + 1).padStart(2, '0') +
        String(endDate.getUTCDate()).padStart(2, '0');

      return [
        'BEGIN:VEVENT',
        `UID:${escapeIcsText(e.uid)}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeIcsText(e.title)}`,
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trajectory//Upcoming Visits//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Build a Google Calendar "add event" URL. Opens in browser with event pre-filled; user clicks Save.
 * - All-day: date in YYYY-MM-DD, no time.
 * - Timed: date + time "HH:MM" (local); end is start + 1 hour.
 * - Location added to URL when provided.
 */
export function getGoogleCalendarAddEventUrl(event: {
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
}): string {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title });

  if (event.time && /^\d{1,2}:\d{2}$/.test(event.time.trim())) {
    const [h, m] = event.time.trim().split(':').map((s) => parseInt(s, 10));
    const datePart = event.date.replace(/-/g, '');
    const start = `${datePart}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    const endHour = h + 1;
    const endH = endHour >= 24 ? endHour - 24 : endHour;
    const end = `${datePart}T${String(endH).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    params.set('dates', `${start}/${end}`);
  } else {
    const start = event.date.replace(/-/g, '');
    const endDate = new Date(event.date + 'T12:00:00Z');
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end =
      endDate.getUTCFullYear() +
      String(endDate.getUTCMonth() + 1).padStart(2, '0') +
      String(endDate.getUTCDate()).padStart(2, '0');
    params.set('dates', `${start}/${end}`);
  }

  if (event.location && event.location.trim()) {
    params.set('location', event.location.trim());
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Trigger download of an .ics file in the browser.
 */
export function downloadIcs(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
