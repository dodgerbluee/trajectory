/**
 * useChildFormState — single source of truth for the Add/Edit Child form.
 *
 * Owns:
 *  - formData shape (all 8 fields)
 *  - errors map + `validate()` (delegates to validateChildForm)
 *  - `toCreatePayload()` / `toUpdatePayload()` — normalize string inputs to
 *    the API's number-or-null shape (parseFloat for weight/height,
 *    parseInt-with-NaN-fallback for ounces, trim+empty-coerce for notes).
 *
 * Both AddChildPage and EditChildPage use this so the field set, validation
 * rules, and payload normalization can never drift between the two pages.
 */

import { useCallback, useState } from 'react';
import { validateChildForm, getTodayDate, formatDateForInput } from '@lib/validation';
import type {
  Child,
  CreateChildInput,
  UpdateChildInput,
  Gender,
} from '@shared/types/api';

export interface ChildFormData {
  name: string;
  date_of_birth: string;
  gender: Gender;
  notes: string;
  due_date: string;
  birth_weight: string;
  birth_weight_ounces: string;
  birth_height: string;
}

export type ChildFormErrors = Record<string, string>;

export function emptyChildFormData(): ChildFormData {
  return {
    name: '',
    date_of_birth: getTodayDate(),
    gender: 'male',
    notes: '',
    due_date: '',
    birth_weight: '',
    birth_weight_ounces: '',
    birth_height: '',
  };
}

export function childFormDataFromChild(child: Child): ChildFormData {
  return {
    name: child.name,
    date_of_birth: formatDateForInput(child.date_of_birth),
    gender: child.gender,
    notes: child.notes || '',
    due_date: child.due_date ? formatDateForInput(child.due_date) : '',
    birth_weight: child.birth_weight?.toString() || '',
    birth_weight_ounces: child.birth_weight_ounces?.toString() || '',
    birth_height: child.birth_height?.toString() || '',
  };
}

/**
 * Normalize the raw string inputs into the API's number-or-null shape.
 * Shared between create and update paths so a single rule controls how
 * blank strings, non-numeric strings, and zeros are coerced.
 */
function normalizePayload(formData: ChildFormData) {
  const ouncesParsed =
    formData.birth_weight_ounces && formData.birth_weight_ounces.trim() !== ''
      ? parseInt(formData.birth_weight_ounces, 10)
      : NaN;
  return {
    name: formData.name.trim(),
    date_of_birth: formData.date_of_birth,
    gender: formData.gender,
    notes: formData.notes.trim() || undefined,
    due_date: formData.due_date || null,
    birth_weight: formData.birth_weight ? parseFloat(formData.birth_weight) : null,
    birth_weight_ounces: Number.isNaN(ouncesParsed) ? null : ouncesParsed,
    birth_height: formData.birth_height ? parseFloat(formData.birth_height) : null,
  };
}

interface UseChildFormStateOptions {
  /** Initial form data (e.g., from a fetched Child for edit, or empty for add). */
  initial?: ChildFormData;
}

export function useChildFormState(options: UseChildFormStateOptions = {}) {
  const [formData, setFormData] = useState<ChildFormData>(
    options.initial ?? emptyChildFormData(),
  );
  const [errors, setErrors] = useState<ChildFormErrors>({});

  /**
   * Patch a subset of fields. Use instead of `setFormData({ ...formData, ... })`
   * at every call site so the surface area stays small.
   */
  const updateField = useCallback(<K extends keyof ChildFormData>(
    key: K,
    value: ChildFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Replace all form data (e.g., when an async fetch resolves in EditChildPage). */
  const reset = useCallback((next: ChildFormData) => {
    setFormData(next);
    setErrors({});
  }, []);

  /** Run validation; returns true if valid. Errors are stored on the hook. */
  const validate = useCallback((): boolean => {
    const result = validateChildForm(formData);
    setErrors(result.errors);
    return result.isValid;
  }, [formData]);

  /** Clear an error for a single field (e.g., when avatar is replaced). */
  const clearError = useCallback((key: string) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  }, []);

  const toCreatePayload = useCallback(
    (extras?: { family_id?: number }): CreateChildInput => ({
      ...(extras?.family_id != null && { family_id: extras.family_id }),
      ...normalizePayload(formData),
    }),
    [formData],
  );

  const toUpdatePayload = useCallback(
    (): UpdateChildInput => normalizePayload(formData),
    [formData],
  );

  return {
    formData,
    setFormData,
    updateField,
    reset,
    errors,
    setErrors,
    clearError,
    validate,
    toCreatePayload,
    toUpdatePayload,
  };
}
