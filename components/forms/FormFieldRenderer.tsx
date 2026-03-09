'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { IsraelCitiesAutocomplete } from '@/components/ui/israel-cities-autocomplete';
import Image from 'next/image';
import { RadioButton } from '../ui';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'date' | 'number' | 'link' | 'image' | 'image-selection' | 'israel-cities';
  label: { en: string; he: string };
  required: boolean;
  placeholder?: { en: string; he: string };
  options?: Array<{ value: string; label: { en: string; he: string } }>;
  hasOtherOption?: boolean;
  otherInputType?: 'input' | 'textarea';
  otherLabel?: { en: string; he: string };
  otherPlaceholder?: { en: string; he: string };
  images?: Array<{ url: string; alt?: { en: string; he: string } }>;
  min?: number;
  max?: number;
}

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  locale: 'en' | 'he';
  questionNumber?: number;
}

export function FormFieldRenderer({ field, value, onChange, error, locale, questionNumber }: FormFieldRendererProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [otherValue, setOtherValue] = useState<string>('');

  // Initialize otherValue from existing value if present
  useEffect(() => {
    if (typeof value === 'object' && value?.value === 'other' && value?.other) {
      setOtherValue(value.other);
    }
  }, [value]);

  const label = field.label[locale] || field.label.en || '';
  const placeholder = field.placeholder?.[locale] || field.placeholder?.en || '';
  const displayLabel = questionNumber !== undefined ? `${questionNumber}. ${label}` : label;

  const handleRadioChange = (optionValue: string) => {
    if (field.hasOtherOption && optionValue === 'other') {
      onChange({ value: 'other', other: '' });
      setOtherValue('');
    } else {
      onChange(optionValue);
      setOtherValue('');
    }
  };

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      onChange([...currentValues, optionValue]);
    } else {
      onChange(currentValues.filter((v: string) => v !== optionValue));
    }
  };

  const handleSelectChange = (selectedValue: string) => {
    if (field.hasOtherOption && selectedValue === 'other') {
      onChange({ value: 'other', other: '' });
      setOtherValue('');
    } else {
      onChange(selectedValue);
      setOtherValue('');
    }
  };

  const handleImageSelection = (imageUrl: string) => {
    if (field.type === 'image-selection') {
      // For image-selection, we can support single or multiple selection
      // For now, let's support single selection (can be extended)
      setSelectedImage(imageUrl);
      onChange(imageUrl);
    }
  };

  switch (field.type) {
    case 'text':
      return (
        <div>
          <Input
            label={displayLabel}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            error={error}
            required={field.required}
          />
        </div>
      );

    case 'textarea':
      return (
        <div>
          <Textarea
            label={displayLabel}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            error={error}
            required={field.required}
            rows={4}
          />
        </div>
      );

    case 'radio':
      return (
        <div className="space-y-3">
          <label className="block text-base font-semibold text-text dark:text-text-dark mb-2">
             {displayLabel} {field.required && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {field.options?.map((option, index) => {
              const optionLabel = option.label[locale] || option.label.en || option.value;
              const isSelected = value === option.value || (typeof value === 'object' && value?.value === option.value);
              return (
                <div key={index} className="flex items-center">
                  <RadioButton
                    id={`${field.id}-${index}`}
                    name={field.id}
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleRadioChange(option.value)}
                    required={field.required}
                  />

                  <label
                    htmlFor={`${field.id}-${index}`}
                    className={`min-w-[300px] text-sm text-text dark:text-text-dark cursor-pointer ${locale === 'he' ? 'ms-2' : 'ms-6'}`}
                  >
                    {optionLabel}
                  </label>
                </div>
              );
            })}
            {field.hasOtherOption && (
              <div className="space-y-2">
                <div className="flex items-center">
      
                  <RadioButton
                    id={`${field.id}-other`}
                    name={field.id}
                    value="other"
                    checked={typeof value === 'object' && value?.value === 'other'}
                    onChange={() => handleRadioChange('other')}
                    required={field.required}
                  />
                  <label
                    htmlFor={`${field.id}-other`}
                    className={`text-sm text-text dark:text-text-dark cursor-pointer ${locale === 'he' ? 'ms-2' : 'ms-6'}`}
                  >
                    {field.otherLabel?.[locale] || (locale === 'en' ? 'Other' : 'אחר')}
                  </label>
                </div>
                {typeof value === 'object' && value?.value === 'other' && (
                  <div className={`${locale === 'he' ? 'ms-1' : 'ms-6'}`}>
                    {field.otherInputType === 'textarea' ? (
                      <Textarea
                        value={otherValue || value.other || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setOtherValue(newValue);
                          onChange({ value: 'other', other: newValue });
                        }}
                        placeholder={field.otherPlaceholder?.[locale] || (locale === 'en' ? 'Please specify...' : 'אנא ציין...')}
                        rows={3}
                        required={field.required}
                        className="w-full max-w-[300px] animate-popDown !outline-none"
                      />
                    ) : (
                      <Input
                        value={otherValue || value.other || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setOtherValue(newValue);
                          onChange({ value: 'other', other: newValue });
                        }}
                        placeholder={field.otherPlaceholder?.[locale] || (locale === 'en' ? 'Please specify...' : 'אנא ציין...')}
                        required={field.required}
                        className="w-full max-w-[300px] animate-popDown !outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-3">
          <label className="block text-base font-semibold text-text dark:text-text-dark mb-2">
            {displayLabel} {field.required && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {field.options?.map((option, index) => {
              const optionLabel = option.label[locale] || option.label.en || option.value;
              const isChecked = Array.isArray(value) && value.includes(option.value);
              return (
                <div key={index}>
                  <Checkbox
                    id={`${field.id}-${index}`}
                    checked={isChecked}
                    onChange={(checked) => handleCheckboxChange(option.value, checked)}
                    label={optionLabel}
                    variant="brand"
                  />
                </div>
              );
            })}
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-base font-semibold text-text dark:text-text-dark mb-2">
            {label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={typeof value === 'string' ? value : (typeof value === 'object' ? value?.value : '')}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={locale === 'en' ? 'Select an option...' : 'בחר אפשרות...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => {
                const optionLabel = option.label[locale] || option.label.en || option.value;
                return (
                  <SelectItem key={index} value={option.value}>
                    {optionLabel}
                  </SelectItem>
                );
              })}
              {field.hasOtherOption && (
                <SelectItem value="other">{field.otherLabel?.[locale] || (locale === 'en' ? 'Other' : 'אחר')}</SelectItem>
              )}
            </SelectContent>
          </Select>
          {field.hasOtherOption && typeof value === 'object' && value?.value === 'other' && (
            <div className="mt-3">
              {field.otherInputType === 'textarea' ? (
                <Textarea
                  value={otherValue || value.other || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setOtherValue(newValue);
                    onChange({ value: 'other', other: newValue });
                  }}
                  placeholder={field.otherPlaceholder?.[locale] || (locale === 'en' ? 'Please specify...' : 'אנא ציין...')}
                  rows={3}
                  required={field.required}
                />
              ) : (
                <Input
                  value={otherValue || value.other || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setOtherValue(newValue);
                    onChange({ value: 'other', other: newValue });
                  }}
                  placeholder={field.otherPlaceholder?.[locale] || (locale === 'en' ? 'Please specify...' : 'אנא ציין...')}
                  required={field.required}
                  className="max-w-[300px]"
                />
              )}
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div>
          <Input
            label={displayLabel}
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            required={field.required}
            min={field.min ? new Date(field.min).toISOString().split('T')[0] : undefined}
            max={field.max ? new Date(field.max).toISOString().split('T')[0] : undefined}
          />
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-base font-semibold text-text dark:text-text-dark mb-2">
            {label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <NumberInput
            value={typeof value === 'number' ? value : (value ? parseFloat(value) : undefined)}
            onChange={(e) => {
              const numValue = e.target.value ? parseFloat(e.target.value) : undefined;
              onChange(numValue);
            }}
            error={error}
            required={field.required}
            min={field.min}
            max={field.max}
            placeholder={placeholder}
          />
        </div>
      );

    case 'link':
      return (
        <div>
          <Input
            label={displayLabel}
            type="url"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'https://...'}
            error={error}
            required={field.required}
          />
        </div>
      );

    case 'image':
      return (
        <div>
          <label className="block text-base font-semibold text-text dark:text-text-dark mb-2">
            {label}
          </label>
          {field.images && field.images.length > 0 && (
            <div className="mt-2">
              <img
                src={field.images[0].url}
                alt={field.images[0].alt?.[locale] || field.images[0].alt?.en || ''}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
        </div>
      );

    case 'image-selection':
      return (
        <div>
          <label className="block text-base font-semibold text-text dark:text-text-dark mb-2">
            {displayLabel} {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.images && field.images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
              {field.images.map((img, index) => {
                const isSelected = selectedImage === img.url || value === img.url;
                return (
                  <div
                    key={index}
                    onClick={() => handleImageSelection(img.url)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-brand-main dark:border-brand-dark ring-2 ring-brand-main/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="aspect-square relative">
                      <Image
                        src={img.url}
                        alt={img.alt?.[locale] || img.alt?.en || ''}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-brand-main dark:bg-brand-dark text-white rounded-full p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
              {locale === 'en' ? 'No images available' : 'אין תמונות זמינות'}
            </p>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );

    case 'israel-cities':
      return (
        <IsraelCitiesAutocomplete
          value={typeof value === 'string' ? value : ''}
          onChange={(value) => onChange(value)}
          label={displayLabel}
          error={error}
          required={field.required}
          id={field.id}
          locale={locale}
        />
      );

    default:
      return null;
  }
}
