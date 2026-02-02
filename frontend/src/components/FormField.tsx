import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface BaseFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'date' | 'time' | 'number' | 'email' | 'password';
  options?: never;
  list?: string;
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  type: 'textarea';
}

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

function FormField({ label, error, required, type = 'text', ...props }: FormFieldProps) {
  const inputId = props.id || (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : `field-${Math.random().toString(36).substr(2, 9)}`);
  const inputClass = [styles.input, 'form-input', error && 'error'].filter(Boolean).join(' ');
  const textareaClass = [styles.textarea, 'form-textarea', error && 'error'].filter(Boolean).join(' ');

  return (
    <div className={`${styles.root} form-field`}>
      {label && (
        <label htmlFor={inputId} className={`${styles.label} form-label`}>
          {label}
          {required && <span className={styles.requiredIndicator}>*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select
          id={inputId}
          className={inputClass}
          value={(props as SelectFieldProps).value}
          onChange={(props as SelectFieldProps).onChange}
          disabled={(props as SelectFieldProps).disabled}
          required={required}
        >
          {(props as SelectFieldProps).options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={inputId}
          className={textareaClass}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          className={inputClass}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <span className={`${styles.error} form-error`}>{error}</span>}
    </div>
  );
}

export default FormField;
