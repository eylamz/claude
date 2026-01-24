import * as React from "react"

import { cn } from "@/lib/utils"

import "./number-input.css"

export interface NumberInputProps

  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {

  error?: string;

  variant?: 'default' | 'header' | 'outline';

  showSpinner?: boolean;

  useCustomButtons?: boolean;

}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(

  ({ className, error, variant = 'default', showSpinner = true, useCustomButtons = false, min, max, step = 1, value, onChange, ...props }, ref) => {

    const inputRef = React.useRef<HTMLInputElement>(null);

    const [internalValue, setInternalValue] = React.useState<number>(typeof value === 'number' ? value : 1);

    const mergedRef = ref || inputRef;

    const minValue = min ? parseFloat(String(min)) : 1;

    const maxValue = max ? parseFloat(String(max)) : Infinity;

    const stepValue = parseFloat(String(step));

    const handleIncrement = () => {

      const newValue = Math.min(internalValue + stepValue, maxValue);

      setInternalValue(newValue);

      if (typeof mergedRef === 'object' && mergedRef?.current) {

        mergedRef.current.value = String(newValue);

      }

      onChange?.({ target: { value: String(newValue) } } as React.ChangeEvent<HTMLInputElement>);

    };

    const handleDecrement = () => {

      const newValue = Math.max(internalValue - stepValue, minValue);

      setInternalValue(newValue);

      if (typeof mergedRef === 'object' && mergedRef?.current) {

        mergedRef.current.value = String(newValue);

      }

      onChange?.({ target: { value: String(newValue) } } as React.ChangeEvent<HTMLInputElement>);

    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

      const newValue = parseFloat(e.target.value) || minValue;

      const clampedValue = Math.max(minValue, Math.min(newValue, maxValue));

      setInternalValue(clampedValue);

      onChange?.(e);

    };

    const isIncrementDisabled = internalValue >= maxValue;

    const isDecrementDisabled = internalValue <= minValue;

    if (useCustomButtons) {

      return (

        <div className="relative">

          <div className="numberstyle-qty">

            <button

              type="button"

              className={cn(

                "qty-btn qty-rem",

                isDecrementDisabled && "disabled"

              )}

              onClick={handleDecrement}

              disabled={isDecrementDisabled}

            >

              −

            </button>

            <input

              type="number"

              className={cn(

                "flex h-10 w-full text-sm ring-offset-background",

                "file:border-0 file:bg-transparent file:text-sm file:font-medium",

                "placeholder:text-muted-foreground",

                "rounded-xl px-3 py-2 text-sm ring-offset-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",

                variant === 'default' && [

                  "bg-input dark:bg-input-dark",

                  "hover:bg-input-hover dark:hover:bg-input-hover-dark",

                  "placeholder:text-input-text dark:placeholder:text-input-text-dark",

                  "text-text dark:text-text-dark",

                  "dark:focus:ring-offset-background-dark",

                ],

                variant === 'header' && [

                  "bg-input dark:bg-input-dark",

                  "hover:bg-input-hover dark:hover:bg-input-hover-dark",

                  "placeholder:text-input-text dark:placeholder:text-input-text-dark",

                  "text-text dark:text-text-dark",

                  "dark:focus:ring-offset-background-dark",

                  "!rounded-full !border-none",

                ],

                variant === 'outline' && [

                  "bg-transparent dark:bg-black/5 hover:bg-black/[2.5%] dark:hover:bg-white/[2.5%]",

                  "border border-gray-300 dark:border-gray-600",

                  "placeholder:text-input-text dark:placeholder:text-input-text-dark",

                  "text-text dark:text-text-dark",

                  "dark:focus:ring-offset-background-dark",

                ],

                "[&:-webkit-autofill]:bg-primary",

                "[&:-webkit-autofill]:hover:bg-primary",

                "[&:-webkit-autofill]:focus:bg-primary",

                "[&:-webkit-autofill]:!text-base-content",

                "[&:-webkit-autofill]:[transition-delay:9999s]",

                !showSpinner && "[&::-webkit-outer-spin-button]:appearance-none",

                !showSpinner && "[&::-webkit-inner-spin-button]:appearance-none",

                error && "border-red-500",

                "numberstyle-input",

                className

              )}

              ref={mergedRef as React.Ref<HTMLInputElement>}

              value={internalValue}

              onChange={handleChange}

              min={min}

              max={max}

              step={step}

              {...props}

            />

            <button

              type="button"

              className={cn(

                "qty-btn qty-add",

                isIncrementDisabled && "disabled"

              )}

              onClick={handleIncrement}

              disabled={isIncrementDisabled}

            >

              +

            </button>

          </div>

          {error && (

            <p className="text-xs text-red-500 mt-1">{error}</p>

          )}

        </div>

      );

    }

    return (

      <div className="relative">

        <input

          type="number"

          className={cn(

            "flex h-10 w-full text-sm ring-offset-background",

            "file:border-0 file:bg-transparent file:text-sm file:font-medium",

            "placeholder:text-muted-foreground",

            "rounded-xl px-3 py-2 text-sm ring-offset-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",

            variant === 'default' && [

              "bg-input dark:bg-input-dark",

              "hover:bg-input-hover dark:hover:bg-input-hover-dark",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus:ring-offset-background-dark",

            ],

            variant === 'header' && [

              "bg-input dark:bg-input-dark",

              "hover:bg-input-hover dark:hover:bg-input-hover-dark",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus:ring-offset-background-dark",

              "!rounded-full !border-none",

            ],

            variant === 'outline' && [

              "bg-transparent dark:bg-black/5 hover:bg-black/[2.5%] dark:hover:bg-white/[2.5%]",

              "border border-gray-300 dark:border-gray-600",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus:ring-offset-background-dark",

            ],

            "[&:-webkit-autofill]:bg-primary",

            "[&:-webkit-autofill]:hover:bg-primary",

            "[&:-webkit-autofill]:focus:bg-primary",

            "[&:-webkit-autofill]:!text-base-content",

            "[&:-webkit-autofill]:[transition-delay:9999s]",

            !showSpinner && "[&::-webkit-outer-spin-button]:appearance-none",

            !showSpinner && "[&::-webkit-inner-spin-button]:appearance-none",

            error && "border-red-500",

            className

          )}

          ref={mergedRef as React.Ref<HTMLInputElement>}

          {...props}

        />

        {error && (

          <p className="text-xs text-red-500 mt-1">{error}</p>

        )}

      </div>

    )

  }

)

NumberInput.displayName = "NumberInput"

export { NumberInput }





