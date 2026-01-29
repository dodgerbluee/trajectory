/**
 * Step 2: Central Section Registry
 *
 * Single source of truth for all visit form sections. Defines id, label,
 * component, removable, allowedVisitTypes, and optional. No visit-type
 * logic lives inside section components; the page uses this config to
 * decide which sections to render.
 */

import type { ComponentType } from 'react';
import type { VisitType } from '../types/api';
import type { VisitFormContext } from './visitFormContext';
import {
  VisitInformationSection,
  NotesSection,
  AttachmentsSection,
  MeasurementsSection,
  IllnessSection,
  InjurySection,
  VisionSection,
  VaccinesSection,
  PrescriptionsSection,
} from './sections/SectionContents';

/** Stable section identifiers. Add new sections here; extend VISIT_TYPE_DEFAULTS in step 3. */
export type SectionId =
  | 'visit-information'
  | 'notes'
  | 'attachments'
  | 'measurements'
  | 'illness'
  | 'injury'
  | 'vision'
  | 'vaccines'
  | 'prescriptions';

/** Props passed to every section component (sectionId + context). */
export interface SectionContentProps {
  sectionId: SectionId;
  context: VisitFormContext;
}

export interface SectionEntry {
  id: SectionId;
  label: string;
  component: ComponentType<SectionContentProps>;
  /** If true, user can remove this section from the page (state only). */
  removable: boolean;
  /** Visit types this section is allowed on. null = all types. */
  allowedVisitTypes: VisitType[] | null;
  /** If true, section is not in default set; user adds it via "Optional Sections" area. */
  optional: boolean;
}

const SECTION_REGISTRY: SectionEntry[] = [
  {
    id: 'visit-information',
    label: 'Visit',
    component: VisitInformationSection as ComponentType<SectionContentProps>,
    removable: false,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'notes',
    label: 'Notes',
    component: NotesSection as ComponentType<SectionContentProps>,
    removable: false,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'attachments',
    label: 'Attachments',
    component: AttachmentsSection as ComponentType<SectionContentProps>,
    removable: false,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'measurements',
    label: 'Measurements',
    component: MeasurementsSection as ComponentType<SectionContentProps>,
    removable: true,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'illness',
    label: 'Illness',
    component: IllnessSection as ComponentType<SectionContentProps>,
    removable: true,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'injury',
    label: 'Injury',
    component: InjurySection as ComponentType<SectionContentProps>,
    removable: true,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'vision',
    label: 'Vision',
    component: VisionSection as ComponentType<SectionContentProps>,
    removable: true,
    allowedVisitTypes: null,
    optional: false,
  },
  {
    id: 'vaccines',
    label: 'Vaccines',
    component: VaccinesSection as ComponentType<SectionContentProps>,
    removable: true,
    allowedVisitTypes: null,
    optional: true,
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    component: PrescriptionsSection as ComponentType<SectionContentProps>,
    removable: true,
    allowedVisitTypes: null,
    optional: true,
  },
];

export { SECTION_REGISTRY };

/** Lookup by id. */
export function getSectionById(id: SectionId): SectionEntry | undefined {
  return SECTION_REGISTRY.find((e) => e.id === id);
}

/** Section IDs that are optional (user adds them explicitly; legacy). */
export function getOptionalSectionIds(): SectionId[] {
  return SECTION_REGISTRY.filter((e) => e.optional).map((e) => e.id);
}

/** Section IDs that can be added via sidebar if not already in the form. */
const ADDABLE_SECTION_IDS: SectionId[] = [
  'measurements',
  'illness',
  'injury',
  'vision',
  'vaccines',
  'prescriptions',
];

export function getAddableSectionIds(): SectionId[] {
  return [...ADDABLE_SECTION_IDS];
}
