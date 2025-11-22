import * as React from "react"

import { cn } from "@/lib/utils"



export interface NumberInputProps

  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {

  error?: string;

  variant?: 'default' | 'header' | 'outline';

  showSpinner?: boolean;

}



const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(

  ({ className, error, variant = 'default', showSpinner = true, ...props }, ref) => {

    return (

      <div className="relative">

        <input

          type="number"

          className={cn(

            "flex h-10 w-full text-sm ring-offset-background",

            "file:border-0 file:bg-transparent file:text-sm file:font-medium",

            "placeholder:text-muted-foreground",

            "rounded-xl px-3 py-2 text-sm ring-offset-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",

            // Default variant

            variant === 'default' && [

              "bg-input dark:bg-input-dark",

              "hover:bg-input-hover dark:hover:bg-input-hover-dark",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus:ring-offset-background-dark",

            ],

            // Header variant

            variant === 'header' && [

              "bg-input dark:bg-input-dark",

              "hover:bg-input-hover dark:hover:bg-input-hover-dark",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus:ring-offset-background-dark",

              "!rounded-full !border-none",

            ],

            // Outline variant

            variant === 'outline' && [

              "bg-transparent dark:bg-black/5 hover:bg-black/[2.5%] dark:hover:bg-white/[2.5%]",

              "border border-gray-300 dark:border-gray-600",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus:ring-offset-background-dark",

            ],

            // Add specific styling for webkit autofill

            "[&:-webkit-autofill]:bg-primary",

            "[&:-webkit-autofill]:hover:bg-primary",

            "[&:-webkit-autofill]:focus:bg-primary",

            // Ensure text remains visible during autofill

            "[&:-webkit-autofill]:!text-base-content",

            // Override the internal autofill background

            "[&:-webkit-autofill]:[transition-delay:9999s]",

            // Remove spinner arrows for webkit browsers (only if showSpinner is false)

            !showSpinner && "[&::-webkit-outer-spin-button]:appearance-none",

            !showSpinner && "[&::-webkit-inner-spin-button]:appearance-none",

            error && "border-red-500",

            className

          )}

          ref={ref}

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





