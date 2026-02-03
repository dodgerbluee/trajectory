/**
 * Step 3: Visit Type Defaults
 *
 * Defines which section IDs are attached when a visit is created for each
 * visit type. All types get: Visit Information, Notes, Attachments (always
 * shown, not removable). Type-specific default (removable): Wellness = Measurements,
 * Sick = Illness, Injury = Injury, Vision = Vision. Measurement, Vaccine,
 * Prescriptions, Illness, Injury, Vision can be added via sidebar if not present.
 *
 * To add a new visit type (e.g. Dental): add the type to VisitType in api.ts,
 * then add an entry here. No refactor of section or page logic required.
 */

import type { VisitType } from '../../../shared/types/api';
import type { SectionId } from './sectionRegistry';

export const VISIT_TYPE_DEFAULTS: Record<VisitType, SectionId[]> = {
  wellness: ['visit-information', 'measurements', 'notes', 'attachments'],
  sick: ['visit-information', 'illness', 'notes', 'attachments'],
  injury: ['visit-information', 'injury', 'notes', 'attachments'],
  vision: ['visit-information', 'vision', 'notes', 'attachments'],
  dental: ['visit-information', 'dental', 'notes', 'attachments'],
};

/**
 * Returns the default section IDs for a visit type. Optional sections
 * (vaccines, prescriptions) are only included when they appear in this
 * default list for that type; otherwise the user adds them via Optional Sections.
 */
export function getDefaultSectionsForVisitType(visitType: VisitType): SectionId[] {
  return [...VISIT_TYPE_DEFAULTS[visitType]];
}
