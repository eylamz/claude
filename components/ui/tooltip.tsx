'use client';

import * as React from "react"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"



import { cn } from "@/lib/utils"
import { useIsTouch } from "@/hooks/use-is-touch"
import { useLocale } from "next-intl"
import { cva } from "class-variance-authority"

export type TooltipVariant = 
  | 'default'
  | 'red'
  | 'blue'
  | 'gray'
  | 'green'
  | 'purple'
  | 'orange'
  | 'yellow'
  | 'teal'
  | 'pink';



const TooltipProvider = TooltipPrimitive.Provider

// Context to share tooltip state between Tooltip and TooltipTrigger
const TooltipContext = React.createContext<{
  isTouch: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

const Tooltip = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) => {
  const isTouch = useIsTouch();
  const [open, setOpen] = React.useState(false);

  // On mobile (touch), use controlled mode with click
  // On desktop, use default hover behavior
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  // Radix UI automatically handles closing on outside click when using controlled mode
  // No additional handler needed

  return (
    <TooltipContext.Provider value={{ isTouch, open, setOpen }}>
      <TooltipPrimitive.Root
        {...props}
        open={isTouch ? open : undefined}
        onOpenChange={isTouch ? handleOpenChange : undefined}
        delayDuration={isTouch ? 0 : 50}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  );
};

Tooltip.displayName = TooltipPrimitive.Root.displayName;

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ children, onClick, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  const isTouch = context?.isTouch ?? false;
  const setOpen = context?.setOpen;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTouch && setOpen) {
      // On mobile, toggle tooltip on click
      const currentOpen = context?.open ?? false;
      setOpen(!currentOpen);
    }
    // Always call the original onClick handler
    onClick?.(e);
  };

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      {...props}
      onClick={handleClick}
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
});

TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;



// Variant styles for tooltip that match segmented control variants
const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-lg border text-xs px-3 py-1.5 whitespace-nowrap font-semibold",
  {
    variants: {
      variant: {
        default: "bg-tooltip dark:bg-tooltip-dark text-text-dark dark:text-white border-gray-border dark:border-gray-border-dark",
        gray: "border-gray-border dark:border-gray-border-dark bg-gray-bg dark:bg-gray-bg-dark text-gray dark:text-gray-dark",
        red: "border-red-border dark:border-red-border-dark bg-red-bg dark:bg-red-bg-dark text-red dark:text-red-dark",
        blue: "border-blue-border dark:border-blue-border-dark bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark",
        green: "border-green-border dark:border-green-border-dark bg-green-bg dark:bg-green-bg-dark text-green dark:text-green-dark",
        purple: "border-purple-border dark:border-purple-border-dark bg-purple-bg dark:bg-purple-bg-dark text-purple dark:text-purple-dark",
        orange: "border-orange-border dark:border-orange-border-dark bg-orange-bg dark:bg-orange-bg-dark text-orange dark:text-orange-dark",
        yellow: "bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow dark:text-yellow-dark",
        teal: "bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal dark:text-teal-dark",
        pink: "bg-pink-bg dark:bg-pink-bg-dark border border-pink-border dark:border-pink-border-dark text-pink dark:text-pink-dark",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Variant styles for tooltip arrow
const tooltipArrowVariants = cva(
  "fill-current rounded-sm",
  {
    variants: {
      variant: {
        default: "text-gray-border dark:text-gray-border-dark",
        red: "text-red-border dark:text-red-border-dark",
        blue: "text-blue-border dark:text-blue-border-dark",
        gray: "text-gray-border dark:text-gray-border-dark",
        green: "text-green-border dark:text-green-border-dark",
        purple: "text-purple-border dark:text-purple-border-dark",
        orange: "text-orange-border dark:text-orange-border-dark",
        yellow: "text-yellow-50 dark:text-yellow-900/30",
        teal: "text-teal-50 dark:text-teal-900/30",
        pink: "text-pink-border dark:text-pink-border-dark",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  variant?: TooltipVariant;
}

const TooltipContent = React.forwardRef<

  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps

>(({ className, sideOffset = 6, side, variant = 'default', children, ...props }, ref) => {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';

  // Use popDown animations when side is "bottom", otherwise use popUp
  const openAnimation = side === 'bottom' ? 'animate-popDown' : 'animate-popUp';
  const closeAnimation = side === 'bottom' ? 'data-[state=closed]:animate-popOutDown' : 'data-[state=closed]:animate-popOut';

  return (
    // Ensure it's using Portal
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        side={side}
        dir={dir}
        className={cn(
          tooltipVariants({ variant }),
          openAnimation,
          closeAnimation,
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          className={cn(
            tooltipArrowVariants({ variant }),
            "rounded-sm -mt-[1px]"
          )}
          width={11}
          height={5}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
})

TooltipContent.displayName = TooltipPrimitive.Content.displayName



export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
