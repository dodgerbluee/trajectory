/**
 * API types matching backend response shapes
 */

// ============================================================================
// Base Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  timestamp?: string;
  pagination?: PaginationMeta;
  filters?: FilterMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FilterMeta {
  child_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface ApiError {
  error: {
    message: string;
    type: string;
    statusCode: number;
    field?: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    path?: string;
    method?: string;
  };
}

// ============================================================================
// Domain Types
// ============================================================================

export type Gender = 'male' | 'female';

export interface Child {
  id: number;
  name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: Gender;
  avatar: string | null;
  notes: string | null;
  due_date: string | null; // YYYY-MM-DD
  birth_weight: number | null;
  birth_weight_ounces: number | null;
  birth_height: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateChildInput {
  name: string;
  date_of_birth: string;
  gender: Gender;
  avatar?: string;
  notes?: string;
  due_date?: string | null;
  birth_weight?: number | null;
  birth_weight_ounces?: number | null;
  birth_height?: number | null;
}

export interface UpdateChildInput {
  name?: string;
  date_of_birth?: string;
  gender?: Gender;
  avatar?: string;
  notes?: string;
  due_date?: string | null;
  birth_weight?: number | null;
  birth_weight_ounces?: number | null;
  birth_height?: number | null;
}

export interface Measurement {
  id: number;
  child_id: number;
  measurement_date: string; // YYYY-MM-DD
  label: string | null;
  weight_value: number | null;
  weight_ounces: number | null;
  weight_percentile: number | null;
  height_value: number | null;
  height_percentile: number | null;
  head_circumference_value: number | null;
  head_circumference_percentile: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMeasurementInput {
  measurement_date: string;
  label?: string;
  weight_value?: number;
  weight_ounces?: number;
  weight_percentile?: number;
  height_value?: number;
  height_percentile?: number;
  head_circumference_value?: number;
  head_circumference_percentile?: number;
}

export interface UpdateMeasurementInput {
  measurement_date?: string;
  label?: string;
  weight_value?: number;
  weight_ounces?: number;
  weight_percentile?: number;
  height_value?: number;
  height_percentile?: number;
  head_circumference_value?: number;
  head_circumference_percentile?: number;
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
  visit_date: string;
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
  blood_pressure: string | null;
  heart_rate: number | null;
  
  // Sick visit
  illness_type: IllnessType | null;
  symptoms: string | null;
  temperature: number | null;
  end_date: string | null;
  
  // Injury visit
  injury_type: string | null;
  injury_location: string | null;
  treatment: string | null;
  follow_up_date: string | null;
  
  // Vision visit
  vision_prescription: string | null;
  needs_glasses: boolean | null;
  
  // Medical
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
}

export interface VisitAttachment {
  id: number;
  visit_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface ChildAttachment {
  id: number;
  child_id: number;
  document_type: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

// ============================================================================
// Medical Events
// ============================================================================

export type EventType = 'doctor_visit' | 'illness';

export interface MedicalEvent {
  id: number;
  child_id: number;
  event_type: EventType;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicalEventInput {
  event_type: EventType;
  start_date: string;
  end_date?: string;
  description: string;
}

export interface UpdateMedicalEventInput {
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  description?: string;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface MedicalEventFilters extends DateRangeParams {
  event_type?: EventType;
}

// ============================================================================
// Measurement Attachments
// ============================================================================

export interface MeasurementAttachment {
  id: number;
  measurement_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

// ============================================================================
// Illnesses (Standalone illness tracking)
// ============================================================================

export interface Illness {
  id: number;
  child_id: number;
  illness_type: IllnessType;
  start_date: string;
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

export interface GrowthDataPoint {
  visit_id: number;
  visit_date: string;
  age_months: number;
  age_days: number;
  weight_value: number | null;
  weight_percentile: number | null;
  height_value: number | null;
  height_percentile: number | null;
  head_circumference_value: number | null;
  head_circumference_percentile: number | null;
  bmi_value: number | null;
  bmi_percentile: number | null;
  child_id: number;
  child_name: string;
  gender: Gender;
}
