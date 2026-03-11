'use client';

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectVariant = "purple" | "red" | "orange" | "green" | "gray" | "blue" | "pink" | "default"| "teal" | "yellow";

const variants: Record<SelectVariant, string> = {
  default: "bg-input dark:bg-input-dark border-border dark:border-border-dark text-text dark:text-text-dark",
  purple: "border-purple-border dark:border-purple-border-dark bg-purple-bg dark:bg-purple-bg-dark text-purple dark:text-purple-dark hover:bg-purple-hover-bg dark:hover:bg-purple-hover-bg-dark",
  red: "border-red-border dark:border-red-border-dark bg-red-bg dark:bg-red-bg-dark text-red dark:text-red-dark hover:bg-red-hover-bg dark:hover:bg-red-hover-bg-dark",
  orange: "border-orange-border dark:border-orange-border-dark bg-orange-bg dark:bg-orange-bg-dark text-orange dark:text-orange-dark hover:bg-orange-hover-bg dark:hover:bg-orange-hover-bg-dark",
  green: "border-green-border dark:border-green-border-dark bg-green-bg dark:bg-green-bg-dark text-green dark:text-green-dark hover:bg-green-hover-bg dark:hover:bg-green-hover-bg-dark",
  gray: "border-gray-border dark:border-gray-border-dark bg-gray-bg dark:bg-gray-bg-dark text-gray dark:text-gray-dark hover:bg-gray-hover-bg dark:hover:bg-gray-hover-bg-dark",
  blue: "border-blue-border dark:border-blue-border-dark bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark hover:bg-blue-hover-bg dark:hover:bg-blue-hover-bg-dark",
  pink: "border-pink-border dark:border-pink-border-dark bg-pink-bg dark:bg-pink-bg-dark text-pink dark:text-pink-dark hover:bg-pink-hover-bg dark:hover:bg-pink-hover-bg-dark",
  yellow: "border-yellow-border dark:border-yellow-border-dark bg-yellow-bg dark:bg-yellow-bg-dark text-yellow dark:text-yellow-dark hover:bg-yellow-hover-bg dark:hover:bg-yellow-hover-bg-dark",
  teal: "border-teal-border dark:border-teal-border-dark bg-teal-bg dark:bg-teal-bg-dark text-teal dark:text-teal-dark hover:bg-teal-hover-bg dark:hover:bg-teal-hover-bg-dark",
};

const SelectContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  variant: SelectVariant;
  displayLabel: React.ReactNode;
  setDisplayLabel: (label: React.ReactNode) => void;
} | null>(null);

const Select = ({ 
  children, 
  value, 
  onValueChange,
  variant = "default",
  className 
}: { 
  children: React.ReactNode; 
  value?: string; 
  onValueChange?: (val: string) => void;
  variant?: SelectVariant;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const [displayLabel, setDisplayLabel] = React.useState<React.ReactNode>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ open, setOpen, value: value || "", onValueChange: onValueChange || (() => {}), variant, displayLabel, setDisplayLabel }}>
      <div className={cn("relative w-fit", className)} ref={containerRef}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  const hasValue = context?.value !== "" && context?.value !== undefined;
  
  // Apply variant only if a value is selected and variant isn't default
  const activeVariantClass = (hasValue && context?.variant && context.variant !== "default") 
    ? variants[context.variant] 
    : variants.default;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => context?.setOpen(!context.open)}
      className={cn(
        "flex h-10 gap-1 w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-200 border",
        "focus:outline-none select-none",
        activeVariantClass,
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", context?.open && "rotate-180")} />
    </button>
  );
});

const SelectValue = ({ placeholder, children }: { placeholder?: React.ReactNode; children?: React.ReactNode }) => {
  const context = React.useContext(SelectContext);
  const content = context?.displayLabel ?? children ?? placeholder;
  return content ? <span className="truncate">{content}</span> : null;
};

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context?.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 min-w-fit w-full overflow-hidden rounded-lg border border-popover-border dark:border-popover-border-dark bg-popover dark:bg-popover-dark shadow-xl animate-in fade-in zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="miin-w-fit p-1 flex flex-col gap-1">{children}</div>
    </div>
  );
});

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  const isSelected = context?.value === value;
  const variant = context?.variant || "default";

  // Item styling uses bg/text colors from variant when selected, but no border
  const selectedClasses = isSelected 
    ? variant === "default" 
      ? "bg-brand-main/10 text-brand-main" 
      : variants[variant].replace(/border-[^\s]+/g, "") // Strip border classes for items
    : "text-text dark:text-text-dark hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark";

  return (
    <div
      ref={ref}
      onClick={() => {
        context?.onValueChange(value);
        context?.setOpen(false);
      }}
      className={cn(
        "relative flex min-w-fit w-full cursor-pointer select-none items-center rounded-lg py-0.5 px-3 text-sm transition-colors",
        selectedClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

interface SelectWrapperProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options: Array<{ value: string; label: string }>;
  variant?: SelectVariant;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

const SelectWrapper = React.forwardRef<HTMLButtonElement, SelectWrapperProps>(
  ({ value, onChange, options, variant = "default", label, error, className, disabled }, ref) => {
    const currentLabel = options.find(opt => opt.value === value)?.label || options.find(o => o.value === '')?.label || "Select...";

    return (
      <div className={cn("relative w-fit", className)}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">
            {label}
          </label>
        )}
        <Select value={value} onValueChange={(val) => onChange({ target: { value: val } })} variant={variant}>
          <SelectTrigger ref={ref} className={cn(error && "border-red-500")} disabled={disabled}>
             <span className="truncate">{currentLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

export {
  Select,
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectWrapper,
};