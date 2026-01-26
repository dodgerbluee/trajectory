import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'date' | 'number' | 'email' | 'password';
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
  const inputId = props.id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className="form-field">
      <label htmlFor={inputId} className="form-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      
      {type === 'select' ? (
        <select
          id={inputId}
          className={`form-input ${error ? 'error' : ''}`}
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
          className={`form-textarea ${error ? 'error' : ''}`}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          className={`form-input ${error ? 'error' : ''}`}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export default FormField;
