'use client';

import React, { forwardRef } from 'react';

import { Input } from '@/components/ui/input';

import { X } from 'lucide-react';

import { useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';



interface SearchInputProps {

  value: string;

  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  onClear: () => void;

  placeholder: string;

  className?: string;

  variant?: 'default' | 'header' | 'error' | 'outline';

  label?: string;

  id?: string;

}



export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({

  value,

  onChange,

  onClear,

  placeholder,

  className = '',

  variant = 'default',

  label,

  id = 'search-input'

}, ref) => {

  const t = useTranslations('common');



  const defaultIconColor = 'text-text-secondary dark:text-text-secondary';

  const searchIconColor = variant === 'header'

    ? `${defaultIconColor} group-focus-within:!text-white/80`

    : variant === 'error'

    ? `${defaultIconColor} group-focus-within:!text-error`

    : `${defaultIconColor} group-focus-within:text-brand-main/80`;



  const inputRoundedClass = variant === 'header' || variant === 'error' ? '!rounded-full' : '';

  const inputBgClass = variant === 'header' 

    ? '!bg-header-text/90 placeholder:text-text-dark/60 focus-visible:!outline-none' 

    : variant === 'error' 

    ? '!bg-black/20 dark:!bg-black/40 placeholder:text-text-dark/60' 

    : '';



  const focusOutlineClass = variant === 'error' 

    ? 'md:focus-visible:outline-[#3c0101]/20' 

    : 'md:focus-visible:outline-none';



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

      <Input

        ref={ref}

        id={id}

        type="text"

        placeholder={placeholder}

        value={value}

        onChange={onChange}

        className={`w-full px-4 py-2 ${

          variant === 'header' || variant === 'error' 

            ? 'text-text-dark' 

            : 'text-text dark:text-text-dark'

        } rounded-md focus:outline-none ${focusOutlineClass} ${inputRoundedClass} ${inputBgClass}`}

        autoComplete="off"

        variant={variant === 'error' ? 'default' : variant}

        aria-label={label || placeholder}

      />

      <div className="absolute top-2.5 ltr:right-0 rtl:left-0 flex items-center px-3">

        {value ? (

          <button

            onClick={onClear}

            className={`p-1 -mt-1 rounded-full transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5 ${defaultIconColor}`}

            title={t('clear')}

            aria-label={t('clear')}

          >

            <X className="w-5 h-5 animate-pop" />

          </button>

        ) : (

          <div 

            className={`p-1 -mt-1 rounded-full ${defaultIconColor}`}

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

  );

});

SearchInput.displayName = "SearchInput";





