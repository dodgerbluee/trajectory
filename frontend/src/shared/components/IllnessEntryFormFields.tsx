/**
 * Shared illness entry fields used in:
 * - Visit form Illness section (illness_start_date / end_date)
 * - Add Illness page (start_date / end_date)
 * - Edit Illness page (start_date / end_date)
 */

import FormField from './FormField';
import IllnessesInput from './IllnessesInput';
import SeveritySelector from '../../features/medical/components/SeveritySelector';
import type { IllnessType } from '../types/api';
import styles from './IllnessEntryFormFields.module.css';

export interface IllnessEntryFormValue {
  illness_type?: IllnessType | null;
  illnesses?: IllnessType[] | null;
  symptoms?: string | null;
  temperature?: number | null;
  illness_severity?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  illness_start_date?: string | null;
}

export interface IllnessEntryFormFieldsProps {
  value: IllnessEntryFormValue;
  onChange: (next: IllnessEntryFormValue) => void;
  selectedIllnesses: IllnessType[];
  onSelectedIllnessesChange: (ills: IllnessType[]) => void;
  disabled?: boolean;
  /** Use 'visit' for illness_start_date + end_date, 'standalone' for start_date + end_date */
  dateMode: 'visit' | 'standalone';
  /** For visit form: max date for start = visit_date */
  maxStartDate?: string;
  /** For visit form: min date for end = illness_start_date or visit_date */
  minEndDate?: string;
}

export default function IllnessEntryFormFields({
  value,
  onChange,
  selectedIllnesses,
  onSelectedIllnessesChange,
  disabled = false,
  dateMode,
  maxStartDate,
  minEndDate,
}: IllnessEntryFormFieldsProps) {
  const startVal = dateMode === 'visit' ? value.illness_start_date : value.start_date;
  const endVal = value.end_date;

  const set = (patch: Partial<IllnessEntryFormValue>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className={styles.root}>
      <div className={styles.illnessSelector}>
        <IllnessesInput
          value={selectedIllnesses}
          onChange={(ills) => {
            onSelectedIllnessesChange(ills);
            // Do not update formData.illness_type – it causes re-renders/effects that overwrite multi-select
          }}
          disabled={disabled}
        />
      </div>

      <FormField
        label="Symptoms"
        type="textarea"
        value={value.symptoms ?? ''}
        onChange={(e) => set({ symptoms: e.target.value || null })}
        disabled={disabled}
        placeholder="Describe symptoms..."
        rows={3}
      />

      <div className={styles.row}>
        <div className={styles.severityField}>
          <SeveritySelector
            value={value.illness_severity ?? null}
            onChange={(severity) => set({ illness_severity: severity })}
            disabled={disabled}
          />
        </div>
        <FormField
          label="Temperature (°F)"
          type="number"
          value={value.temperature ?? ''}
          onChange={(e) => set({ temperature: e.target.value ? parseFloat(e.target.value) : null })}
          disabled={disabled}
          placeholder="e.g., 102.5"
          step="0.1"
          min="95"
          max="110"
        />
      </div>

      <div className={styles.row}>
        <FormField
          label={dateMode === 'visit' ? 'Illness Start Date' : 'Start Date'}
          type="date"
          value={startVal ?? ''}
          onChange={(e) => set(dateMode === 'visit' ? { illness_start_date: e.target.value || null } : { start_date: e.target.value || null })}
          disabled={disabled}
          max={maxStartDate}
        />
        <FormField
          label={dateMode === 'visit' ? 'Illness End Date (if resolved)' : 'End Date (optional)'}
          type="date"
          value={endVal ?? ''}
          onChange={(e) => set({ end_date: e.target.value || null })}
          disabled={disabled}
          min={minEndDate}
        />
      </div>
    </div>
  );
}
