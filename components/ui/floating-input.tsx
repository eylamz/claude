'use client';

import * as React from "react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  variant?: 'default' | 'header' | 'outline';
  label?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, error, type, variant = 'default', label, id, required, value, defaultValue, onChange, onFocus, onBlur, ...props }, ref) => {
    const locale = useLocale();
    const isRTL = locale === 'he';
    const inputId = React.useId();
    const finalId = id || inputId;
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const internalRef = React.useRef<HTMLInputElement>(null);
    
    // Merge refs
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement, []);

    // Check if input has value on mount (for controlled/uncontrolled components)
    React.useEffect(() => {
      const currentValue = value !== undefined ? value : defaultValue;
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
        setHasValue(true);
      } else if (internalRef.current?.value) {
        setHasValue(internalRef.current.value.length > 0);
      }
    }, [value, defaultValue]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      onChange?.(e);
    };

    const isFloating = isFocused || hasValue;
    const showLabel = !!label;

    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            id={finalId}
            type={type}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "floating-input",
              "flex h-10 w-full text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "rounded-xl text-sm ring-offset-background focus:outline-none md:focus-visible:outline-2 md:focus-visible:outline-brand-main md:focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
              // Padding adjustment when label is floating
              showLabel && isFloating && "pt-2 pb-1 px-3",
              showLabel && !isFloating && "pt-0 pb-0 px-3 py-2",
              !showLabel && "pt-2 pb-2 px-3",
              // Default variant
              variant === 'default' && [
                "bg-input dark:bg-input-dark",
                "border border-input-border dark:border-input-border-dark",
                isFocused && "!border-blue-brand-main dark:!border-brand-dark !outline-none",
                "hover:bg-input-hover dark:hover:bg-input-hover-dark",
                "focus:bg-input-hover/70 dark:focus:bg-input-hover-dark/70",
                "text-text dark:text-text-dark",
                "dark:md:focus-visible:ring-offset-background-dark",
              ],
              // Header variant
              variant === 'header' && [
                "bg-input dark:bg-input-dark",
                "hover:bg-input-hover dark:hover:bg-input-hover-dark",
                "text-text dark:text-text-dark",
                "dark:md:focus-visible:ring-offset-background-dark",
                "!rounded-full !border-none",
              ],
              // Outline variant
              variant === 'outline' && [
                "bg-transparent dark:bg-black/5 hover:bg-black/[2.5%] dark:hover:bg-white/[2.5%]",
                "border border-gray-300 dark:border-gray-600",
                isFocused && "!border-brand-main dark:!border-brand-dark",
                "text-text dark:text-text-dark",
                "dark:focus-visible:ring-offset-background-dark",
              ],
              // Add specific styling for webkit autofill
              "[&:-webkit-autofill]:bg-primary",
              "[&:-webkit-autofill]:hover:bg-primary",
              "[&:-webkit-autofill]:focus:bg-primary",
              "[&:-webkit-autofill]:!text-base-content",
              "[&:-webkit-autofill]:[transition-delay:9999s]",
              error && "!border-red-border dark:!border-red-border-dark",
              className
            )}
            ref={internalRef}
            required={required}
            placeholder={!showLabel ? props.placeholder : ''}
            {...props}
          />
          
          {showLabel && (
            <label
              htmlFor={finalId}
              className={cn(
                "absolute pointer-events-none transition-all duration-200 ease-in-out",
                "text-text-secondary dark:text-text-secondary-dark  ",
                isFocused && "text-brand-main dark:text-brand-dark",
                isFloating
                  ? `-top-2 ${isRTL ? 'right-1.5' : 'left-1.5'} text-xs font-medium scale-100 bg-gradient-to-t from-input to-background dark:from-input-dark dark:to-[#1d1d1f] px-1`
                  : `top-1/2 ${isRTL ? 'right-3' : 'left-3'} -translate-y-1/2 text-sm scale-100 bg-transparent`,
                error && "text-red dark:text-red-dark"
              )}
            >
              {label}
              {required && <span className="text-red dark:text-red-dark ms-1">*</span>}
            </label>
          )}
        </div>
      </div>
    )
  }
)

FloatingInput.displayName = "FloatingInput"

export { FloatingInput }

