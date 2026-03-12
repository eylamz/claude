import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  precision?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, error, precision, min = 1, max = Infinity, step = 1, value, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    React.useImperativeHandle(ref, () => inputRef.current!);

    const [internalValue, setInternalValue] = React.useState<number>(
      value !== undefined ? Number(value) : Number(min)
    );

    const minValue = Number(min);
    const maxValue = Number(max);
    const stepValue = Number(step);

    const updateValue = (newValue: number) => {
      const adjustedValue =
        typeof precision === 'number'
          ? Number(newValue.toFixed(precision))
          : newValue;
      const clampedValue = Math.max(minValue, Math.min(adjustedValue, maxValue));
      setInternalValue(clampedValue);

      if (onChange) {
        const event = {
          target: { ...inputRef.current, value: String(clampedValue), name: props.name },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    const handleIncrement = () => updateValue(internalValue + stepValue);
    const handleDecrement = () => updateValue(internalValue - stepValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        updateValue(val);
      }
    };

    const isDecrementDisabled = internalValue <= minValue;
    const isIncrementDisabled = internalValue >= maxValue;

    return (
      <div className="flex flex-col gap-1" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>
        <div 
          className={cn(
            "border relative inline-flex items-center overflow-hidden rounded-[6px] transition-colors duration-200 w-fit",
            // Light Mode Styles
            "bg-input border-gray-border",
            // Dark Mode Styles
            "dark:bg-input-dark dark:border-gray-border-dark",
            error && "ring-1 ring-red-500",
            className
          )}
        >
          {/* Decrement Button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={isDecrementDisabled}
            className={cn(
              "w-10 h-10 flex items-center justify-center text-[18px] cursor-pointer select-none transition-all duration-200 ease-in-out border-none bg-transparent active:opacity-70",
              // Logic for colors/disabled state
              isDecrementDisabled 
                ? "text-[#747474]/50 dark:text-neutral-600 cursor-not-allowed" 
                : "text-[#747474] dark:text-neutral-300 hover:bg-gray-hover-bg dark:hover:bg-gray-hover-bg-dark"
            )}
          >
            &minus;
          </button>

          {/* Input Field */}
          <input
            type="number"
            ref={inputRef}
            value={internalValue}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            className={cn(
              "border-x border-gray-border dark:border-gray-border-dark",
              "max-w-[50px] w-10 h-6 !text-center text-base font-bold focus:outline-none focus:ring-0 appearance-none m-0 p-0 bg-transparent",
              "text-[#747474] dark:text-text-dark",
              "[moz-appearance:_textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
            {...props}
          />

          {/* Increment Button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={isIncrementDisabled}
            className={cn(
              "w-10 h-10 flex items-center justify-center text-base cursor-pointer select-none transition-all duration-200 ease-in-out border-none bg-transparent active:opacity-70",
              isIncrementDisabled 
                ? "text-[#747474]/50 dark:text-neutral-600 cursor-not-allowed" 
                : "text-[#747474] dark:text-neutral-300 hover:bg-gray-hover-bg dark:hover:bg-gray-hover-bg-dark"
            )}
          >
            +
          </button>
        </div>
        
        {error && (
          <span className="text-xs text-red-500 ml-1 font-semibold">{error}</span>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

export { NumberInput };