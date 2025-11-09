'use client';

import { FC } from 'react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const Checkbox: FC<CheckboxProps> = ({ id, checked, onChange, label }) => {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
      />
      <label htmlFor={id} className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        {label}
      </label>
    </div>
  );
};

