/**
 * Visit Routes - Unified wellness and sick visits
 */

import { Router, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { createResponse, createPaginatedResponse, parsePaginationParams, type AuditHistoryEvent } from '../types/api.js';
import { canViewAuditHistory } from '../lib/audit.js';
import { UnauthorizedError, ConflictError } from '../middleware/error-handler.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import type { VisitRow, CreateVisitInput, VisitType, IllnessType } from '../types/database.js';
import { visitRowToVisit as convertVisitRow } from '../types/database.js';
import { buildFieldDiff, auditChangesSummary } from '../lib/field-diff.js';
import { recordAuditEvent } from '../lib/audit.js';
import { getAccessibleChildIds, canAccessChild, canEditChild } from '../lib/family-access.js';

const router = Router();
router.use(authenticate);

// ============================================================================
// Validation helpers
// ============================================================================

function validateVisitType(value: unknown): VisitType {
  if (typeof value !== 'string' || !['wellness', 'sick', 'injury', 'vision', 'dental'].includes(value)) {
    throw new BadRequestError('visit_type must be "wellness", "sick", "injury", "vision", or "dental"');
  }
  return value as VisitType;
}

function validateIllnessType(value: unknown): IllnessType | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const validTypes = ['flu', 'strep', 'rsv', 'covid', 'cold', 'stomach_bug', 'ear_infection', 'hand_foot_mouth', 'croup', 'pink_eye', 'other'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new BadRequestError(`illness_type must be one of: ${validTypes.join(', ')}`);
  }
  return value as IllnessType;
}

function validateIllnessesArray(value: unknown): IllnessType[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new BadRequestError('illnesses must be an array of strings');
  }
  const arr: IllnessType[] = value.map((v: unknown, idx: number) => {
    try {
      const validated = validateIllnessType(v);
      if (!validated) throw new Error('invalid');
      return validated;
    } catch (err) {
      throw new BadRequestError(`illnesses[${idx}] is invalid`);
    }
  });
  return arr;
}

function validateDate(value: unknown, fieldName: string): string {
  if (!value) {
    throw new BadRequestError(`${fieldName} is required`);
  }
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }
  const date = new Date(value as string | number | Date);
  if (isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }
  return String(value);
}

function validateOptionalDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    throw new BadRequestError('Invalid date format');
  }
  const date = new Date(value as string | number | Date);
  if (isNaN(date.getTime())) {
    throw new BadRequestError('Invalid date format');
  }
  return String(value);
}

function validateOptionalNumber(value: unknown, min?: number, max?: number): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = parseFloat(value);
  } else {
    throw new BadRequestError('Invalid number');
  }
  if (isNaN(num)) {
    throw new BadRequestError('Invalid number');
  }
  if (min !== undefined && num < min) {
    throw new BadRequestError(`Value must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new BadRequestError(`Value must be at most ${max}`);
  }
  return num;
}

function validateOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestError('Value must be a string');
  }
  return value.trim();
}

/** Optional time "HH:MM" or "HH:MM:SS"; returns "HH:MM" or null. */
function validateOptionalTime(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestError('visit_time must be a string (HH:MM)');
  }
  const trimmed = value.trim();
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    throw new BadRequestError('visit_time must be HH:MM or HH:MM:SS');
  }
  const [h, m] = trimmed.split(':');
  const hour = parseInt(h!, 10);
  const min = parseInt(m!, 10);
  if (hour < 0 || hour > 23 || min < 0 || min > 59) {
    throw new BadRequestError('visit_time must be a valid time');
  }
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function validateVaccines(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.filter(v => v && typeof v === 'string').join(',');
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new BadRequestError('vaccines_administered must be an array of strings or a comma-separated string');
}

type PrescriptionInput = { medication: string; dosage: string; duration: string; notes?: string };

function validatePrescriptions(value: unknown): PrescriptionInput[] | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new BadRequestError('prescriptions must be an array');
  }
  // Validate prescription structure
  value.forEach((rx: unknown, index: number) => {
    if (!rx || typeof rx !== 'object') {
      throw new BadRequestError(`prescriptions[${index}] must be an object`);
    }
    const r = rx as Record<string, unknown>;
    if (!r.medication || typeof r.medication !== 'string') {
      throw new BadRequestError(`prescriptions[${index}].medication is required and must be a string`);
    }
    if (!r.dosage || typeof r.dosage !== 'string') {
      throw new BadRequestError(`prescriptions[${index}].dosage is required and must be a string`);
    }
    if (!r.duration || typeof r.duration !== 'string') {
      throw new BadRequestError(`prescriptions[${index}].duration is required and must be a string`);
    }
  });
  return value as PrescriptionInput[];
}

type DentalProcedure = {
  procedure: string;
  tooth_number?: string | null;
  location?: string | null;
  notes?: string | null;
};

function validateDentalProcedures(value: unknown): DentalProcedure[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new BadRequestError('dental_procedures must be an array');
  }
  return value.map((v: unknown, idx: number) => {
    if (typeof v !== 'object' || v === null) {
      throw new BadRequestError(`dental_procedures[${idx}] must be an object`);
    }
    const proc = v as Record<string, unknown>;
    if (typeof proc.procedure !== 'string') {
      throw new BadRequestError(`dental_procedures[${idx}].procedure must be a string`);
    }
    return {
      procedure: proc.procedure,
      tooth_number: proc.tooth_number === undefined || proc.tooth_number === null 
        ? null 
        : String(proc.tooth_number),
      location: proc.location === undefined || proc.location === null 
        ? null 
        : String(proc.location),
      notes: proc.notes === undefined || proc.notes === null 
        ? null 
        : String(proc.notes),
    };
  });
}

type VisionEye = { sphere: number | null; cylinder: number | null; axis: number | null };
type VisionRefractionInput = { od: VisionEye; os: VisionEye; notes?: string };

function validateVisionRefraction(value: unknown): VisionRefractionInput | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'object') {
    throw new BadRequestError('vision_refraction must be an object');
  }
  const validateEye = (eye: unknown): VisionEye => {
    if (!eye) return { sphere: null, cylinder: null, axis: null };
    if (typeof eye !== 'object') return { sphere: null, cylinder: null, axis: null };
    const e = eye as Record<string, unknown>;
    const sphere = e.sphere === undefined || e.sphere === null || e.sphere === '' ? null : Number(e.sphere);
    const cylinder = e.cylinder === undefined || e.cylinder === null || e.cylinder === '' ? null : Number(e.cylinder);
    const axis = e.axis === undefined || e.axis === null || e.axis === '' ? null : Number(e.axis);
    if (sphere !== null && isNaN(sphere)) throw new BadRequestError('vision_refraction.od.sphere must be a number');
    if (cylinder !== null && isNaN(cylinder)) throw new BadRequestError('vision_refraction.od.cylinder must be a number');
    if (axis !== null && isNaN(axis)) throw new BadRequestError('vision_refraction.od.axis must be a number');
    return { sphere, cylinder, axis };
  };
  const v = value as Record<string, unknown>;
  const od = validateEye(v.od);
  const os = validateEye(v.os);
  const notes = v.notes ? String(v.notes) : undefined;
  return { od, os, notes };
}

// ============================================================================
// GET /api/visits - List visits with filtering
// ============================================================================

// ============================================================================
// GET /api/visits/growth-data - Get growth data for charts (age-based)
// ============================================================================

router.get('/growth-data', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accessibleChildIds = await getAccessibleChildIds(req.userId!);
    if (accessibleChildIds.length === 0) {
      return res.json(createResponse([]));
    }

    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;

    if (childId && isNaN(childId)) {
      throw new BadRequestError('Invalid child_id');
    }
    if (childId && !accessibleChildIds.includes(childId)) {
      throw new BadRequestError('Invalid child_id');
    }

    let queryText = `
      SELECT 
        v.id as visit_id,
        v.visit_date,
        v.child_id,
        v.weight_value,
        v.weight_percentile,
        v.height_value,
        v.height_percentile,
        v.head_circumference_value,
        v.head_circumference_percentile,
        v.bmi_value,
        v.bmi_percentile,
        c.name as child_name,
        c.date_of_birth,
        c.gender,
        c.birth_weight,
        c.birth_height
      FROM visits v
      INNER JOIN children c ON v.child_id = c.id
      WHERE v.visit_type = 'wellness'
        AND v.child_id = ANY($1::int[])
        AND (
          v.weight_value IS NOT NULL 
          OR v.height_value IS NOT NULL 
          OR v.head_circumference_value IS NOT NULL 
          OR v.bmi_value IS NOT NULL
        )
    `;

    const queryParams: unknown[] = [accessibleChildIds];
    let paramIndex = 2;

    if (childId) {
      queryText += ` AND v.child_id = $${paramIndex}`;
      queryParams.push(childId);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND v.visit_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND v.visit_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    queryText += ` ORDER BY v.visit_date ASC`;

    type GrowthRow = {
      visit_id: number;
      visit_date: Date;
      child_id: number;
      weight_value: string | null;
      weight_percentile: string | null;
      height_value: string | null;
      height_percentile: string | null;
      head_circumference_value: string | null;
      head_circumference_percentile: string | null;
      bmi_value: string | null;
      bmi_percentile: string | null;
      child_name: string;
      date_of_birth: Date;
      gender: string;
      birth_weight: string | null;
      birth_height: string | null;
    };

    const result = await query<GrowthRow>(queryText, queryParams);

    // Parse decimal values (PostgreSQL returns DECIMAL as string)
    const parseDecimal = (val: unknown): number | null => {
      if (val === null || val === undefined) return null;
      const parsed =
        typeof val === 'string' ? parseFloat(val) :
        typeof val === 'number' ? val :
        NaN;
      return Number.isNaN(parsed) ? null : parsed;
    };

    // Get unique children to add birth data points
    const childBirthData = new Map<number, { birth_weight: string | null; birth_height: string | null; date_of_birth: Date; child_name: string; gender: string }>();
    
    result.rows.forEach((row) => {
      if (!childBirthData.has(row.child_id)) {
        childBirthData.set(row.child_id, {
          birth_weight: row.birth_weight,
          birth_height: row.birth_height,
          date_of_birth: row.date_of_birth,
          child_name: row.child_name,
          gender: row.gender,
        });
      }
    });

    // Add birth data points (age 0) for children with birth measurements
    type GrowthPoint = {
      visit_id: number | null;
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
      gender: string;
    };

    const birthDataPoints: GrowthPoint[] = [];
    childBirthData.forEach((birthData, childId) => {
      const birthWeight = parseDecimal(birthData.birth_weight);
      const birthHeight = parseDecimal(birthData.birth_height);
      
      if (birthWeight !== null || birthHeight !== null) {
        // Only include if we're showing this child (filtered by childId) or all children
        const shouldInclude = !childId || result.rows.some((r) => r.child_id === childId);
        if (shouldInclude) {
          birthDataPoints.push({
            visit_id: null, // No visit for birth
            visit_date: birthData.date_of_birth.toISOString().split('T')[0],
            age_months: 0,
            age_days: 0,
            weight_value: birthWeight,
            weight_percentile: null,
            height_value: birthHeight,
            height_percentile: null,
            head_circumference_value: null,
            head_circumference_percentile: null,
            bmi_value: null,
            bmi_percentile: null,
            child_id: childId,
            child_name: birthData.child_name,
            gender: birthData.gender,
          });
        }
      }
    });

    // Calculate age in months for each visit
    const growthData = result.rows.map((row) => {
      const visitDate = new Date(row.visit_date);
      const birthDate = new Date(row.date_of_birth);
      
      // Calculate age in months
      let ageMonths = (visitDate.getFullYear() - birthDate.getFullYear()) * 12;
      ageMonths += visitDate.getMonth() - birthDate.getMonth();
      
      // Adjust if birthday hasn't occurred this month
      if (visitDate.getDate() < birthDate.getDate()) {
        ageMonths--;
      }

      // Calculate age in days for precision
      const ageDays = Math.floor((visitDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));

      // Parse values first (PostgreSQL DECIMAL comes as string)
      const weightValue = parseDecimal(row.weight_value);
      const heightValue = parseDecimal(row.height_value);
      const bmiValueFromDB = parseDecimal(row.bmi_value);

      // Calculate BMI if missing but we have weight and height
      // Also recalculate if stored BMI is unreasonable (likely calculated incorrectly)
      let bmiValue = bmiValueFromDB;
      
      // Validate stored BMI is reasonable (children typically have BMI between 10-30)
      // If BMI is > 50 or < 5, it's likely incorrect and should be recalculated
      // Also check for obviously wrong values (like very large numbers that might be from calculation errors)
      if (bmiValue !== null && (bmiValue > 50 || bmiValue < 5 || !isFinite(bmiValue) || isNaN(bmiValue))) {
        bmiValue = null; // Mark as invalid so we recalculate
      }
      
      if ((!bmiValue || bmiValue === null) && weightValue !== null && heightValue !== null && heightValue > 0) {
        // BMI = (weight_lbs / (height_inches²)) * 703
        // Ensure height is reasonable (between 10-100 inches for children)
        if (heightValue >= 10 && heightValue <= 100) {
          bmiValue = (weightValue / (heightValue * heightValue)) * 703;
          // Validate calculated BMI is reasonable
          if (bmiValue > 50 || bmiValue < 5) {
            bmiValue = null; // Invalid calculation, likely bad input data
          }
        }
      }

      return {
        visit_id: row.visit_id,
        visit_date: row.visit_date.toISOString().split('T')[0],
        age_months: Math.max(0, ageMonths),
        age_days: Math.max(0, ageDays),
        weight_value: weightValue,
        weight_percentile: parseDecimal(row.weight_percentile),
        height_value: heightValue,
        height_percentile: parseDecimal(row.height_percentile),
        head_circumference_value: parseDecimal(row.head_circumference_value),
        head_circumference_percentile: parseDecimal(row.head_circumference_percentile),
        bmi_value: bmiValue,
        bmi_percentile: parseDecimal(row.bmi_percentile),
        child_id: row.child_id,
        child_name: row.child_name,
        gender: row.gender,
      };
    });

    // Combine birth data points with visit data points, sorted by child_id then age_months
    const allGrowthData = [...birthDataPoints, ...growthData].sort((a, b) => {
      // Sort by child_id first, then by age_months
      if (a.child_id !== b.child_id) {
        return a.child_id - b.child_id;
      }
      return a.age_months - b.age_months;
    });

    return res.json(createResponse(allGrowthData));
  } catch (err) {
    return next(err);
  }
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accessibleChildIds = await getAccessibleChildIds(req.userId!);
    if (accessibleChildIds.length === 0) {
      return res.json(createResponse([]));
    }

    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;
    const visitType = req.query.visit_type as VisitType | undefined;
    const futureOnly = req.query.future_only === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    let queryText = 'SELECT * FROM visits WHERE child_id = ANY($1::int[])';
    const queryParams: unknown[] = [accessibleChildIds];
    let paramCount = 2;

    if (childId) {
      if (!accessibleChildIds.includes(childId)) {
        return res.json(createResponse([]));
      }
      queryText += ` AND child_id = $${paramCount++}`;
      queryParams.push(childId);
    }

    if (visitType) {
      queryText += ` AND visit_type = $${paramCount++}`;
      queryParams.push(visitType);
    }

    if (futureOnly) {
      queryText += ` AND visit_date > CURRENT_DATE`;
    }

    queryText += futureOnly
      ? ` ORDER BY visit_date ASC, id ASC LIMIT $${paramCount++} OFFSET $${paramCount++}`
      : ` ORDER BY visit_date DESC, id DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);

    const result = await query<VisitRow>(queryText, queryParams);
    const visitRows = result.rows;
    const visits = visitRows.map(convertVisitRow);

    // Attach illnesses for each visit (if any)
    if (visitRows.length > 0) {
      const visitIds = visitRows.map((r) => r.id);
      const illRes = await query<{ visit_id: number; illness_type: IllnessType }>(
        `SELECT visit_id, illness_type FROM visit_illnesses WHERE visit_id = ANY($1)`,
        [visitIds]
      );
      const map = new Map<number, IllnessType[]>();
      illRes.rows.forEach((row) => {
        const arr = map.get(row.visit_id) || [];
        arr.push(row.illness_type);
        map.set(row.visit_id, arr);
      });
      visits.forEach(v => {
        v.illnesses = map.get(v.id) || null;
      });
    }

    return res.json(createResponse(visits));
  } catch (error) {
    return next(error);
  }
});

// ============================================================================
// GET /api/visits/:id - Get single visit
// ============================================================================

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    const result = await query<VisitRow>(
      'SELECT * FROM visits WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Visit');
    }

    const visit = convertVisitRow(result.rows[0]);
    if (!(await canAccessChild(req.userId!, visit.child_id))) {
      throw new NotFoundError('Visit');
    }

    // Attach illnesses
    const illRes = await query<{ illness_type: IllnessType }>(
      `SELECT illness_type FROM visit_illnesses WHERE visit_id = $1`,
      [visit.id]
    );
    visit.illnesses = illRes.rows.length > 0 ? illRes.rows.map((r) => r.illness_type) : null;
    res.json(createResponse(visit));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/visits - Create new visit
// ============================================================================

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[POST /api/visits] Request body:', JSON.stringify(req.body, null, 2));

    const childId = parseInt(req.body.child_id);
    console.log('[POST /api/visits] Parsed childId:', childId);

    if (!(await canAccessChild(req.userId!, childId))) {
      console.log('[POST /api/visits] User cannot access child:', childId);
      throw new NotFoundError('Child');
    }
    if (!(await canEditChild(req.userId!, childId))) {
      console.log('[POST /api/visits] User cannot edit child:', childId);
      throw new ForbiddenError('You do not have permission to add visits for this child.');
    }
    const input: CreateVisitInput = {
      child_id: childId,
      visit_date: validateDate(req.body.visit_date, 'visit_date'),
      visit_time: validateOptionalTime(req.body.visit_time),
      visit_type: validateVisitType(req.body.visit_type),
      location: validateOptionalString(req.body.location),
      doctor_name: validateOptionalString(req.body.doctor_name),
      title: validateOptionalString(req.body.title),
      
      weight_value: validateOptionalNumber(req.body.weight_value),
      weight_ounces: validateOptionalNumber(req.body.weight_ounces, 0, 15),
      weight_percentile: validateOptionalNumber(req.body.weight_percentile, 0, 100),
      height_value: validateOptionalNumber(req.body.height_value),
      height_percentile: validateOptionalNumber(req.body.height_percentile, 0, 100),
      head_circumference_value: validateOptionalNumber(req.body.head_circumference_value),
      head_circumference_percentile: validateOptionalNumber(req.body.head_circumference_percentile, 0, 100),
      bmi_value: validateOptionalNumber(req.body.bmi_value),
      bmi_percentile: validateOptionalNumber(req.body.bmi_percentile, 0, 100),
      symptoms: validateOptionalString(req.body.symptoms),
      temperature: validateOptionalNumber(req.body.temperature, 95, 110),
      illness_start_date: validateOptionalDate(req.body.illness_start_date),
      end_date: validateOptionalDate(req.body.end_date),
      
      // Injury visit fields
      injury_type: validateOptionalString(req.body.injury_type),
      injury_location: validateOptionalString(req.body.injury_location),
      treatment: validateOptionalString(req.body.treatment),
      
      // Vision fields
      vision_prescription: validateOptionalString(req.body.vision_prescription),
      vision_refraction: validateVisionRefraction(req.body.vision_refraction),
      ordered_glasses: req.body.ordered_glasses === true ? true : (req.body.ordered_glasses === false ? false : null),
      ordered_contacts: req.body.ordered_contacts === true ? true : (req.body.ordered_contacts === false ? false : null),
      
      // Dental fields
      dental_procedure_type: validateOptionalString(req.body.dental_procedure_type),
      dental_notes: validateOptionalString(req.body.dental_notes),
      cleaning_type: validateOptionalString(req.body.cleaning_type),
      cavities_found: validateOptionalNumber(req.body.cavities_found, 0),
      cavities_filled: validateOptionalNumber(req.body.cavities_filled, 0),
      xrays_taken: req.body.xrays_taken === true ? true : (req.body.xrays_taken === false ? false : null),
      fluoride_treatment: req.body.fluoride_treatment === true ? true : (req.body.fluoride_treatment === false ? false : null),
      sealants_applied: req.body.sealants_applied === true ? true : (req.body.sealants_applied === false ? false : null),
      dental_procedures: validateDentalProcedures(req.body.dental_procedures),

      vaccines_administered: req.body.vaccines_administered,
      prescriptions: req.body.prescriptions,
      tags: Array.isArray(req.body.tags) ? req.body.tags : null,

      notes: validateOptionalString(req.body.notes),
      create_illness: req.body.create_illness === true,
      illness_severity: validateOptionalNumber(req.body.illness_severity, 1, 10) ?? null,
    };

    console.log('[POST /api/visits] Validated input object:', JSON.stringify(input, null, 2));

    // Support illnesses array (multiple illnesses)
    const illnesses = validateIllnessesArray(req.body.illnesses);
    console.log('[POST /api/visits] Validated illnesses:', illnesses);
    const todayStr = new Date().toISOString().slice(0, 10);
    const isFutureVisit = input.visit_date > todayStr;
    // Require illness/injury_type only for past/today (completed) visits; pending future appointments may omit
    if (!isFutureVisit) {
      if (input.visit_type === 'sick' && (!illnesses || illnesses.length === 0)) {
        throw new BadRequestError('At least one illness is required for sick visits');
      }
      if (input.visit_type === 'injury' && !input.injury_type) {
        throw new BadRequestError('injury_type is required for injury visits');
      }
    }

    // Process vaccines and prescriptions
    const vaccines = validateVaccines(input.vaccines_administered);
    const prescriptions = validatePrescriptions(input.prescriptions);

    console.log('[POST /api/visits] Validated vaccines:', vaccines);
    console.log('[POST /api/visits] Validated prescriptions:', prescriptions);

    // Process tags - store as JSON array string
    const tagsJson = input.tags && input.tags.length > 0
      ? JSON.stringify(input.tags.filter(t => t && t.trim()))
      : null;

    console.log('[POST /api/visits] Tags JSON:', tagsJson);
    console.log('[POST /api/visits] About to INSERT into visits table...');

    let result;
    try {
      result = await query<VisitRow>(
        `INSERT INTO visits (
          child_id, visit_date, visit_time, visit_type, location, doctor_name, title,
          weight_value, weight_ounces, weight_percentile,
          height_value, height_percentile,
          head_circumference_value, head_circumference_percentile,
          bmi_value, bmi_percentile,
          blood_pressure, heart_rate,
          symptoms, temperature, illness_start_date, end_date, injury_type,
          injury_location, treatment,
          vision_prescription, vision_refraction, ordered_glasses, ordered_contacts,
          dental_procedure_type, dental_notes, cleaning_type, cavities_found, cavities_filled,
          xrays_taken, fluoride_treatment, sealants_applied, dental_procedures,
          vaccines_administered, prescriptions, tags, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12,
          $13, $14,
          $15, $16,
          $17, $18,
          $19, $20, $21, $22, $23,
          $24, $25,
          $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42
        ) RETURNING *`,
        [
          input.child_id, input.visit_date, input.visit_time, input.visit_type, input.location, input.doctor_name, input.title,
          input.weight_value, input.weight_ounces, input.weight_percentile,
          input.height_value, input.height_percentile,
          input.head_circumference_value, input.head_circumference_percentile,
          input.bmi_value, input.bmi_percentile,
          input.blood_pressure, input.heart_rate,
          input.symptoms, input.temperature, input.illness_start_date ?? null, input.end_date ?? null, input.injury_type,
          input.injury_location, input.treatment,
          input.vision_prescription, input.vision_refraction ? JSON.stringify(input.vision_refraction) : null, input.ordered_glasses, input.ordered_contacts,
          input.dental_procedure_type, input.dental_notes, input.cleaning_type, input.cavities_found, input.cavities_filled,
          input.xrays_taken, input.fluoride_treatment, input.sealants_applied, input.dental_procedures ? JSON.stringify(input.dental_procedures) : null,
          vaccines, prescriptions ? JSON.stringify(prescriptions) : null, tagsJson, input.notes,
        ]
      );
    } catch (dbErr: unknown) {
      // Log for debugging; never log request body in production (may contain health data)
      const e = dbErr as Partial<{ message: unknown; code: unknown; stack: unknown }>;
      console.error('[POST /api/visits] Failed to INSERT visit:', {
        message: e.message,
        code: e.code,
        stack: e.stack,
      });

      // Provide clearer client-facing guidance for common schema mismatch
      const msg = typeof e.message === 'string' && e.message.includes('more target columns')
        ? 'Server error creating visit: database INSERT column/value count mismatch. Please check backend migrations and route parameter ordering.'
        : 'Failed to create visit';

      return next(new BadRequestError(msg));
    }

    const visit = convertVisitRow(result.rows[0]);
    console.log('[POST /api/visits] Visit created successfully, id:', visit.id);

    // Persist illnesses into join table if provided
    if (illnesses && illnesses.length > 0) {
      const insertPromises = illnesses.map(ill => query(`INSERT INTO visit_illnesses (visit_id, illness_type) VALUES ($1, $2)`, [visit.id, ill]));
      await Promise.all(insertPromises);
      visit.illnesses = illnesses;
    } else {
      visit.illnesses = null;
    }

    await recordAuditEvent({
      entityType: 'visit',
      entityId: visit.id,
      userId: req.userId ?? null,
      action: 'created',
      changes: {},
      summary: 'Visit created',
    });

    // Auto-create one illness entry (with multiple types) if requested and visit is sick
    if (input.create_illness && input.visit_type === 'sick' && (Array.isArray(illnesses) && illnesses.length > 0)) {
      try {
        const illnessStartDate = input.illness_start_date ?? input.visit_date;
        const severity = input.illness_severity != null && input.illness_severity >= 1 && input.illness_severity <= 10
          ? input.illness_severity
          : null;
        const illResult = await query<{ id: number }>(
          `INSERT INTO illnesses (
            child_id, start_date, end_date, symptoms, temperature, severity, visit_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            input.child_id,
            illnessStartDate,
            input.end_date,
            input.symptoms,
            input.temperature,
            severity,
            visit.id,
            input.notes,
          ]
        );
        const illnessId = illResult.rows[0].id;
        for (const t of illnesses) {
          await query('INSERT INTO illness_illness_types (illness_id, illness_type) VALUES ($1, $2)', [illnessId, t]);
        }
      } catch (illnessError) {
        // Log error but don't fail the visit creation
        console.error('Failed to create illness from visit:', illnessError);
      }
    }

    res.status(201).json(createResponse(visit));
  } catch (error) {
    console.error('[POST /api/visits] Error caught:', error);
    next(error);
  }
});

// ============================================================================
// PUT /api/visits/:id - Update visit
// ============================================================================

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    // Load current visit for audit diff (previous persisted state) and optimistic locking
    const currentResult = await query<VisitRow & { updated_at: Date }>(
      'SELECT *, updated_at FROM visits WHERE id = $1',
      [id]
    );
    if (currentResult.rows.length === 0) {
      throw new NotFoundError('Visit');
    }
    const currentRow = currentResult.rows[0];
    if (!(await canAccessChild(req.userId!, currentRow.child_id))) {
      throw new NotFoundError('Visit');
    }
    if (!(await canEditChild(req.userId!, currentRow.child_id))) {
      throw new ForbiddenError('You do not have permission to edit this visit.');
    }
    const currentVisit = convertVisitRow(currentRow);

    // Optimistic locking: check if client's version matches server's version
    const clientUpdatedAt = req.body.updated_at;
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      const serverTime = currentRow.updated_at;
      
      // Check for conflicts (client's version is stale)
      if (Math.abs(clientTime.getTime() - serverTime.getTime()) > 1000) { // 1 second tolerance
        throw new ConflictError(
          'Visit was modified by another user. Please refresh and try again.',
          { 
            currentVersion: serverTime.toISOString(),
            yourVersion: clientUpdatedAt 
          }
        );
      }
    }
    const illResCurrent = await query<{ illness_type: IllnessType }>(
      `SELECT illness_type FROM visit_illnesses WHERE visit_id = $1`,
      [id]
    );
    currentVisit.illnesses = illResCurrent.rows.length > 0 ? illResCurrent.rows.map((r) => r.illness_type) : null;

    // Build dynamic update query and payload for audit diff.
    // Only add to payload when req.body.X !== undefined so omitted fields are never tracked (partial updates / multiple forms).
    const updates: string[] = [];
    const values: unknown[] = [];
    const payload: Record<string, unknown> = {};
    let paramCount = 1;

    if (req.body.visit_date !== undefined) {
      const v = validateDate(req.body.visit_date, 'visit_date');
      payload.visit_date = v;
      updates.push(`visit_date = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.visit_time !== undefined) {
      const v = validateOptionalTime(req.body.visit_time);
      payload.visit_time = v;
      updates.push(`visit_time = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.visit_type !== undefined) {
      const v = validateVisitType(req.body.visit_type);
      payload.visit_type = v;
      updates.push(`visit_type = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.location !== undefined) {
      const v = validateOptionalString(req.body.location);
      payload.location = v;
      updates.push(`location = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.doctor_name !== undefined) {
      const v = validateOptionalString(req.body.doctor_name);
      payload.doctor_name = v;
      updates.push(`doctor_name = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.title !== undefined) {
      const v = validateOptionalString(req.body.title);
      payload.title = v;
      updates.push(`title = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.weight_value !== undefined) {
      const v = validateOptionalNumber(req.body.weight_value);
      payload.weight_value = v;
      updates.push(`weight_value = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.weight_ounces !== undefined) {
      const v = validateOptionalNumber(req.body.weight_ounces, 0, 15);
      payload.weight_ounces = v;
      updates.push(`weight_ounces = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.weight_percentile !== undefined) {
      const v = validateOptionalNumber(req.body.weight_percentile, 0, 100);
      payload.weight_percentile = v;
      updates.push(`weight_percentile = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.height_value !== undefined) {
      const v = validateOptionalNumber(req.body.height_value);
      payload.height_value = v;
      updates.push(`height_value = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.height_percentile !== undefined) {
      const v = validateOptionalNumber(req.body.height_percentile, 0, 100);
      payload.height_percentile = v;
      updates.push(`height_percentile = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.head_circumference_value !== undefined) {
      const v = validateOptionalNumber(req.body.head_circumference_value);
      payload.head_circumference_value = v;
      updates.push(`head_circumference_value = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.head_circumference_percentile !== undefined) {
      const v = validateOptionalNumber(req.body.head_circumference_percentile, 0, 100);
      payload.head_circumference_percentile = v;
      updates.push(`head_circumference_percentile = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.bmi_value !== undefined) {
      const v = validateOptionalNumber(req.body.bmi_value);
      payload.bmi_value = v;
      updates.push(`bmi_value = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.bmi_percentile !== undefined) {
      const v = validateOptionalNumber(req.body.bmi_percentile, 0, 100);
      payload.bmi_percentile = v;
      updates.push(`bmi_percentile = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.blood_pressure !== undefined) {
      const v = validateOptionalString(req.body.blood_pressure);
      payload.blood_pressure = v;
      updates.push(`blood_pressure = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.heart_rate !== undefined) {
      const v = validateOptionalNumber(req.body.heart_rate, 40, 250);
      payload.heart_rate = v;
      updates.push(`heart_rate = $${paramCount++}`);
      values.push(v);
    }

    // If illnesses array is provided, we'll update the join table after the main update completes
    let illnessesToSet: IllnessType[] | null = null;
    if (req.body.illnesses !== undefined) {
      illnessesToSet = validateIllnessesArray(req.body.illnesses);
      payload.illnesses = illnessesToSet;
    }

    if (req.body.symptoms !== undefined) {
      const v = validateOptionalString(req.body.symptoms);
      payload.symptoms = v;
      updates.push(`symptoms = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.temperature !== undefined) {
      const v = validateOptionalNumber(req.body.temperature, 95, 110);
      payload.temperature = v;
      updates.push(`temperature = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.illness_start_date !== undefined) {
      const v = validateOptionalDate(req.body.illness_start_date);
      payload.illness_start_date = v;
      updates.push(`illness_start_date = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.end_date !== undefined) {
      const v = validateOptionalDate(req.body.end_date);
      payload.end_date = v;
      updates.push(`end_date = $${paramCount++}`);
      values.push(v);
    }

    // Injury visit fields
    if (req.body.injury_type !== undefined) {
      const v = validateOptionalString(req.body.injury_type);
      payload.injury_type = v;
      updates.push(`injury_type = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.injury_location !== undefined) {
      const v = validateOptionalString(req.body.injury_location);
      payload.injury_location = v;
      updates.push(`injury_location = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.treatment !== undefined) {
      const v = validateOptionalString(req.body.treatment);
      payload.treatment = v;
      updates.push(`treatment = $${paramCount++}`);
      values.push(v);
    }

    // Vision visit fields
    if (req.body.vision_prescription !== undefined) {
      const v = validateOptionalString(req.body.vision_prescription);
      payload.vision_prescription = v;
      updates.push(`vision_prescription = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.vision_refraction !== undefined) {
      const vr = req.body.vision_refraction ? validateVisionRefraction(req.body.vision_refraction) : null;
      payload.vision_refraction = vr;
      updates.push(`vision_refraction = $${paramCount++}`);
      values.push(vr ? JSON.stringify(vr) : null);
    }

    if (req.body.ordered_glasses !== undefined) {
      const v = req.body.ordered_glasses === true ? true : (req.body.ordered_glasses === false ? false : null);
      payload.ordered_glasses = v;
      updates.push(`ordered_glasses = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.ordered_contacts !== undefined) {
      const v = req.body.ordered_contacts === true ? true : (req.body.ordered_contacts === false ? false : null);
      payload.ordered_contacts = v;
      updates.push(`ordered_contacts = $${paramCount++}`);
      values.push(v);
    }

    // Dental visit fields
    if (req.body.dental_procedure_type !== undefined) {
      const v = validateOptionalString(req.body.dental_procedure_type);
      payload.dental_procedure_type = v;
      updates.push(`dental_procedure_type = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.dental_notes !== undefined) {
      const v = validateOptionalString(req.body.dental_notes);
      payload.dental_notes = v;
      updates.push(`dental_notes = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.cleaning_type !== undefined) {
      const v = validateOptionalString(req.body.cleaning_type);
      payload.cleaning_type = v;
      updates.push(`cleaning_type = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.cavities_found !== undefined) {
      const v = validateOptionalNumber(req.body.cavities_found, 0);
      payload.cavities_found = v;
      updates.push(`cavities_found = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.cavities_filled !== undefined) {
      const v = validateOptionalNumber(req.body.cavities_filled, 0);
      payload.cavities_filled = v;
      updates.push(`cavities_filled = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.xrays_taken !== undefined) {
      const v = req.body.xrays_taken === true ? true : (req.body.xrays_taken === false ? false : null);
      payload.xrays_taken = v;
      updates.push(`xrays_taken = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.fluoride_treatment !== undefined) {
      const v = req.body.fluoride_treatment === true ? true : (req.body.fluoride_treatment === false ? false : null);
      payload.fluoride_treatment = v;
      updates.push(`fluoride_treatment = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.sealants_applied !== undefined) {
      const v = req.body.sealants_applied === true ? true : (req.body.sealants_applied === false ? false : null);
      payload.sealants_applied = v;
      updates.push(`sealants_applied = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.dental_procedures !== undefined) {
      const v = req.body.dental_procedures ? validateDentalProcedures(req.body.dental_procedures) : null;
      payload.dental_procedures = v;
      updates.push(`dental_procedures = $${paramCount++}`);
      values.push(v ? JSON.stringify(v) : null);
    }

    if (req.body.vaccines_administered !== undefined) {
      const v = validateVaccines(req.body.vaccines_administered);
      payload.vaccines_administered = v ? v.split(',').map(s => s.trim()).filter(Boolean) : null;
      updates.push(`vaccines_administered = $${paramCount++}`);
      values.push(v);
    }

    if (req.body.prescriptions !== undefined) {
      const prescriptions = validatePrescriptions(req.body.prescriptions);
      payload.prescriptions = prescriptions;
      updates.push(`prescriptions = $${paramCount++}`);
      values.push(prescriptions ? JSON.stringify(prescriptions) : null);
    }

    if (req.body.tags !== undefined) {
      const tagsArray = Array.isArray(req.body.tags) ? req.body.tags : [];
      const tagsVal = tagsArray.length > 0
        ? JSON.stringify(tagsArray.filter((t: unknown) => t && String(t).trim()))
        : null;
      payload.tags = tagsArray.filter((t: unknown) => t && String(t).trim());
      updates.push(`tags = $${paramCount++}`);
      values.push(tagsVal);
    }

    if (req.body.notes !== undefined) {
      const v = validateOptionalString(req.body.notes);
      payload.notes = v;
      updates.push(`notes = $${paramCount++}`);
      values.push(v);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No valid fields provided for update');
    }

    values.push(id);
    
    // Include updated_at in WHERE clause for optimistic locking
    const whereClause = clientUpdatedAt
      ? `WHERE id = $${paramCount} AND updated_at = $${paramCount + 1}`
      : `WHERE id = $${paramCount}`;
    const whereParams = clientUpdatedAt
      ? [...values, currentRow.updated_at]
      : values;

    const result = await query<VisitRow>(
      `UPDATE visits
       SET ${updates.join(', ')}, updated_at = NOW()
       ${whereClause}
       RETURNING *`,
      whereParams
    );

    if (result.rows.length === 0) {
      // No rows updated = conflict detected (if optimistic locking was used) or not found
      if (clientUpdatedAt) {
        throw new ConflictError(
          'Visit was modified by another user. Please refresh and try again.'
        );
      }
      throw new NotFoundError('Visit');
    }

    const visit = convertVisitRow(result.rows[0]);

    // If illnesses array provided, sync the join table to match the provided list
    if (illnessesToSet !== null) {
      await query(`DELETE FROM visit_illnesses WHERE visit_id = $1`, [id]);
      if (illnessesToSet.length > 0) {
        const insertPromises = illnessesToSet.map((ill: IllnessType) => query(`INSERT INTO visit_illnesses (visit_id, illness_type) VALUES ($1, $2)`, [id, ill]));
        await Promise.all(insertPromises);
        visit.illnesses = illnessesToSet;
      } else {
        visit.illnesses = null;
      }
    } else {
      const existing = await query<{ illness_type: IllnessType }>(
        `SELECT illness_type FROM visit_illnesses WHERE visit_id = $1`,
        [id]
      );
      visit.illnesses = existing.rows.length > 0 ? existing.rows.map((r) => r.illness_type) : null;
    }

    // Field-level audit: diff previous state vs incoming payload, persist to audit_events
    const changes = buildFieldDiff(
      currentVisit as unknown as Record<string, unknown>,
      payload,
      { excludeKeys: ['child_id'] }
    );
    if (Object.keys(changes).length > 0) {
      await recordAuditEvent({
        entityType: 'visit',
        entityId: id,
        userId: req.userId ?? null,
        action: 'updated',
        changes,
      });
    }

    res.json(createResponse(visit));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/visits/:id/history - Get change history (audit_events) for a visit
// ============================================================================
// Requires auth so req.userId is set for canViewAuditHistory; without it, 401 is returned and frontend logs user out.
router.get('/:id/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    // Check permissions
    if (!await canViewAuditHistory('visit', id, req.userId ?? null)) {
      throw new UnauthorizedError('You do not have permission to view this history');
    }

    // Parse pagination params (default: page=1, limit=50, max=200)
    const pagination = parsePaginationParams(req.query);
    const maxLimit = 200; // Higher limit for history than default
    const limit = Math.min(maxLimit, pagination.limit);
    const offset = (pagination.page - 1) * limit;

    // Get total count for pagination metadata
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM audit_events
       WHERE entity_type = 'visit' AND entity_id = $1`,
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await query<{
      id: string;
      entity_type: string;
      entity_id: number;
      user_id: number | null;
      action: string;
      changed_at: Date;
      changes: unknown;
      summary: string | null;
      user_name: string | null;
      user_email: string | null;
    }>(
      `SELECT 
        ae.id,
        ae.entity_type,
        ae.entity_id,
        ae.user_id,
        ae.action,
        ae.changed_at,
        ae.changes,
        ae.summary,
        u.username as user_name,
        u.email as user_email
       FROM audit_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.entity_type = 'visit' AND ae.entity_id = $1
       ORDER BY ae.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const data: AuditHistoryEvent[] = result.rows.map(row => {
      const changes = (row.changes as Record<string, { before: unknown; after: unknown }>) ?? {};
      // Regenerate summary from changes to filter out effectively empty changes
      // This fixes old audit events that were created before the filtering logic
      const regeneratedSummary = auditChangesSummary(changes, 'visit');
      // Use regenerated summary if available, otherwise fall back to stored summary
      const summary = regeneratedSummary || row.summary;
      
      return {
        id: Number(row.id),
        entity_type: 'visit' as const,
        entity_id: row.entity_id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        action: row.action as AuditHistoryEvent['action'],
        changed_at: row.changed_at.toISOString(),
        changes,
        summary,
      };
    });

    res.json(createPaginatedResponse(data, total, { ...pagination, limit, offset }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/visits/:id - Delete visit
// ============================================================================

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    const existing = await query<{ child_id: number }>('SELECT child_id FROM visits WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundError('Visit');
    }
    if (!(await canAccessChild(req.userId!, existing.rows[0].child_id))) {
      throw new NotFoundError('Visit');
    }
    if (!(await canEditChild(req.userId!, existing.rows[0].child_id))) {
      throw new ForbiddenError('You do not have permission to delete this visit.');
    }

    await query('DELETE FROM visits WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
