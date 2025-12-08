import * as React from "react"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"



import { cn } from "@/lib/utils"
import { useIsTouch } from "@/hooks/use-is-touch"
import { useLocale } from "next-intl"



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



const TooltipContent = React.forwardRef<

  React.ElementRef<typeof TooltipPrimitive.Content>,

  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>

>(({ className, sideOffset = 8, ...props }, ref) => {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    // Ensure it's using Portal
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        dir={dir}
        className={cn(
          "z-50 overflow-hidden rounded-lg bg-tooltip dark:bg-tooltip-dark text-text-dark dark:text-white text-xs px-3 py-1.5 whitespace-nowrap animate-popUp data-[state=closed]:animate-popOut",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
})

TooltipContent.displayName = TooltipPrimitive.Content.displayName



export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
