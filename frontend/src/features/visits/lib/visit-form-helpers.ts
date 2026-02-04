import type { CreateVisitInput } from '@shared/types/api';

/**
 * Creates an empty visit form with all required fields initialized.
 * Provides a single source of truth for visit form defaults.
 */
export function createEmptyVisitForm(visitType: 'wellness' | 'sick' | 'injury' | 'vision' | 'dental' = 'wellness'): CreateVisitInput {
  return {
    child_id: 0,
    visit_date: '',
    visit_time: null,
    visit_type: visitType,
    location: null,
    doctor_name: null,
    title: null,
    weight_value: null,
    weight_ounces: null,
    weight_percentile: null,
    height_value: null,
    height_percentile: null,
    head_circumference_value: null,
    head_circumference_percentile: null,
    bmi_value: null,
    bmi_percentile: null,
    blood_pressure: null,
    heart_rate: null,
    symptoms: null,
    temperature: null,
    illness_start_date: null,
    end_date: null,
    injury_type: null,
    injury_location: null,
    treatment: null,
    vision_prescription: null,
    ordered_glasses: null,
    ordered_contacts: null,
    vision_refraction: {
      od: { sphere: null, cylinder: null, axis: null },
      os: { sphere: null, cylinder: null, axis: null },
      notes: undefined,
    },
    dental_procedure_type: null,
    dental_notes: null,
    cleaning_type: null,
    cavities_found: null,
    cavities_filled: null,
    xrays_taken: null,
    fluoride_treatment: null,
    sealants_applied: null,
    next_appointment_date: null,
    dental_procedures: null,
    vaccines_administered: [],
    prescriptions: [],
    tags: [],
    notes: null,
    create_illness: false,
    illness_severity: null,
  };
}

/**
 * Validates that a visit has been properly filled out.
 * Returns error message if invalid, null if valid.
 */
export function validateVisitForm(visit: CreateVisitInput, childId: number): string | null {
  if (!childId) {
    return 'Please select a child';
  }

  if (!visit.visit_date) {
    return 'Visit date is required';
  }

  if (!visit.visit_type) {
    return 'Visit type is required';
  }

  return null;
}

/**
 * Determines the next page to navigate to after successful visit creation.
 * Respects the 'from' location state to return user to original page.
 */
export function getNavigationAfterSave(
  fromLocation: string | null,
  childId: number
): string {
  if (fromLocation && fromLocation !== '/') {
    return fromLocation;
  }
  return `/children/${childId}`;
}
