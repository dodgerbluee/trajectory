/**
 * Visit validation helpers
 */

import { BadRequestError } from '../../middleware/error-handler.js';
import type { VisitType, IllnessType } from '../../types/database.js';

export function validateVisitType(value: unknown): VisitType {
  if (typeof value !== 'string' || !['wellness', 'sick', 'injury', 'vision', 'dental'].includes(value)) {
    throw new BadRequestError('visit_type must be "wellness", "sick", "injury", "vision", or "dental"');
  }
  return value as VisitType;
}

export function validateIllnessType(value: unknown): IllnessType | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const validTypes = ['flu', 'strep', 'rsv', 'covid', 'cold', 'stomach_bug', 'ear_infection', 'hand_foot_mouth', 'croup', 'pink_eye', 'other'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new BadRequestError(`illness_type must be one of: ${validTypes.join(', ')}`);
  }
  return value as IllnessType;
}

export function validateIllnessesArray(value: unknown): IllnessType[] | null {
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

export function validateDate(value: unknown, fieldName: string): string {
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

export function validateOptionalDate(value: unknown): string | null {
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

export function validateOptionalNumber(value: unknown, min?: number, max?: number): number | null {
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

export function validateOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestError('Value must be a string');
  }
  return value.trim();
}

/** Optional time "HH:MM" or "HH:MM:SS"; returns "HH:MM" or null. */
export function validateOptionalTime(value: unknown): string | null {
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

export function validateVaccines(value: unknown): string | null {
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

export type PrescriptionInput = { medication: string; dosage: string; duration: string; notes?: string };

export function validatePrescriptions(value: unknown): PrescriptionInput[] | null {
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

export type DentalProcedure = {
  procedure: string;
  tooth_number?: string | null;
  location?: string | null;
  notes?: string | null;
};

export function validateDentalProcedures(value: unknown): DentalProcedure[] | null {
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

export type VisionEye = { sphere: number | null; cylinder: number | null; axis: number | null };
export type VisionRefractionInput = { od: VisionEye; os: VisionEye; notes?: string };

export function validateVisionRefraction(value: unknown): VisionRefractionInput | null {
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
