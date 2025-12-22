import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectRoot = SelectPrimitive.Root;
const Select = SelectPrimitive.Root; // Keep for backward compatibility

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-sm ring-offset-background",
      "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 select-none transition-colors duration-200",
      "bg-input dark:bg-input-dark",
      "border border-input-border dark:border-input-border-dark focus:border-opacity-40",
      "hover:bg-input-hover dark:hover:bg-input-hover-dark",
      "focus:bg-input-hover/70 dark:focus:bg-input-hover-dark/70",
      "text-text dark:text-text-dark",
      "placeholder:text-input-text dark:placeholder:text-input-text-dark",
      "dark:focus:ring-offset-background-dark",
      "rtl:flex-row-reverse",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 px-[1px] overflow-hidden rounded-lg border border-popover-border dark:border-popover-border-dark bg-popover dark:bg-popover-dark shadow-xl text-text dark:text-text-dark data-[state=open]:animate-fadeInDown data-[state=closed]:animate-fadeOut data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          " data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "font-thin relative flex rtl:flex-row-reverse cursor-pointer mb-[2px] w-full select-none items-center rounded-lg py-1.5 px-3 text-sm outline-none transition-colors",
      // Selected state styling
      "data-[state=checked]:bg-brand-main/10 data-[state=checked]:text-brand-main dark:data-[state=checked]:text-brand-main data-[state=checked]:font-normal dark:data-[state=checked]:bg-brand-main/10",
      // Focus styling
      "focus:bg-sidebar-hover focus:text-text focus:dark:text-text-dark dark:focus:bg-sidebar-hover-dark focus:outline-none",

      // Disabled styling
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

// Wrapper component for easier usage with options and onChange
interface SelectWrapperProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options: Array<{ value: string; label: string }>;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

const SelectWrapper = React.forwardRef<HTMLButtonElement, SelectWrapperProps>(
  ({ value, onChange, options, label, error, className, disabled, ...props }, ref) => {
    const selectId = React.useId();
    const finalId = props.id || selectId;

    // Filter out options with empty string values (Radix UI doesn't allow them)
    const validOptions = options.filter(option => option.value !== '');
    const emptyOption = options.find(option => option.value === '');
    
    // Use undefined for empty string values to show placeholder
    const selectValue = value === '' ? undefined : value;

    return (
      <div className={cn("relative w-full", className)}>
        {label && (
          <label
            htmlFor={finalId}
            className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5"
          >
            {label}
          </label>
        )}
        <SelectRoot
          value={selectValue}
          onValueChange={(newValue) => onChange({ target: { value: newValue || '' } })}
          disabled={disabled}
        >
          <SelectTrigger
            ref={ref}
            id={finalId}
            className={cn(error && "border-red-500")}
          >
            <SelectValue placeholder={emptyOption?.label || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {validOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);
SelectWrapper.displayName = "SelectWrapper";

export {
  SelectRoot,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectWrapper,
};
