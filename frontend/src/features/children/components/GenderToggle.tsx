/**
 * GenderToggle — segmented two-option (Male / Female) control.
 *
 * Replaces ad-hoc <select> usage so the child form has a single, consistent
 * gender input across Add and Edit pages. Uses the same visual treatment
 * the AddChildPage already had.
 */

import { FaMars, FaVenus } from 'react-icons/fa';
import type { Gender } from '@shared/types/api';
import styles from './GenderToggle.module.css';

interface GenderToggleProps {
  value: Gender;
  onChange: (next: Gender) => void;
  disabled?: boolean;
  /** Optional aria-label for the role=group wrapper. */
  ariaLabel?: string;
}

function GenderToggle({
  value,
  onChange,
  disabled,
  ariaLabel = 'Gender',
}: GenderToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={() => onChange('male')}
        className={`${styles.option} ${value === 'male' ? styles.selected : ''}`}
        disabled={disabled}
        aria-pressed={value === 'male'}
      >
        <FaMars className={styles.optionIcon} aria-hidden />
        <span>Male</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('female')}
        className={`${styles.option} ${value === 'female' ? styles.selected : ''}`}
        disabled={disabled}
        aria-pressed={value === 'female'}
      >
        <FaVenus className={styles.optionIcon} aria-hidden />
        <span>Female</span>
      </button>
    </div>
  );
}

export default GenderToggle;
