/**
 * Visit helpers: outcome data, limited vs full display, etc.
 */

import type { Visit } from '../types/api';

/**
 * True if the visit has any outcome (post-visit) data filled.
 * When a future-dated visit has outcome data, we show the full visit view
 * (user has used "Use full visit form" and saved).
 */
export function visitHasOutcomeData(visit: Visit): boolean {
  const v = visit as unknown as Record<string, unknown>;
  const has = (key: string) => {
    const val = v[key];
    if (val == null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (typeof val === 'number') return true;
    if (typeof val === 'boolean') return true;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return false;
  };

  // Measurements
  if (has('weight_value') || has('weight_ounces') || has('height_value') || has('head_circumference_value') || has('bmi_value') || has('blood_pressure') || has('heart_rate')) return true;
  // Sick
  if (has('symptoms') || has('temperature') || has('illness_start_date') || has('end_date')) return true;
  if (Array.isArray(v.illnesses) && (v.illnesses as unknown[]).length > 0) return true;
  // Injury
  if (has('injury_type') || has('injury_location') || has('treatment')) return true;
  // Vision
  if (has('vision_prescription') || has('vision_refraction') || v.ordered_glasses === true || v.ordered_contacts === true) return true;
  // Dental
  if (has('dental_procedure_type') || has('dental_notes') || has('cleaning_type') || has('cavities_found') || has('cavities_filled') || v.xrays_taken === true || v.fluoride_treatment === true || v.sealants_applied === true || has('dental_procedures')) return true;
  // Vaccines / prescriptions
  if (Array.isArray(v.vaccines_administered) && (v.vaccines_administered as unknown[]).length > 0) return true;
  if (Array.isArray(v.prescriptions) && (v.prescriptions as unknown[]).length > 0) return true;

  return false;
}
