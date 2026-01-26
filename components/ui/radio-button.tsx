"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioButtonProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string;
}

const RadioButton = React.forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ className, id, value, name, checked, onChange, disabled, ...props }, ref) => {
    const radioId = id || `radio-${name}-${value}`;

    return (
      <>
        <style jsx>{`
          .radio-button {
            display: inline-block;
            position: relative;
            cursor: pointer;
          }

          .radio-button__input {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
          }


          .radio-button__custom {
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #555;
            transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          }

          .radio-button__input:checked + .radio-button__label .radio-button__custom {
            transform: translateY(-50%) scale(1);
            border: 8px solid #3caa41;
            color: #3caa41;
          }

          .radio-button__input:checked + .radio-button__label {
            color: #3caa41;
          }

          .radio-button__label:hover .radio-button__custom {
            transform: translateY(-50%) scale(1.1);
            border-color: #3caa41;
          }

          .radio-button__input:disabled + .radio-button__label {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .radio-button__input:disabled + .radio-button__label:hover .radio-button__custom {
            transform: translateY(-50%);
            border-color: #555;
            box-shadow: none;
          }
        `}</style>
        <div className={cn("radio-button", className)}>
          <input
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            value={value}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="radio-button__input"
            {...props}
          />
          <label htmlFor={radioId} className="radio-button__label">
            <span className="radio-button__custom"></span>
          </label>
        </div>
      </>
    );
  }
);

RadioButton.displayName = "RadioButton";

export interface RadioButtonGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  name,
  value,
  onChange,
  children,
  className,
  disabled,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <>
      <style jsx>{`
        .radio-buttons-container {
          display: flex;
          align-items: center;
          gap: 24px;
        }
      `}</style>
      <div className={cn("radio-buttons-container", className)}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement<RadioButtonProps>(child)) {
            return React.cloneElement(child, {
              name,
              checked: child.props.value === value,
              onChange: handleChange,
              disabled: disabled || child.props.disabled,
            });
          }
          return child;
        })}
      </div>
    </>
  );
};

export { RadioButton };
