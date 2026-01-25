"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

const switchVariants = cva(
  "relative flex items-center justify-center transition-all duration-200 rounded-full bg-[rgb(82,82,82)]",
  {
    variants: {
      variant: {
        default: "data-[state=checked]:bg-[rgb(82,82,82)] dark:data-[state=checked]:bg-[rgb(82,82,82)]",
        gray: "data-[state=checked]:bg-gray-500 dark:data-[state=checked]:bg-gray-400",
        orange: "data-[state=checked]:bg-orange-500 dark:data-[state=checked]:bg-orange-400",
        green: "data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-400",
        purple: "data-[state=checked]:bg-[rgb(148,118,255)] dark:data-[state=checked]:bg-[rgb(148,118,255)]",
        blue: "data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-400",
        red: "data-[state=checked]:bg-red-500 dark:data-[state=checked]:bg-red-400",
        brand: "data-[state=checked]:bg-brand-main dark:data-[state=checked]:bg-brand-dark",
      },
      size: {
        default: "w-[50px] h-[30px]",
        sm: "w-[40px] h-[24px]",
        lg: "w-[60px] h-[36px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const switchThumbVariants = cva(
  "absolute rounded-full bg-white shadow-[5px_2px_7px_rgba(8,8,8,0.26)] transition-all duration-200",
  {
    variants: {
      size: {
        default: "h-5 w-5",
        sm: "h-4 w-4",
        lg: "h-6 w-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof switchVariants> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, variant, size, checked, onCheckedChange, disabled, ...props }, ref) => {
    const locale = useLocale();
    const isRTL = locale === "he";
    const [isChecked, setIsChecked] = React.useState(checked ?? false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newChecked = e.target.checked;
      setIsChecked(newChecked);
      onCheckedChange?.(newChecked);
    };

    // Calculate thumb position and transform based on checked state and RTL
    // LTR: unchecked = left: 5px, checked = left: 5px + translateX(100%)
    // RTL: unchecked = right: 5px, checked = right: 5px + translateX(-100%)
    const getThumbClasses = () => {
      const baseClasses = switchThumbVariants({ size });
      if (isRTL) {
        // RTL: start on right, move left when checked
        const position = "right-[5px]";
        const transform = isChecked ? "-translate-x-[100%]" : "";
        return cn(baseClasses, position, transform);
      } else {
        // LTR: start on left, move right when checked
        const position = "left-[5px]";
        const transform = isChecked ? "translate-x-[100%]" : "";
        return cn(baseClasses, position, transform);
      }
    };

    return (
      <label className="inline-block">
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            switchVariants({ variant, size }),
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            className
          )}
          data-state={isChecked ? "checked" : "unchecked"}
        >
          <span className={getThumbClasses()} />
        </span>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch, switchVariants };
