/**
 * BirthMetricInputs — small focused controls for the optional birth weight
 * (lb + oz pair) and birth height (inches) fields.
 *
 * Both AddChildPage and EditChildPage need these. Extracted so unit display,
 * spinner suppression, mobile sizing, and inputMode hints stay consistent.
 */

import { FormFieldGroup } from '@shared/components/FormField';
import styles from './BirthMetricInputs.module.css';

interface BirthWeightInputProps {
  pounds: string;
  ounces: string;
  onPoundsChange: (next: string) => void;
  onOuncesChange: (next: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function BirthWeightInput({
  pounds,
  ounces,
  onPoundsChange,
  onOuncesChange,
  disabled,
  label = 'Birth Weight',
  className,
}: BirthWeightInputProps) {
  return (
    <FormFieldGroup label={label} className={className}>
      <div className={styles.row}>
        <input
          type="number"
          inputMode="numeric"
          value={pounds}
          onChange={(e) => onPoundsChange(e.target.value)}
          placeholder="7"
          min="0"
          disabled={disabled}
          className={`form-input ${styles.input}`}
          aria-label="Pounds"
        />
        <span className={styles.unit}>lb</span>
        <input
          type="number"
          inputMode="numeric"
          value={ounces}
          onChange={(e) => onOuncesChange(e.target.value)}
          placeholder="8"
          min="0"
          max="15"
          disabled={disabled}
          className={`form-input ${styles.input}`}
          aria-label="Ounces"
        />
        <span className={styles.unit}>oz</span>
      </div>
    </FormFieldGroup>
  );
}

interface BirthHeightInputProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function BirthHeightInput({
  value,
  onChange,
  disabled,
  label = 'Birth Height',
  className,
}: BirthHeightInputProps) {
  return (
    <FormFieldGroup label={label} className={className}>
      <div className={styles.row}>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="20"
          min="0"
          step="0.1"
          disabled={disabled}
          className={`form-input ${styles.input}`}
          aria-label="Inches"
        />
        <span className={styles.unit}>in</span>
      </div>
    </FormFieldGroup>
  );
}
