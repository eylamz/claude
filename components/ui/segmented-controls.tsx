'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons';

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: string; // Icon name from Icon component
}

export interface SegmentedControlsProps {
  options: SegmentedControlOption[];
  value: string | string[]; // Single value or array for multi-select
  onChange: (value: string | string[]) => void;
  multiple?: boolean; // Allow multiple selections
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function SegmentedControls({
  options,
  value,
  onChange,
  multiple = false,
  className,
  size = 'md',
  variant = 'default',
}: SegmentedControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Find the selected index
  useEffect(() => {
    if (multiple) {
      // For multi-select, find first selected or default to 0
      const firstSelected = options.findIndex((opt) =>
        Array.isArray(value) && value.includes(opt.value)
      );
      setSelectedIndex(firstSelected >= 0 ? firstSelected : 0);
    } else {
      const index = options.findIndex((opt) => opt.value === value);
      setSelectedIndex(index >= 0 ? index : 0);
    }
  }, [value, options, multiple]);

  // Update indicator position and handle resize
  useEffect(() => {
    if (!containerRef.current || !indicatorRef.current || options.length === 0) return;

    const updateIndicator = () => {
      const container = containerRef.current;
      const indicator = indicatorRef.current;
      if (!container || !indicator) return;

      const containerWidth = container.offsetWidth;
      const padding = 2; // p-0.5 = 2px
      const availableWidth = containerWidth - padding * 2;
      const itemWidth = availableWidth / options.length;
      const translateX = selectedIndex * itemWidth + padding;

      indicator.style.transform = `translateX(${translateX}px)`;
      indicator.style.width = `${itemWidth}px`;
    };

    updateIndicator();

    // Handle window resize
    const resizeObserver = new ResizeObserver(updateIndicator);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedIndex, options.length]);

  const isSelected = (optionValue: string): boolean => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleClick = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(optionValue)) {
        // Deselect
        onChange(currentValues.filter((v) => v !== optionValue));
      } else {
        // Select
        onChange([...currentValues, optionValue]);
      }
    } else {
      onChange(optionValue);
    }
  };

  const sizeClasses = {
    sm: {
      container: 'h-10',
      text: 'text-sm',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      container: 'h-12',
      text: 'text-[15px]',
      icon: 'w-4 h-4',
    },
    lg: {
      container: 'h-14',
      text: 'text-base',
      icon: 'w-5 h-5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex w-full rounded-xl border border-[#F0F1F2] dark:border-gray-700',
        'bg-[#F5F6F7] dark:bg-gray-800/50 p-0.5 overflow-hidden',
        'transition-all duration-300 ease-in-out',
        currentSize.container,
        className
      )}
    >
      {/* Sliding background indicator */}
      <div
        ref={indicatorRef}
        className={cn(
          'absolute top-0.5 bottom-0.5 rounded-[10px]',
          'bg-white dark:bg-gray-700',
          'shadow-[0px_1px_2px_0px_rgba(0,0,0,0.04)]',
          'transition-all duration-300 ease-in-out',
          'z-0'
        )}
      />

      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={cn(
              'relative flex-1 flex items-center justify-center gap-1.5',
              'font-semibold transition-colors duration-300 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-main focus:ring-offset-transparent',
              'tap-highlight-color:transparent',
              '-webkit-tap-highlight-color:transparent',
              currentSize.text,
              selected
                ? 'text-[#09090B] dark:text-white z-10'
                : 'text-[#71737F] dark:text-gray-400 z-20',
              'cursor-pointer select-none'
            )}
            aria-pressed={selected}
          >
            {option.icon && (
              <Icon
                name={option.icon as any}
                className={cn(
                  currentSize.icon,
                  selected
                    ? 'text-[#09090B] dark:text-white'
                    : 'text-[#71737F] dark:text-gray-400'
                )}
              />
            )}
            <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

