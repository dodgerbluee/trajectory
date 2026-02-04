import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface BaseFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
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

interface FormFieldGroupProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  hintClassName?: string;
  labelFor?: string;
}

export function FormFieldHint({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={[styles.hint, 'form-hint', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function FormFieldGroup({
  label,
  required,
  error,
  hint,
  children,
  className,
  labelClassName,
  hintClassName,
  labelFor,
}: FormFieldGroupProps) {
  return (
    <div className={[styles.root, 'form-field', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={labelFor}
          className={[styles.label, 'form-label', labelClassName].filter(Boolean).join(' ')}
        >
          {label}
          {required && <span className={styles.requiredIndicator}>*</span>}
        </label>
      )}

      {children}

      {error && <span className={[styles.error, 'form-error'].filter(Boolean).join(' ')}>{error}</span>}
      {!error && hint && <FormFieldHint className={hintClassName}>{hint}</FormFieldHint>}
    </div>
  );
}

function FormField({ label, error, required, hint, type = 'text', ...props }: FormFieldProps) {
  const inputId = props.id || (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : `field-${Math.random().toString(36).substr(2, 9)}`);
  const inputClass = [styles.input, 'form-input', error && 'error'].filter(Boolean).join(' ');
  const textareaClass = [styles.textarea, 'form-textarea', error && 'error'].filter(Boolean).join(' ');

  return (
    <FormFieldGroup label={label} required={required} error={error} hint={hint} labelFor={inputId}>
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
    </FormFieldGroup>
  );
}

export default FormField;
