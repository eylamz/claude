'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';
import { useLocaleInfo } from '@/hooks/use-translation';

export type SegmentedControlVariant = 'green' | 'blue' | 'red' | 'gray' | 'orange' | 'purple' | 'pink';

export interface SegmentedControlOption {
  value: string;
  icon?: React.ReactNode;
  label?: string;
  tooltip?: string;
  variant?: SegmentedControlVariant;
}

export interface SegmentedControlsProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  className?: string;
}

const SegmentedControls = React.forwardRef<HTMLDivElement, SegmentedControlsProps>(
  ({ 
    options, 
    value, 
    defaultValue, 
    onValueChange, 
    name = 'segmentedControls',
    className,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || options[0]?.value || '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const selectedIndex = options.findIndex(opt => opt.value === currentValue);
    const actualIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const { isRTL } = useLocaleInfo();

    const handleChange = React.useCallback((newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [isControlled, onValueChange]);

    // Calculate transform for the paddle (last label's ::after)
    // The paddle is positioned on the last label and needs to move to the selected option
    // In LTR: paddle moves left (negative) from last position to selected position
    //   - If last option (index 3 of 4) is selected: move 0 positions = 0%
    //   - If 3rd option (index 2 of 4) is selected: move 1 position left = -100%
    //   - If 2nd option (index 1 of 4) is selected: move 2 positions left = -200%
    //   - If 1st option (index 0 of 4) is selected: move 3 positions left = -300%
    // In RTL: paddle moves right (positive) from last position to selected position
    const positionsFromLast = options.length - 1 - actualIndex;
    const paddleTransform = isRTL 
      ? positionsFromLast * 100  // Positive for RTL (moves right)
      : positionsFromLast * -100;  // Negative for LTR (moves left)

    const uniqueId = React.useId();
    const controlsId = `segmented-controls-${uniqueId}`;
    
    // Color mappings for variants (using the same colors as button variants)
    const variantColors: Record<SegmentedControlVariant, { bg: { light: string; dark: string }; border: { light: string; dark: string } }> = {
      green: {
        bg: { light: '#e3f6e4', dark: '#0f2f10' },
        border: { light: '#baf0bb', dark: '#235725' }
      },
      blue: {
        bg: { light: '#deecfc', dark: 'hsl(199,61%,15%)' },
        border: { light: '#b6d9fd', dark: '#195570' }
      },
      red: {
        bg: { light: '#ffe6e6', dark: '#311c1c' },
        border: { light: '#ffc5c5', dark: 'hsl(355, 46%, 25%)' }
      },
      gray: {
        bg: { light: '#efefef', dark: '#262626' },
        border: { light: '#e6e6e6', dark: '#494949' }
      },
      orange: {
        bg: { light: '#fff1e0', dark: 'hsl(32, 89%, 12%)' },
        border: { light: '#ffe0bb', dark: 'hsl(32, 89%, 25%)' }
      },
      purple: {
        bg: { light: '#e7defc', dark: 'hsl(261, 54%, 20%)' },
        border: { light: 'hsl(259, 84%, 87%)', dark: '#6e40c4' }
      },
      pink: {
        bg: { light: '#fde6f2', dark: 'hsl(314, 27%, 15%)' },
        border: { light: 'hsl(314, 96%, 89%)', dark: 'hsl(314, 46%, 25%)' }
      }
    };
    
    // Get the variant of the selected option, default to 'gray' if not specified
    const selectedOption = options.find(opt => opt.value === currentValue);
    const rawVariant = selectedOption?.variant;
    const selectedVariant: SegmentedControlVariant = (
      rawVariant && 
      typeof rawVariant === 'string' && 
      rawVariant in variantColors
    ) 
      ? rawVariant as SegmentedControlVariant
      : 'gray';
    
    const selectedColors = variantColors[selectedVariant] || variantColors.gray;

    return (
      <>
        <style dangerouslySetInnerHTML={{
          __html: `
            #${controlsId} {
              --paddle-transform: ${paddleTransform}%;
              --paddle-bg-light: ${selectedColors.bg.light};
              --paddle-bg-dark: ${selectedColors.bg.dark};
              --paddle-border-light: ${selectedColors.border.light};
              --paddle-border-dark: ${selectedColors.border.dark};
            }
            #${controlsId} input {
              position: absolute !important;
              height: 1px;
              width: 1px;
              overflow: hidden;
              clip: rect(1px 1px 1px 1px);
              clip: rect(1px, 1px, 1px, 1px);
              white-space: nowrap;
            }
            #${controlsId} label:last-of-type::after {
              content: "";
              position: absolute;
              top: 0;
              right: 0;
              bottom: 0;
              left: 0;
              z-index: -2;
              background: var(--paddle-bg-light);
              border-radius: 0.4275rem;
              border: 1px solid var(--paddle-border-light);
              transform: translateX(var(--paddle-transform));
              transition: transform 0.3s ease-in-out, background 0.3s ease-in-out, border-color 0.3s ease-in-out;
            }
            .dark #${controlsId} label:last-of-type::after {
              background: var(--paddle-bg-dark);
              border-color: var(--paddle-border-dark);
            }
            #${controlsId} label:not(:first-of-type)::before {
              content: "";
              position: absolute;
              z-index: -3;
              top: 0.5rem;
              left: 0;
              bottom: 0.5rem;
              width: 1px;
              background: rgba(0,0,0,0.15);
              transition: opacity 0.3s ease;
            }
            .dark #${controlsId} label:not(:first-of-type)::before {
              background: rgba(255, 255, 255, 0.15);
            }
            #${controlsId} input:checked + label::before,
            #${controlsId} input:checked + label + input + label::before {
              opacity: 0;
            }
            @media (pointer: coarse) {
            #${controlsId}:focus-within {
              box-shadow: 0 0 0 0.2rem rgba(0,122,255,0.75);
            }
            .dark #${controlsId}:focus-within {
              box-shadow: 0 0 0 0.2rem rgba(0,122,255,0.5);
            }
        }
          `
        }} />
        <div
          ref={ref}
          id={controlsId}
          className={cn(
            'flex relative overflow-hidden',
            'rounded-[0.5rem] bg-input dark:bg-input-dark h-10 px-0.5 pb-[0.16rem] !pt-0.5 border border-gray-border dark:border-gray-border-dark ',
            'transition-all duration-300 ease-in-out',
            className
          )}
          {...props}
        >
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            const inputId = `${name}-${option.value}-${index}`;
            const isLast = index === options.length - 1;
            // Get variant-specific text and icon colors
            // Only show variant color when selected, otherwise use default gray
            const getTextColorClass = () => {
              if (!isSelected) {
                // Unselected buttons always use default gray
                return 'text-gray dark:text-gray-dark';
              }
              
              // Selected buttons use their variant color (if specified and not gray)
              const variant = option.variant;
              if (variant && variant !== 'gray') {
                const variantColorMap: Record<Exclude<SegmentedControlVariant, 'gray'>, string> = {
                  green: 'text-green dark:text-green-dark',
                  blue: 'text-blue dark:text-blue-dark',
                  red: 'text-red dark:text-red-dark',
                  orange: 'text-orange dark:text-orange-dark',
                  purple: 'text-purple dark:text-purple-dark',
                  pink: 'text-pink dark:text-pink-dark',
                };
                return variantColorMap[variant] || 'text-gray dark:text-gray-dark';
              }
              
              // Default to gray for selected buttons without variant
              return 'text-gray dark:text-gray-dark';
            };
            
            const textColorClass = getTextColorClass();
            
            const labelContent = (
              <>
                {option.icon && (
                  <span className={cn(
                    "w-4 h-4 flex items-center justify-center",
                    textColorClass
                  )}>
                    {option.icon}
                  </span>
                )}
                {option.label && (
                  <span className={cn(
                    'text-[0.8125rem] font-medium leading-none',
                    'font-sans', // -apple-system, BlinkMacSystemFont, sans-serif
                    isSelected && 'text-[0.875rem] font-semibold',
                    option.icon && 'ms-2',
                    textColorClass
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
                />
                {option.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label
                        htmlFor={inputId}
                        className={cn(
                          'flex-1 flex justify-center items-center text-center',
                          'cursor-pointer relative',
                          'transition-all duration-300',
                          'p-4',
                          isLast ? 'z-[1]' : 'z-[2]'
                        )}
                      >
                        {labelContent}
                      </label>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {option.tooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <label
                    htmlFor={inputId}
                    className={cn(
                      'flex-1 flex justify-center items-center text-center',
                      'cursor-pointer relative',
                      'transition-all duration-300',
                      'px-2',
                      isLast ? 'z-[1]' : 'z-[2]'
                    )}
                  >
                    {labelContent}
                  </label>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </>
    );
  }
);

SegmentedControls.displayName = 'SegmentedControls';

export { SegmentedControls };