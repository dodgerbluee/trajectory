/**
 * Modern React Select/Dropdown component
 * Replaces native select with a styled, accessible dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { HiChevronDown } from 'react-icons/hi';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  id,
  label,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="modern-select-wrapper">
      {label && <label htmlFor={id} className="modern-select-label">{label}</label>}
      <div
        ref={selectRef}
        className={`modern-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        id={id}
      >
        <span className="modern-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <HiChevronDown className={`modern-select-icon ${isOpen ? 'open' : ''}`} />
        {isOpen && (
          <div className="modern-select-menu">
            {options.map((option) => (
              <div
                key={option.value}
                className={`modern-select-option ${value === option.value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
