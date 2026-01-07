'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

export type SegmentedControlVariant = 
  | 'default'
  | 'red'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'yellow'
  | 'teal'
  | 'pink';

export interface SegmentedControlOption {
  value: string;
  icon?: React.ReactNode;
  label?: string;
  variant?: SegmentedControlVariant;
  tooltip?: string;
}

// Variant styles for the sliding background indicator
// Note: transform transition is handled separately, colors transition with delay
const indicatorVariants = cva(
  'absolute top-1 bottom-1 left-1 rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.04)] pointer-events-none z-0 border border-transparent',
  {
    variants: {
      variant: {
        default: 'border-[#e6e6e6] dark:border-[#494949] bg-black/[2.5%] hover:bg-black/5',
        red: 'border-[#ffc5c5] dark:border-[#f3394c3b] bg-[#ffe6e6] dark:bg-[#311c1c]',
        blue: 'border-info-border dark:border-info-border-dark bg-info-bg dark:bg-info-bg-dark',
        green: 'border-[#baf0bb] dark:border-[#235725] bg-[#e3f6e4] dark:bg-[#0f2f10]',
        purple: 'border-[#b99ef867] dark:border-[#5f4cc54d] bg-[#e7defc] dark:bg-[#472881]',
        orange: 'border-[#ffe0bb] dark:border-[#f39d393b] bg-[#fff1e0] dark:bg-[#31271c]',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800',
        teal: 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800',
        pink: 'bg-pink-50 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Variant styles for text/icon colors
const textVariants = cva('transition-colors duration-150 delay-150', {
  variants: {
    variant: {
      default: '',
      red: '',
      blue: '',
      green: '',
      purple: '',
      orange: '',
      yellow: '',
      teal: '',
      pink: '',
    },
    isSelected: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    // Selected states with variants
    {
      variant: 'default',
      isSelected: true,
      className: 'text-gray dark:text-gray-dark',
    },
    {
      variant: 'default',
      isSelected: false,
      className: 'text-text-secondary dark:text-text-secondary-dark',
    },
    {
      variant: 'red',
      isSelected: true,
      className: 'text-red dark:text-red-dark',
    },
    {
      variant: 'red',
      isSelected: false,
      className: 'text-text-secondary dark:text-text-secondary-dark',
    },
    {
      variant: 'blue',
      isSelected: true,
      className: 'text-blue dark:text-blue-dark',
    },
    {
      variant: 'blue',
      isSelected: false,
      className: 'text-text-secondary dark:text-text-secondary-dark',
    },
    {
      variant: 'green',
      isSelected: true,
      className: 'text-green dark:text-green-dark',
    },
    {
      variant: 'green',
      isSelected: false,
      className: 'text-text-secondary dark:text-text-secondary-dark',
    },
    {
      variant: 'purple',
      isSelected: true,
      className: 'text-purple dark:text-purple-dark',
    },
    {
      variant: 'purple',
      isSelected: false,
      className: 'text-text-secondary dark:text-text-secondary-dark',
    },
    {
      variant: 'orange',
      isSelected: true,
      className: 'text-orange dark:text-orange-dark',
    },
    {
      variant: 'orange',
      isSelected: false,
      className: 'text-text-secondary dark:text-text-secondary-dark',
    },
    {
      variant: 'yellow',
      isSelected: true,
      className: 'text-yellow-700 dark:text-yellow-300',
    },
    {
      variant: 'yellow',
      isSelected: false,
      className: 'text-[#424242] dark:text-[#afafaf]',
    },
    {
      variant: 'teal',
      isSelected: true,
      className: 'text-teal-700 dark:text-teal-300',
    },
    {
      variant: 'teal',
      isSelected: false,
      className: 'text-[#424242] dark:text-[#afafaf]',
    },
    {
      variant: 'pink',
      isSelected: true,
      className: 'text-pink-700 dark:text-pink-300',
    },
    {
      variant: 'pink',
      isSelected: false,
      className: 'text-[#424242] dark:text-[#afafaf]',
    },
  ],
});

export interface SegmentedControlsProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SegmentedControls = React.forwardRef<HTMLDivElement, SegmentedControlsProps>(
  ({ 
    options, 
    value, 
    defaultValue, 
    onValueChange, 
    name = 'segmentedControls',
    className,
    size = 'md',
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || options[0]?.value || '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const selectedIndex = options.findIndex(opt => opt.value === currentValue);
    const actualIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const selectedOption = options[actualIndex];
    
    // Track the variant that should be displayed (delayed to sync with sliding animation)
    const [displayVariant, setDisplayVariant] = React.useState<SegmentedControlVariant>(
      selectedOption?.variant || 'default'
    );
    
    // Update display variant to sync with sliding animation
    React.useEffect(() => {
      const newVariant = selectedOption?.variant || 'default';
      if (displayVariant !== newVariant) {
        // Start color transition partway through the slide (150ms delay for faster transition)
        // This makes colors start changing as the indicator is moving
        const timer = setTimeout(() => {
          setDisplayVariant(newVariant);
        }, 150);
        return () => clearTimeout(timer);
      }
    }, [selectedOption?.variant, displayVariant]);

    const handleChange = React.useCallback((newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [isControlled, onValueChange]);

    const sizeClasses = {
      sm: 'h-10',
      md: 'h-10',
      lg: 'h-14',
    };

    const iconSizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-6 h-6',
    };

    // 1. Calculate the percentage width of one segment
    const optionWidthPercent = 100 / options.length;

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex w-full rounded-xl',
          'border border-input-border dark:border-input-border-dark',
          'bg-input dark:bg-input-dark',
          'p-0.5 overflow-hidden', // This is 2px padding (0.125rem)
          'transition-all duration-300 ease-in-out',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {/* Sliding Background - transform slides immediately, colors transition smoothly */}
        <div
          className={cn(
            indicatorVariants({ variant: displayVariant })
          )}
          style={{
            // 2. Width is the segment percentage minus the container's total horizontal padding (2px + 2px = 4px) 
            // divided by the number of segments to keep it proportional.
            width: `calc(${optionWidthPercent}% - 1rem / ${options.length})`,
            // 3. Translate uses the index * 100% of the segment width minus 1rem per index.
            // Since the slider is positioned 'absolute' relative to the padded container,
            // 100% translation moves it exactly one segment over, minus the rem offset.
            transform: `translateX(calc(${actualIndex * 100}% + ${actualIndex}* 0.3rem))`,
            // Transform transitions immediately (300ms)
            // Colors transition faster (150ms) with shorter delay (150ms)
            transition: 'transform 200ms ease-in-out, background-color 150ms ease-in-out 150ms, border-color 150ms ease-in-out 150ms',
          }}
        />

        {options.map((option, index) => {
          const isSelected = option.value === currentValue;
          const inputId = `${name}-${option.value}-${index}`;
          const optionVariant = option.variant || 'default';
          
          const labelContent = (
            <>
              {option.icon && (
                <span
                  className={cn(iconSizeClasses[size], 'flex items-center justify-center')}
                  style={{
                    transition: 'color 200ms ease-in-out, fill 200ms ease-in-out',
                  }}
                >
                  {option.icon}
                </span>
              )}
              {option.label && (
                <span className={cn(
                  'font-semibold text-sm',
                  option.icon && 'ms-2'
                )}>
                  {option.label}
                </span>
              )}
            </>
          );
          
          return (
            <React.Fragment key={`${option.value}-${index}`}>
              <input
                type="radio"
                id={inputId}
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => handleChange(option.value)}
                className="sr-only"
              />
              {option.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label
                      htmlFor={inputId}
                      className={cn(
                        'relative px-3 flex-1 flex items-center justify-center',
                        'cursor-pointer select-none transition-all duration-200',
                        'z-[2]',
                        textVariants({ variant: optionVariant, isSelected })
                      )}
                      style={{
                        transition: 'color 300ms ease-in-out 250ms',
                      }}
                    >
                      {labelContent}
                    </label>
                  </TooltipTrigger>
                  <TooltipContent side="top" variant={optionVariant}>
                    {option.tooltip}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <label
                  htmlFor={inputId}
                  className={cn(
                    'relative px-3 flex-1 flex items-center justify-center',
                    'cursor-pointer select-none transition-all duration-200',
                    'z-[2]',
                    textVariants({ variant: optionVariant, isSelected })
                  )}
                  style={{
                    transition: 'color 300ms ease-in-out 250ms',
                  }}
                >
                  {labelContent}
                </label>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

SegmentedControls.displayName = 'SegmentedControls';

export { SegmentedControls };