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

export type FamilyRole = 'owner' | 'parent' | 'read_only';

export interface Family {
  id: number;
  name: string;
  role?: FamilyRole;
}

export interface FamilyMember {
  user_id: number;
  username: string;
  email: string;
  role: string;
}

export interface FamilyInvite {
  id: number;
  role: string;
  expires_at: string;
  created_at: string;
  created_by?: number;
}

export interface CreateInviteResponse {
  id: number;
  token: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export interface ApiError {
  error: {
    message: string;
    type: string;
    statusCode: number;
    field?: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    path?: string;
    method?: string;
  };
}

// ============================================================================
// Admin Types
// ============================================================================

export type AdminLogLevel = 'info' | 'debug';

export interface AdminConfig {
  log_level: AdminLogLevel;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  is_instance_admin: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUserDetail extends AdminUser {
  total_kids: number;
  total_visits: number;
  total_illnesses: number;
}

export interface AdminLogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  error?: { name: string; message: string; stack?: string; statusCode?: number };
  request?: { method: string; path: string; params?: Record<string, unknown>; query?: Record<string, unknown>; ip?: string };
}

export interface AdminLogsResponse {
  entries: AdminLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Domain Types
// ============================================================================

export type Gender = 'male' | 'female';

export interface Child {
  id: number;
  family_id?: number; // present when backend supports multi-family; used for grouping
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
  family_id?: number;
  name: string;
  date_of_birth: string;
  gender: Gender;
  // `illnesses` is the canonical list of illnesses; legacy single `illness_type` removed
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

export type VisitType = 'wellness' | 'sick' | 'injury' | 'vision' | 'dental';

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

export type EyeRefraction = {
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
};

export type VisionRefraction = {
  od: EyeRefraction;
  os: EyeRefraction;
  notes?: string;
};

export type DentalProcedure = {
  procedure: string;
  tooth_number?: string | null;
  location?: string | null;
  notes?: string | null;
};

export interface Visit {
  id: number;
  child_id: number;
  visit_date: string;
  visit_time: string | null; // "HH:MM" optional
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
  // New: multiple illnesses associated with this visit
  illnesses?: IllnessType[] | null;
  symptoms: string | null;
  temperature: number | null;
  illness_start_date: string | null;
  end_date: string | null;
  
  // Injury visit
  injury_type: string | null;
  injury_location: string | null;
  treatment: string | null;
  
  // Vision visit
  vision_prescription: string | null;
  vision_refraction?: VisionRefraction | null;
  ordered_glasses: boolean | null;
  ordered_contacts: boolean | null;
  needs_glasses: boolean | null;
  
  // Dental visit
  dental_procedure_type: string | null;
  dental_notes: string | null;
  cleaning_type: string | null;
  cavities_found: number | null;
  cavities_filled: number | null;
  xrays_taken: boolean | null;
  fluoride_treatment: boolean | null;
  sealants_applied: boolean | null;
  next_appointment_date: string | null;
  dental_procedures?: DentalProcedure[] | null;
  
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
  visit_time?: string | null; // "HH:MM"
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
  
  // illnesses array is used instead of single illness_type
  illnesses?: IllnessType[] | null;
  symptoms?: string | null;
  temperature?: number | null;
  illness_start_date?: string | null;
  end_date?: string | null;
  
  // Injury visit fields
  injury_type?: string | null;
  injury_location?: string | null;
  treatment?: string | null;
  
  // Vision visit fields
  vision_prescription?: string | null;
  vision_refraction?: VisionRefraction | null;
  ordered_glasses?: boolean | null;
  ordered_contacts?: boolean | null;
  needs_glasses?: boolean | null;
  
  // Dental visit fields
  dental_procedure_type?: string | null;
  dental_notes?: string | null;
  cleaning_type?: string | null;
  cavities_found?: number | null;
  cavities_filled?: number | null;
  xrays_taken?: boolean | null;
  fluoride_treatment?: boolean | null;
  sealants_applied?: boolean | null;
  next_appointment_date?: string | null;
  dental_procedures?: DentalProcedure[] | null;
  
  vaccines_administered?: string[] | null;
  prescriptions?: Prescription[] | null;
  
  tags?: string[] | null;
  notes?: string | null;
  create_illness?: boolean; // Auto-create illness entry from sick visit
  illness_severity?: number | null; // Severity (1-10) for illness entry when create_illness is true
}

export interface UpdateVisitInput {
  visit_date?: string;
  visit_time?: string | null; // "HH:MM"
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
  illnesses?: IllnessType[] | null;
  symptoms?: string | null;
  temperature?: number | null;
  illness_start_date?: string | null;
  end_date?: string | null;
  
  // Injury visit fields
  injury_type?: string | null;
  injury_location?: string | null;
  treatment?: string | null;
  
  // Vision visit fields
  vision_prescription?: string | null;
  vision_refraction?: VisionRefraction | null;
  ordered_glasses?: boolean | null;
  ordered_contacts?: boolean | null;
  needs_glasses?: boolean | null;
  
  // Dental visit fields
  dental_procedure_type?: string | null;
  dental_notes?: string | null;
  cleaning_type?: string | null;
  cavities_found?: number | null;
  cavities_filled?: number | null;
  xrays_taken?: boolean | null;
  fluoride_treatment?: boolean | null;
  sealants_applied?: boolean | null;
  next_appointment_date?: string | null;
  dental_procedures?: DentalProcedure[] | null;
  
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
  illness_types: IllnessType[];
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
  illness_types: IllnessType[];
  start_date: string;
  end_date?: string | null;
  symptoms?: string | null;
  temperature?: number | null;
  severity?: number | null; // 1-10 scale
  visit_id?: number | null;
  notes?: string | null;
}

export interface UpdateIllnessInput {
  illness_types?: IllnessType[];
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

// ============================================================================
// Audit History
// ============================================================================

export interface AuditHistoryEvent {
  id: number;
  entity_type: 'visit' | 'illness';
  entity_id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: 'created' | 'updated' | 'deleted';
  changed_at: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  summary: string | null;
}
