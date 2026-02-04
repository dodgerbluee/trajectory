import type { Visit } from '@shared/types/api';
import { isFutureVisit } from '@lib/date-utils';
import { visitHasOutcomeData } from '@lib/visit-utils';

/**
 * Determines if a visit should show the limited "upcoming" view.
 * Shows limited view only for future-dated visits with no outcome data yet.
 */
export function isUpcomingVisit(visit: Visit): boolean {
  return isFutureVisit(visit) && !visitHasOutcomeData(visit);
}

/**
 * Maps visit type to human-readable title.
 * Used for the main visit header and breadcrumb labels.
 */
export function getVisitTypeTitle(visitType: string): string {
  switch (visitType) {
    case 'wellness':
      return 'Wellness Visit';
    case 'sick':
      return 'Sick Visit';
    case 'injury':
      return 'Injury Visit';
    case 'vision':
      return 'Vision Visit';
    case 'dental':
      return 'Dental Visit';
    default:
      return 'Visit';
  }
}

/**
 * Generates a calendar export title for the visit.
 * Combines child name with visit type for clarity.
 */
export function getCalendarExportTitle(childName: string | null, visitTypeLabel: string): string {
  if (childName) {
    return `${childName}'s ${visitTypeLabel} Appointment`;
  }
  return `${visitTypeLabel} Appointment`;
}
