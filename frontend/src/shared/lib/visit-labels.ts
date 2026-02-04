import type { VisitType } from '@shared/types/api';

/** Visit type → human-readable label. */
export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  wellness: 'Wellness',
  sick: 'Sick',
  injury: 'Injury',
  vision: 'Vision',
  dental: 'Dental',
};

export function getVisitTypeLabel(visitType: VisitType): string {
  return VISIT_TYPE_LABELS[visitType] || 'Visit';
}
