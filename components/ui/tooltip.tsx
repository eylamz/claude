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
        delayDuration={isTouch ? 0 : 300}
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
  "z-50 overflow-hidden rounded-lg border text-xs px-3 py-1.5 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-tooltip dark:bg-tooltip-dark text-text-dark dark:text-white border-border dark:border-border-dark",
        red: "border-[#ffc5c5] dark:border-[#f3394c3b] bg-[#ffe6e6] dark:bg-[#311c1c] text-red-700 dark:text-red-300",
        blue: "border-info-border dark:border-info-border-dark bg-info-bg dark:bg-info-bg-dark text-blue-700 dark:text-blue-300",
        green: "border-[#baf0bb] dark:border-[#235725] bg-[#e3f6e4] dark:bg-[#0f2f10] text-green-700 dark:text-green-300",
        purple: "border-[#b99ef867] dark:border-[#5f4cc54d] bg-[#e7defc] dark:bg-[#472881] text-purple-700 dark:text-purple-300",
        orange: "border-[#ffe0bb] dark:border-[#f39d393b] bg-[#fff1e0] dark:bg-[#31271c] text-orange-700 dark:text-orange-300",
        yellow: "bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
        teal: "bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300",
        pink: "bg-pink-50 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300",
      },
      soon: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        soon: true,
        className: "border-purple-border dark:border-purple-border-dark bg-purple-bg dark:bg-purple-bg-dark text-purple dark:text-purple-dark",
      },
    ],
    defaultVariants: {
      variant: 'default',
      soon: false,
    },
  }
);

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  soon?: boolean;
  variant?: TooltipVariant;
}

const TooltipContent = React.forwardRef<

  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps

>(({ className, sideOffset = 8, side, soon, variant = 'default', ...props }, ref) => {
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
          tooltipVariants({ variant, soon }),
          openAnimation,
          closeAnimation,
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
})

TooltipContent.displayName = TooltipPrimitive.Content.displayName



export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
