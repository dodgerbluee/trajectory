/**
 * Visit Routes - Unified wellness and sick visits
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { createResponse } from '../types/api.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import type { VisitRow, CreateVisitInput, VisitType, IllnessType } from '../types/database.js';
import { visitRowToVisit as convertVisitRow } from '../types/database.js';

const router = Router();

// ============================================================================
// Validation helpers
// ============================================================================

function validateVisitType(value: any): VisitType {
  if (typeof value !== 'string' || !['wellness', 'sick', 'injury', 'vision'].includes(value)) {
    throw new BadRequestError('visit_type must be "wellness", "sick", "injury", or "vision"');
  }
  return value as VisitType;
}

function validateIllnessType(value: any): IllnessType | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const validTypes = ['flu', 'strep', 'rsv', 'covid', 'cold', 'stomach_bug', 'ear_infection', 'hand_foot_mouth', 'croup', 'pink_eye', 'other'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new BadRequestError(`illness_type must be one of: ${validTypes.join(', ')}`);
  }
  return value as IllnessType;
}

function validateDate(value: any, fieldName: string): string {
  if (!value) {
    throw new BadRequestError(`${fieldName} is required`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }
  return value;
}

function validateOptionalDate(value: any): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestError('Invalid date format');
  }
  return value;
}

function validateOptionalNumber(value: any, min?: number, max?: number): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = typeof value === 'number' ? value : parseFloat(value);
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

function validateOptionalString(value: any): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestError('Value must be a string');
  }
  return value.trim();
}

function validateVaccines(value: any): string | null {
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

function validatePrescriptions(value: any): any {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new BadRequestError('prescriptions must be an array');
  }
  // Validate prescription structure
  value.forEach((rx: any, index: number) => {
    if (!rx.medication || typeof rx.medication !== 'string') {
      throw new BadRequestError(`prescriptions[${index}].medication is required and must be a string`);
    }
    if (!rx.dosage || typeof rx.dosage !== 'string') {
      throw new BadRequestError(`prescriptions[${index}].dosage is required and must be a string`);
    }
    if (!rx.duration || typeof rx.duration !== 'string') {
      throw new BadRequestError(`prescriptions[${index}].duration is required and must be a string`);
    }
  });
  return value;
}

// ============================================================================
// GET /api/visits - List visits with filtering
// ============================================================================

// ============================================================================
// GET /api/visits/growth-data - Get growth data for charts (age-based)
// ============================================================================

router.get('/growth-data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;

    if (childId && isNaN(childId)) {
      throw new BadRequestError('Invalid child_id');
    }

    // Build query for wellness visits with measurements
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
        AND (
          v.weight_value IS NOT NULL 
          OR v.height_value IS NOT NULL 
          OR v.head_circumference_value IS NOT NULL 
          OR v.bmi_value IS NOT NULL
        )
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

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

    const result = await query(queryText, queryParams);

    // Parse decimal values (PostgreSQL returns DECIMAL as string)
    const parseDecimal = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      const parsed = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(parsed) ? null : parsed;
    };

    // Get unique children to add birth data points
    const childBirthData = new Map<number, { birth_weight: string | null; birth_height: string | null; date_of_birth: Date; child_name: string; gender: string }>();
    
    result.rows.forEach((row: any) => {
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
    const birthDataPoints: any[] = [];
    childBirthData.forEach((birthData, childId) => {
      const birthWeight = parseDecimal(birthData.birth_weight);
      const birthHeight = parseDecimal(birthData.birth_height);
      
      if (birthWeight !== null || birthHeight !== null) {
        // Only include if we're showing this child (filtered by childId) or all children
        const shouldInclude = !childId || result.rows.some((r: any) => r.child_id === childId);
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
    const growthData = result.rows.map((row: any) => {
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

    res.json(createResponse(allGrowthData));
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.query.child_id ? parseInt(req.query.child_id as string) : undefined;
    const visitType = req.query.visit_type as VisitType | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    let queryText = 'SELECT * FROM visits WHERE 1=1';
    const queryParams: any[] = [];
    let paramCount = 1;

    if (childId) {
      queryText += ` AND child_id = $${paramCount++}`;
      queryParams.push(childId);
    }

    if (visitType) {
      queryText += ` AND visit_type = $${paramCount++}`;
      queryParams.push(visitType);
    }

    queryText += ` ORDER BY visit_date DESC, id DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);

    const result = await query<VisitRow>(queryText, queryParams);
    const visits = result.rows.map(convertVisitRow);

    res.json(createResponse(visits));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/visits/:id - Get single visit
// ============================================================================

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

    res.json(createResponse(convertVisitRow(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/visits - Create new visit
// ============================================================================

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateVisitInput = {
      child_id: parseInt(req.body.child_id),
      visit_date: validateDate(req.body.visit_date, 'visit_date'),
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
      
      illness_type: validateIllnessType(req.body.illness_type),
      symptoms: validateOptionalString(req.body.symptoms),
      temperature: validateOptionalNumber(req.body.temperature, 95, 110),
      end_date: validateOptionalDate(req.body.end_date),
      
      // Injury visit fields
      injury_type: validateOptionalString(req.body.injury_type),
      injury_location: validateOptionalString(req.body.injury_location),
      treatment: validateOptionalString(req.body.treatment),
      follow_up_date: validateOptionalDate(req.body.follow_up_date),
      
      vaccines_administered: req.body.vaccines_administered,
      prescriptions: req.body.prescriptions,
      
      notes: validateOptionalString(req.body.notes),
    };

    // Validate: sick visits must have illness_type
    if (input.visit_type === 'sick' && !input.illness_type) {
      throw new BadRequestError('illness_type is required for sick visits');
    }

    // Validate: injury visits should have injury_type
    if (input.visit_type === 'injury' && !input.injury_type) {
      throw new BadRequestError('injury_type is required for injury visits');
    }

    // Process vaccines and prescriptions
    const vaccines = validateVaccines(input.vaccines_administered);
    const prescriptions = validatePrescriptions(input.prescriptions);
    
    // Process tags - store as JSON array string
    const tagsJson = input.tags && input.tags.length > 0 
      ? JSON.stringify(input.tags.filter(t => t && t.trim()))
      : null;

    const result = await query<VisitRow>(
      `INSERT INTO visits (
        child_id, visit_date, visit_type, location, doctor_name, title,
        weight_value, weight_ounces, weight_percentile,
        height_value, height_percentile,
        head_circumference_value, head_circumference_percentile,
        bmi_value, bmi_percentile,
        blood_pressure, heart_rate,
        illness_type, symptoms, temperature, end_date,
        injury_type, injury_location, treatment, follow_up_date,
        vision_prescription, needs_glasses,
        vaccines_administered, prescriptions, tags, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11,
        $12, $13,
        $14, $15,
        $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27,
        $28, $29, $30, $31
      ) RETURNING *`,
      [
        input.child_id, input.visit_date, input.visit_type, input.location, input.doctor_name, input.title,
        input.weight_value, input.weight_ounces, input.weight_percentile,
        input.height_value, input.height_percentile,
        input.head_circumference_value, input.head_circumference_percentile,
        input.bmi_value, input.bmi_percentile,
        input.blood_pressure, input.heart_rate,
        input.illness_type, input.symptoms, input.temperature, input.end_date,
        input.injury_type, input.injury_location, input.treatment, input.follow_up_date,
        input.vision_prescription, input.needs_glasses,
        vaccines, prescriptions ? JSON.stringify(prescriptions) : null, tagsJson, input.notes,
      ]
    );

    const visit = convertVisitRow(result.rows[0]);

    // Auto-create illness entry if requested and visit is sick
    if (input.create_illness && input.visit_type === 'sick' && input.illness_type) {
      try {
        await query(
          `INSERT INTO illnesses (
            child_id, illness_type, start_date, end_date, symptoms, temperature, visit_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            input.child_id,
            input.illness_type,
            input.visit_date,
            input.end_date,
            input.symptoms,
            input.temperature,
            visit.id,
            input.notes,
          ]
        );
      } catch (illnessError) {
        // Log error but don't fail the visit creation
        console.error('Failed to create illness from visit:', illnessError);
      }
    }

    res.status(201).json(createResponse(visit));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/visits/:id - Update visit
// ============================================================================

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.body.visit_date !== undefined) {
      updates.push(`visit_date = $${paramCount++}`);
      values.push(validateDate(req.body.visit_date, 'visit_date'));
    }

    if (req.body.visit_type !== undefined) {
      updates.push(`visit_type = $${paramCount++}`);
      values.push(validateVisitType(req.body.visit_type));
    }

    if (req.body.location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(validateOptionalString(req.body.location));
    }

    if (req.body.doctor_name !== undefined) {
      updates.push(`doctor_name = $${paramCount++}`);
      values.push(validateOptionalString(req.body.doctor_name));
    }

    if (req.body.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(validateOptionalString(req.body.title));
    }

    if (req.body.weight_value !== undefined) {
      updates.push(`weight_value = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.weight_value));
    }

    if (req.body.weight_ounces !== undefined) {
      updates.push(`weight_ounces = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.weight_ounces, 0, 15));
    }

    if (req.body.weight_percentile !== undefined) {
      updates.push(`weight_percentile = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.weight_percentile, 0, 100));
    }

    if (req.body.height_value !== undefined) {
      updates.push(`height_value = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.height_value));
    }

    if (req.body.height_percentile !== undefined) {
      updates.push(`height_percentile = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.height_percentile, 0, 100));
    }

    if (req.body.head_circumference_value !== undefined) {
      updates.push(`head_circumference_value = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.head_circumference_value));
    }

    if (req.body.head_circumference_percentile !== undefined) {
      updates.push(`head_circumference_percentile = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.head_circumference_percentile, 0, 100));
    }

    if (req.body.bmi_value !== undefined) {
      updates.push(`bmi_value = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.bmi_value));
    }

    if (req.body.bmi_percentile !== undefined) {
      updates.push(`bmi_percentile = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.bmi_percentile, 0, 100));
    }

    if (req.body.blood_pressure !== undefined) {
      updates.push(`blood_pressure = $${paramCount++}`);
      values.push(validateOptionalString(req.body.blood_pressure));
    }

    if (req.body.heart_rate !== undefined) {
      updates.push(`heart_rate = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.heart_rate, 40, 250));
    }

    if (req.body.illness_type !== undefined) {
      updates.push(`illness_type = $${paramCount++}`);
      values.push(validateIllnessType(req.body.illness_type));
    }

    if (req.body.symptoms !== undefined) {
      updates.push(`symptoms = $${paramCount++}`);
      values.push(validateOptionalString(req.body.symptoms));
    }

    if (req.body.temperature !== undefined) {
      updates.push(`temperature = $${paramCount++}`);
      values.push(validateOptionalNumber(req.body.temperature, 95, 110));
    }

    if (req.body.end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(validateOptionalDate(req.body.end_date));
    }

    // Injury visit fields
    if (req.body.injury_type !== undefined) {
      updates.push(`injury_type = $${paramCount++}`);
      values.push(validateOptionalString(req.body.injury_type));
    }

    if (req.body.injury_location !== undefined) {
      updates.push(`injury_location = $${paramCount++}`);
      values.push(validateOptionalString(req.body.injury_location));
    }

    if (req.body.treatment !== undefined) {
      updates.push(`treatment = $${paramCount++}`);
      values.push(validateOptionalString(req.body.treatment));
    }

    if (req.body.follow_up_date !== undefined) {
      updates.push(`follow_up_date = $${paramCount++}`);
      values.push(validateOptionalDate(req.body.follow_up_date));
    }

    // Vision visit fields
    if (req.body.vision_prescription !== undefined) {
      updates.push(`vision_prescription = $${paramCount++}`);
      values.push(validateOptionalString(req.body.vision_prescription));
    }

    if (req.body.needs_glasses !== undefined) {
      updates.push(`needs_glasses = $${paramCount++}`);
      values.push(req.body.needs_glasses === true ? true : (req.body.needs_glasses === false ? false : null));
    }

    if (req.body.vaccines_administered !== undefined) {
      updates.push(`vaccines_administered = $${paramCount++}`);
      values.push(validateVaccines(req.body.vaccines_administered));
    }

    if (req.body.prescriptions !== undefined) {
      updates.push(`prescriptions = $${paramCount++}`);
      const prescriptions = validatePrescriptions(req.body.prescriptions);
      values.push(prescriptions ? JSON.stringify(prescriptions) : null);
    }

    if (req.body.tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      const tagsArray = Array.isArray(req.body.tags) ? req.body.tags : [];
      values.push(tagsArray.length > 0 ? JSON.stringify(tagsArray.filter((t: any) => t && String(t).trim())) : null);
    }

    if (req.body.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(validateOptionalString(req.body.notes));
    }

    if (updates.length === 0) {
      throw new BadRequestError('No valid fields provided for update');
    }

    values.push(id);

    const result = await query<VisitRow>(
      `UPDATE visits
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Visit');
    }

    res.json(createResponse(convertVisitRow(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/visits/:id - Delete visit
// ============================================================================

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError('Invalid visit ID');
    }

    const result = await query(
      'DELETE FROM visits WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Visit');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
