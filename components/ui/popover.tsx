'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface PopoverTriggerProps {
  asChild?: boolean;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </PopoverContext.Provider>
  );
}

const PopoverContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void } | null>(null);

function usePopoverContext() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within Popover');
  }
  return context;
}

export function PopoverTrigger({ asChild, children, onClick }: PopoverTriggerProps) {
  const { open, onOpenChange } = usePopoverContext();
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    onOpenChange(!open);
  };

  useEffect(() => {
    if (triggerRef.current) {
      (triggerRef.current as any).__popoverTrigger = triggerRef.current;
    }
  }, []);

  if (asChild && React.isValidElement(children)) {
    const childOnClick = (children.props as any)?.onClick;
    const mergedOnClick = (e: React.MouseEvent) => {
      childOnClick?.(e);
      handleClick(e);
    };

    return (
      <div ref={triggerRef} className="inline-block relative" data-popover-trigger>
        {React.cloneElement(children, {
          onClick: mergedOnClick,
          'aria-expanded': open,
        } as any)}
      </div>
    );
  }

  return (
    <div ref={triggerRef} onClick={handleClick} className="inline-block relative" data-popover-trigger>
      {children}
    </div>
  );
}

export function PopoverContent({ children, className = '' }: PopoverContentProps) {
  const { open, onOpenChange } = usePopoverContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-popover-trigger]')) {
          onOpenChange(false);
        }
      }
    };

    if (open) {
      // Small delay to avoid immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`w-fit absolute top-full left-0 mt-3 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[200px] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

