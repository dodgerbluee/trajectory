/**
 * Database type definitions
 * These match the PostgreSQL schema exactly
 */

// ============================================================================
// Base entity with timestamps
// ============================================================================

export interface BaseEntity {
  id: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Children
// ============================================================================

export type Gender = 'male' | 'female';

export interface Child extends BaseEntity {
  name: string;
  date_of_birth: Date;
  gender: Gender;
  avatar: string | null;
  notes: string | null;
  due_date: Date | null;
  birth_weight: number | null;
  birth_weight_ounces: number | null;
  birth_height: number | null;
}

export interface CreateChildInput {
  name: string;
  date_of_birth: string; // ISO date string from API
  gender: Gender;
  avatar?: string | null;
  notes?: string | null;
  due_date?: string | null; // ISO date string from API
  birth_weight?: number | null;
  birth_weight_ounces?: number | null;
  birth_height?: number | null;
}

export interface UpdateChildInput {
  name?: string;
  date_of_birth?: string; // ISO date string from API
  gender?: Gender | null;
  avatar?: string | null;
  notes?: string | null;
  due_date?: string | null; // ISO date string from API
  birth_weight?: number | null;
  birth_height?: number | null;
}

// ============================================================================
// Measurements
// ============================================================================

export interface Measurement extends BaseEntity {
  child_id: number;
  measurement_date: Date;
  label: string | null;
  weight_value: number | null;
  weight_ounces: number | null;
  weight_percentile: number | null;
  height_value: number | null;
  height_percentile: number | null;
  head_circumference_value: number | null;
  head_circumference_percentile: number | null;
}

export interface CreateMeasurementInput {
  child_id: number;
  measurement_date: string; // ISO date string from API
  label?: string | null;
  weight_value?: number | null;
  weight_ounces?: number | null;
  weight_percentile?: number | null;
  height_value?: number | null;
  height_percentile?: number | null;
  head_circumference_value?: number | null;
  head_circumference_percentile?: number | null;
}

export interface UpdateMeasurementInput {
  measurement_date?: string; // ISO date string from API
  label?: string | null;
  weight_value?: number | null;
  weight_ounces?: number | null;
  weight_percentile?: number | null;
  height_value?: number | null;
  height_percentile?: number | null;
  head_circumference_value?: number | null;
  head_circumference_percentile?: number | null;
}

// ============================================================================
// Medical Events
// ============================================================================

export type EventType = 'doctor_visit' | 'illness';

export interface MedicalEvent extends BaseEntity {
  child_id: number;
  event_type: EventType;
  start_date: Date;
  end_date: Date | null;
  description: string;
}

export interface CreateMedicalEventInput {
  child_id: number;
  event_type: EventType;
  start_date: string; // ISO date string from API
  end_date?: string | null; // ISO date string from API
  description: string;
}

export interface UpdateMedicalEventInput {
  event_type?: EventType;
  start_date?: string; // ISO date string from API
  end_date?: string | null; // ISO date string from API
  description?: string;
}

// ============================================================================
// Database query result types
// ============================================================================

/**
 * Raw row from PostgreSQL query
 * Date fields come back as Date objects from node-postgres
 * Numeric/decimal fields come back as strings and need parsing
 */
export interface ChildRow {
  id: number;
  name: string;
  date_of_birth: Date;
  gender: Gender;
  avatar: string | null;
  notes: string | null;
  due_date: Date | null;
  birth_weight: string | null; // Decimal comes as string
  birth_weight_ounces: number | null;
  birth_height: string | null; // Decimal comes as string
  created_at: Date;
  updated_at: Date;
}

export interface MeasurementRow {
  id: number;
  child_id: number;
  measurement_date: Date;
  label: string | null;
  weight_value: string | null; // Decimal comes as string
  weight_ounces: number | null; // Integer comes as number
  weight_percentile: string | null; // Decimal comes as string
  height_value: string | null; // Decimal comes as string
  height_percentile: string | null; // Decimal comes as string
  head_circumference_value: string | null; // Decimal comes as string
  head_circumference_percentile: string | null; // Decimal comes as string
  created_at: Date;
  updated_at: Date;
}

export interface MedicalEventRow {
  id: number;
  child_id: number;
  event_type: EventType;
  start_date: Date;
  end_date: Date | null;
  description: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Visits (Unified wellness and sick visits)
// ============================================================================

export type VisitType = 'wellness' | 'sick' | 'injury' | 'vision';

export type IllnessType = 
  | 'flu'
  | 'strep'
  | 'rsv'
  | 'covid'
  | 'cold'
  | 'stomach_bug'
  | 'ear_infection'
  | 'hand_foot_mouth'
  | 'croup'
  | 'pink_eye'
  | 'other';

export interface Prescription {
  medication: string;
  dosage: string;
  duration: string;
  notes?: string;
}

export interface Visit {
  id: number;
  child_id: number;
  visit_date: string; // ISO date string
  visit_type: VisitType;
  location: string | null;
  doctor_name: string | null;
  title: string | null;
  
  // Measurements
  weight_value: number | null;
  weight_ounces: number | null;
  weight_percentile: number | null;
  height_value: number | null;
  height_percentile: number | null;
  head_circumference_value: number | null;
  head_circumference_percentile: number | null;
  bmi_value: number | null;
  bmi_percentile: number | null;
  blood_pressure: string | null; // e.g., "120/80"
  heart_rate: number | null;
  
  // Sick visit fields
  illness_type: IllnessType | null;
  symptoms: string | null;
  temperature: number | null;
  end_date: string | null; // ISO date string
  
  // Injury visit fields
  injury_type: string | null; // e.g., "sprain", "laceration", "fracture", "bruise", "burn", "other"
  injury_location: string | null; // e.g., "left ankle", "forehead", "right arm"
  treatment: string | null; // e.g., "stitches", "splint", "ice and rest"
  follow_up_date: string | null; // ISO date string
  
  // Vision visit fields
  vision_prescription: string | null; // Prescription details
  needs_glasses: boolean | null;
  
  // Medical interventions
  vaccines_administered: string[] | null;
  prescriptions: Prescription[] | null;
  
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVisitInput {
  child_id: number;
  visit_date: string;
  visit_type: VisitType;
  location?: string | null;
  doctor_name?: string | null;
  title?: string | null;
  
  weight_value?: number | null;
  weight_ounces?: number | null;
  weight_percentile?: number | null;
  height_value?: number | null;
  height_percentile?: number | null;
  head_circumference_value?: number | null;
  head_circumference_percentile?: number | null;
  bmi_value?: number | null;
  bmi_percentile?: number | null;
  blood_pressure?: string | null;
  heart_rate?: number | null;
  
  illness_type?: IllnessType | null;
  symptoms?: string | null;
  temperature?: number | null;
  end_date?: string | null;
  
  // Injury visit fields
  injury_type?: string | null;
  injury_location?: string | null;
  treatment?: string | null;
  follow_up_date?: string | null;
  
  // Vision visit fields
  vision_prescription?: string | null;
  needs_glasses?: boolean | null;
  
  vaccines_administered?: string[] | null;
  prescriptions?: Prescription[] | null;
  
  tags?: string[] | null;
  notes?: string | null;
  create_illness?: boolean; // Auto-create illness entry from sick visit
}

export interface UpdateVisitInput {
  visit_date?: string;
  visit_type?: VisitType;
  location?: string | null;
  doctor_name?: string | null;
  title?: string | null;
  
  weight_value?: number | null;
  weight_ounces?: number | null;
  weight_percentile?: number | null;
  height_value?: number | null;
  height_percentile?: number | null;
  head_circumference_value?: number | null;
  head_circumference_percentile?: number | null;
  bmi_value?: number | null;
  bmi_percentile?: number | null;
  
  illness_type?: IllnessType | null;
  symptoms?: string | null;
  temperature?: number | null;
  end_date?: string | null;
  
  // Injury visit fields
  injury_type?: string | null;
  injury_location?: string | null;
  treatment?: string | null;
  follow_up_date?: string | null;
  
  vaccines_administered?: string[] | null;
  prescriptions?: Prescription[] | null;
  
  tags?: string[] | null;
  notes?: string | null;
}

export interface VisitRow {
  id: number;
  child_id: number;
  visit_date: Date;
  visit_type: VisitType;
  location: string | null;
  doctor_name: string | null;
  title: string | null;
  
  weight_value: string | null; // Decimal comes as string
  weight_ounces: number | null;
  weight_percentile: string | null;
  height_value: string | null;
  height_percentile: string | null;
  head_circumference_value: string | null;
  head_circumference_percentile: string | null;
  bmi_value: string | null;
  bmi_percentile: string | null;
  blood_pressure: string | null;
  heart_rate: number | null;
  
  illness_type: IllnessType | null;
  symptoms: string | null;
  temperature: string | null; // Decimal comes as string
  end_date: Date | null;
  
  // Injury visit fields
  injury_type: string | null;
  injury_location: string | null;
  treatment: string | null;
  follow_up_date: Date | null;
  
  // Vision visit fields
  vision_prescription: string | null;
  needs_glasses: boolean | null;
  
  vaccines_administered: string | null; // TEXT field
  prescriptions: any; // JSONB field
  
  tags: string | null; // TEXT field (JSON array)
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert VisitRow from database to Visit for API response
 */
export function visitRowToVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    child_id: row.child_id,
    visit_date: row.visit_date.toISOString().split('T')[0],
    visit_type: row.visit_type,
    location: row.location,
    doctor_name: row.doctor_name,
    title: row.title,
    
    weight_value: row.weight_value ? parseFloat(row.weight_value) : null,
    weight_ounces: row.weight_ounces,
    weight_percentile: row.weight_percentile ? parseFloat(row.weight_percentile) : null,
    height_value: row.height_value ? parseFloat(row.height_value) : null,
    height_percentile: row.height_percentile ? parseFloat(row.height_percentile) : null,
    head_circumference_value: row.head_circumference_value ? parseFloat(row.head_circumference_value) : null,
    head_circumference_percentile: row.head_circumference_percentile ? parseFloat(row.head_circumference_percentile) : null,
    bmi_value: row.bmi_value ? parseFloat(row.bmi_value) : null,
    bmi_percentile: row.bmi_percentile ? parseFloat(row.bmi_percentile) : null,
    blood_pressure: row.blood_pressure,
    heart_rate: row.heart_rate,
    
    illness_type: row.illness_type,
    symptoms: row.symptoms,
    temperature: row.temperature ? parseFloat(row.temperature) : null,
    end_date: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
    
    // Injury visit fields
    injury_type: row.injury_type,
    injury_location: row.injury_location,
    treatment: row.treatment,
    follow_up_date: row.follow_up_date ? row.follow_up_date.toISOString().split('T')[0] : null,
    
    // Vision visit fields
    vision_prescription: row.vision_prescription,
    needs_glasses: row.needs_glasses,
    
    vaccines_administered: row.vaccines_administered ? row.vaccines_administered.split(',').map(v => v.trim()).filter(v => v) : null,
    prescriptions: row.prescriptions || null,
    
    tags: row.tags ? (() => {
      try {
        return JSON.parse(row.tags) as string[];
      } catch {
        // Fallback: treat as comma-separated
        return row.tags.split(',').map(t => t.trim()).filter(t => t);
      }
    })() : null,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}


// ============================================================================
// Measurement Attachments
// ============================================================================

export interface MeasurementAttachment extends BaseEntity {
  measurement_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
}

export interface MeasurementAttachmentRow {
  id: number;
  measurement_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  created_at: Date;
}

// ============================================================================
// Visit Attachments
// ============================================================================

export interface VisitAttachment extends BaseEntity {
  visit_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
}

export interface VisitAttachmentRow {
  id: number;
  visit_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  created_at: Date;
}

// ============================================================================
// Child Attachments
// ============================================================================

export interface ChildAttachment extends BaseEntity {
  child_id: number;
  document_type: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
}

export interface ChildAttachmentRow {
  id: number;
  child_id: number;
  document_type: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  created_at: Date;
}

// ============================================================================
// Type conversion helpers
// ============================================================================

/**
 * Convert MeasurementRow (with string decimals) to Measurement (with numbers)
 */
export function measurementRowToEntity(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    child_id: row.child_id,
    measurement_date: row.measurement_date,
    label: row.label,
    weight_value: row.weight_value ? parseFloat(row.weight_value) : null,
    weight_ounces: row.weight_ounces,
    weight_percentile: row.weight_percentile ? parseFloat(row.weight_percentile) : null,
    height_value: row.height_value ? parseFloat(row.height_value) : null,
    height_percentile: row.height_percentile ? parseFloat(row.height_percentile) : null,
    head_circumference_value: row.head_circumference_value ? parseFloat(row.head_circumference_value) : null,
    head_circumference_percentile: row.head_circumference_percentile ? parseFloat(row.head_circumference_percentile) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Child rows don't need conversion, but keep for consistency
 */
export function childRowToEntity(row: ChildRow): Child {
  const parseDecimal = (val: string | null): number | null => {
    if (val === null || val === undefined) return null;
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? null : parsed;
  };

  return {
    ...row,
    birth_weight: parseDecimal(row.birth_weight),
    birth_weight_ounces: row.birth_weight_ounces,
    birth_height: parseDecimal(row.birth_height),
  };
}

/**
 * MedicalEvent rows don't need conversion, but keep for consistency
 */
export function medicalEventRowToEntity(row: MedicalEventRow): MedicalEvent {
  return row;
}

// ============================================================================
// Illnesses (Standalone illness tracking)
// ============================================================================

export interface Illness {
  id: number;
  child_id: number;
  illness_type: IllnessType;
  start_date: string; // ISO date string
  end_date: string | null;
  symptoms: string | null;
  temperature: number | null;
  severity: number | null; // 1-10 scale
  visit_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIllnessInput {
  child_id: number;
  illness_type: IllnessType;
  start_date: string;
  end_date?: string | null;
  symptoms?: string | null;
  temperature?: number | null;
  severity?: number | null; // 1-10 scale
  visit_id?: number | null;
  notes?: string | null;
}

export interface UpdateIllnessInput {
  illness_type?: IllnessType;
  start_date?: string;
  end_date?: string | null;
  symptoms?: string | null;
  temperature?: number | null;
  severity?: number | null; // 1-10 scale
  visit_id?: number | null;
  notes?: string | null;
}

export interface IllnessRow {
  id: number;
  child_id: number;
  illness_type: IllnessType;
  start_date: Date;
  end_date: Date | null;
  symptoms: string | null;
  temperature: string | null; // Decimal comes as string
  severity: number | null;
  visit_id: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert IllnessRow from database to Illness for API response
 */
export function illnessRowToIllness(row: IllnessRow): Illness {
  return {
    id: row.id,
    child_id: row.child_id,
    illness_type: row.illness_type,
    start_date: row.start_date.toISOString().split('T')[0],
    end_date: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
    symptoms: row.symptoms,
    temperature: row.temperature ? parseFloat(row.temperature) : null,
    severity: row.severity,
    visit_id: row.visit_id,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

// ============================================================================
// Heatmap Data (for metrics dashboard)
// ============================================================================

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // Number of children sick on this day
  children: number[]; // Array of child_ids who were sick
}

export interface HeatmapData {
  year: number;
  days: HeatmapDay[];
  totalDays: number;
  maxCount: number; // Maximum children sick on any single day
}
