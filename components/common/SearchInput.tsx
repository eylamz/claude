'use client';

import React, { forwardRef, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/components/icons';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  placeholder: string;
  className?: string;
  variant?: 'default' | 'header' | 'error' | 'outline';
  showTagButton?: boolean;
  label?: string;
  id?: string;
  tabIndex?: number;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  onClear,
  placeholder,
  className = '',
  variant = 'default',
  showTagButton = false,
  label,
  id = 'search-input',
  tabIndex
}, ref) => {
  const t = useTranslations('common');
  const locale = useLocale();
  const tagPrefix = locale === 'he' ? 'תג:' : 'tag:';
  const tagPrefixMatch = showTagButton && value.match(/^\s*(?:tag|תג)\s*:\s*(.*)$/i);
  const isTagActive = !!tagPrefixMatch;

  const displayValue = showTagButton && tagPrefixMatch
    ? (tagPrefixMatch[1] ?? '').trim()
    : value;

  const defaultIconColor = 'text-text-secondary dark:text-text-secondary border-red';
  const searchIconColor = isTagActive
    ? 'text-purple-500 dark:text-purple-400 group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400'
    : variant === 'header'
    ? `${defaultIconColor} group-focus-within:!text-white/80`
    : variant === 'error'
    ? `${defaultIconColor} group-focus-within:!text-error`
    : `${defaultIconColor} group-focus-within:text-brand-main/80`;

  const inputRoundedClass = variant === 'header' || variant === 'error' ? '!rounded-full' : '';
  const inputBgClass = variant === 'header' 
    ? '!bg-header-text/90 placeholder:text-text-dark/60 focus-visible:!outline-none' 
    : variant === 'error' 
    ? '!bg-black/20 dark:!bg-black/40 placeholder:text-text-dark/60 ' 
    : '!border-gray-border dark:!border-gray-border-dark ';

  const focusOutlineClass = variant === 'error' 
    ? 'md:focus-visible:outline-[#3c0101]/20' 
    : 'md:focus-visible:outline-none';

  const inputRef = useRef<HTMLInputElement>(null);
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [ref]
  );

  const handleTagClick = () => {
    if (isTagActive) {
      onChange({ target: { value: displayValue } } as React.ChangeEvent<HTMLInputElement>);
    } else {
      const newFull = displayValue ? `${tagPrefix} ${displayValue}` : tagPrefix;
      onChange({ target: { value: newFull } } as React.ChangeEvent<HTMLInputElement>);
    }
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplay = e.target.value;
    const newFull = isTagActive ? (newDisplay ? `${tagPrefix} ${newDisplay}` : tagPrefix) : newDisplay;
    onChange({ target: { value: newFull } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={`relative flex-1 group sm:max-w-[250px] ${className}`}>
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5"
        >
          {label}
        </label>
      )}
      
      {/* Wrapper to contain Input and Icons so centering is relative to the input field only */}
      <div className="relative">
        <Input
          ref={setRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={showTagButton ? displayValue : value}
          onChange={showTagButton ? handleInputChange : onChange}
          className={`w-full px-4 py-2 ${showTagButton ? 'ltr:pr-14 rtl:pl-14' : 'ltr:pr-10 rtl:pl-10'} ${
            variant === 'header' || variant === 'error' 
              ? 'text-text-dark' 
              : 'text-text dark:text-text-dark'
          } rounded-md focus:outline-none ${focusOutlineClass} ${inputRoundedClass} ${inputBgClass}`}
          autoComplete="off"
          variant={variant === 'error' ? 'default' : variant}
          aria-label={label || placeholder}
          tabIndex={tabIndex}
        />

        {/* Centered Icon Container:
          top-1/2 and -translate-y-1/2 ensures it stays in the middle of the Input field 
        */}
        <div className="absolute top-1/2 -translate-y-1/2 ltr:right-0 rtl:left-0 flex items-center gap-0 ltr:pr-2 rtl:pl-2">
          {showTagButton && (
            <button
              type="button"
              onClick={handleTagClick}
              tabIndex={tabIndex}
              className={`px-2 pt-1 pb-0  ${value.trim() ? '-mb-[6px] -mt-[7px] -me-[5px]' : '-mt-[9px] -mb-[7px] -me-[5px]'}  rounded-full transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5 ${isTagActive ? 'text-purple-500 dark:text-purple-400' : defaultIconColor}`}
              title={locale === 'he' ? 'חפש לפי תג' : 'Search by tag'}
              aria-label={locale === 'he' ? 'חפש לפי תג' : 'Search by tag'}
              aria-pressed={isTagActive}
            >
              <Icon name="tag" className="w-5 h-5 -mb-2" />
            </button>
          )}

          {value.trim() ? (
            <button
              onClick={onClear}
              tabIndex={tabIndex}
              className={`p-[7px] -me-[6px] rounded-full transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5 ${defaultIconColor}`}
              title={t('clear')}
              aria-label={t('clear')}
            >
              <X className="w-5 h-5 animate-pop" />
            </button>
          ) : (
            <div 
              className={`p-1 -mb-[6px] rounded-full ${defaultIconColor}`}
              aria-hidden="true"
            >
              <Icon 
                name="search" 
                className={`w-5 h-5 transition-all duration-200 group-focus-within:animate-popIn pointer-events-none ${searchIconColor}`} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SearchInput.displayName = "SearchInput";