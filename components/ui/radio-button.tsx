'use client';

import React, { useState } from 'react';
import './radio-button.css';

export interface RadioOption {
  value: string;
  label?: string;
}

export interface RadioButtonProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable Radio Button Component
 * Displays radio buttons with animated red plus/cross checkmark
 */
export const RadioButton: React.FC<RadioButtonProps> = ({
  options,
  value,
  onChange,
  name = 'radio-button',
  className = '',
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = useState(value || '');

  const handleChange = (newValue: string) => {
    if (disabled) return;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className={`radio-input ${className}`}>
      {options.map((option, index) => (
        <div key={option.value} className="radio-wrapper">
          <input
            type="radio"
            id={`${name}-${option.value}`}
            name={name}
            value={option.value}
            checked={internalValue === option.value}
            onChange={() => handleChange(option.value)}
            disabled={disabled}
            aria-label={option.label || option.value}
          />
          <div className="plus1">
            <div className="plus2"></div>
          </div>
          {option.label && (
            <label htmlFor={`${name}-${option.value}`} className="radio-label">
              {option.label}
            </label>
          )}
        </div>
      ))}
    </div>
  );
};

export default RadioButton;
