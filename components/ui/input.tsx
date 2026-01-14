import * as React from "react"

import { cn } from "@/lib/utils"



export interface InputProps

  extends React.InputHTMLAttributes<HTMLInputElement> {

  error?: string;

  variant?: 'default' | 'header' | 'outline';

  label?: string;

}



const Input = React.forwardRef<HTMLInputElement, InputProps>(

  ({ className, error, type, variant = 'default', label, id, required, ...props }, ref) => {

    const inputId = React.useId();

    const finalId = id || inputId;

    return (

      <div className="relative w-full">

        {label && (

          <label

            htmlFor={finalId}

            className="block text-sm font-medium text-gray dark:text-gray-dark mb-1.5"

          >

            {label}

            {required && <span className="text-red dark:text-red-dark ms-1">*</span>}

          </label>

        )}

        <input

          id={finalId}

          type={type}

          className={cn(

            "flex h-10 w-full text-sm ring-offset-background",

            "file:border-0 file:bg-transparent file:text-sm file:font-medium",

            "placeholder:text-muted-foreground",

            "rounded-xl px-3 py-2 text-sm ring-offset-background focus:outline-none md:focus-visible:outline-2 md:focus-visible:outline-brand-main md:focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",

            // Default variant

            variant === 'default' && [

              "bg-input dark:bg-input-dark",

              "border border-input-border dark:border-input-border-dark md:focus-visible:border-brand-main dark:md:focus-visible:border-brand-main",

              "hover:bg-input-hover dark:hover:bg-input-hover-dark",

              "focus:bg-input-hover/70 dark:focus:bg-input-hover-dark/70",

              "placeholder:text-text-secondary dark:placeholder:text-text-secondary-dark",

              "text-text dark:text-text-dark",

              "dark:md:focus-visible:ring-offset-background-dark",

            ],

            // Header variant

            variant === 'header' && [

              "bg-input dark:bg-input-dark",

              "hover:bg-input-hover dark:hover:bg-input-hover-dark",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:md:focus-visible:ring-offset-background-dark",

              "!rounded-full !border-none",

            ],

            // Outline variant

            variant === 'outline' && [

              "bg-transparent dark:bg-black/5 hover:bg-black/[2.5%] dark:hover:bg-white/[2.5%]",

              "border border-gray-300 dark:border-gray-600 md:focus-visible:border-brand-main dark:md:focus-visible:border-brand-main",

              "placeholder:text-input-text dark:placeholder:text-input-text-dark",

              "text-text dark:text-text-dark",

              "dark:focus-visible:ring-offset-background-dark",

            ],

            // Add specific styling for webkit autofill

            "[&:-webkit-autofill]:bg-primary",

            "[&:-webkit-autofill]:hover:bg-primary",

            "[&:-webkit-autofill]:focus:bg-primary",

            // Ensure text remains visible during autofill

            "[&:-webkit-autofill]:!text-base-content",

            // Override the internal autofill background

            "[&:-webkit-autofill]:[transition-delay:9999s]",

            error && "border-red-500",

            className

          )}

          ref={ref}

          required={required}

          {...props}

        />

        {error && (

          <p className="text-xs text-red-500 mt-1 animate-horizontalShaking">{error}</p>

        )}

      </div>

    )

  }

)

Input.displayName = "Input"



export { Input }
