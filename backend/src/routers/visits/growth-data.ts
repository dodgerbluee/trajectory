/**
 * Growth data endpoint - provides age-based growth chart data
 */

import { Response, NextFunction } from 'express';
import { query } from '../../db/connection.js';
import { createResponse } from '../../types/api.js';
import { BadRequestError } from '../../middleware/error-handler.js';
import { type AuthRequest } from '../../middleware/auth.js';
import { getAccessibleChildIds } from '../../features/families/service/family-access.js';

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

function parseDecimal(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const parsed =
    typeof val === 'string' ? parseFloat(val) :
    typeof val === 'number' ? val :
    NaN;
  return Number.isNaN(parsed) ? null : parsed;
}

export async function handleGetGrowthData(req: AuthRequest, res: Response, next: NextFunction) {
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

    const result = await query<GrowthRow>(queryText, queryParams);

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
    const birthDataPoints: GrowthPoint[] = [];
    childBirthData.forEach((birthData, cid) => {
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
            child_id: cid,
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
}
