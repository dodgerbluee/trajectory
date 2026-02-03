import type { VisitType } from '@shared/types/api';

/** Visit type → human-readable label. */
export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  wellness: 'Wellness Visit',
  sick: 'Sick Visit',
  injury: 'Injury Visit',
  vision: 'Vision Visit',
  dental: 'Dental Visit',
};

export function getVisitTypeLabel(visitType: VisitType): string {
  return VISIT_TYPE_LABELS[visitType] || 'Visit';
}
