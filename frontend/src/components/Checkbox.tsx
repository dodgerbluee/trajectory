import { InputHTMLAttributes } from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Checkbox({ label, checked, onChange, disabled, className = '', ...props }: CheckboxProps) {
  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')} data-checkbox-wrapper>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={styles.input}
          {...props}
        />
        <span className={styles.custom}>
          <svg className={styles.checkmark} viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className={styles.text}>{label}</span>
      </label>
    </div>
  );
}

export default Checkbox;
