'use client';

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 4, side = "bottom", ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const combinedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      contentRef.current = node;
    },
    [ref]
  );

  // Prevent body scroll when content is rendered (for uncontrolled mode)
  React.useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    // Check if popover is open by observing data-state attribute
    const observer = new MutationObserver(() => {
      const isOpen = element.getAttribute('data-state') === 'open';
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Initial check
    const isOpen = element.getAttribute('data-state') === 'open';
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    // Observe changes to data-state
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['data-state'],
    });

    return () => {
      observer.disconnect();
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={combinedRef}
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
