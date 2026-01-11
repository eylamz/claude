'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'brandOutline' | 'destructive' | 'info' | 'primary' | 'ghost' | 'blue' | 'green' | 'gray' | 'orange' | 'red' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
  
  const variants = {
    default: 'bg-blue-600 text-white',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
    brandOutline: 'border text-[#16641a] dark:text-[#85ef8a] bg-[#defce0] dark:bg-[#1452174d] border-[#85ef8a] dark:border-[#1452174d]',
    destructive: 'bg-red-600 text-white',
    info: 'text-info dark:text-info-dark',
    primary: 'bg-brand-main dark:bg-brand-dark text-white',
    ghost: 'bg-transparent text-text dark:text-text-dark text-brand-main dark:text-brand-dark',
    blue: 'bg-blue-border dark:bg-blue-border-dark text-blue dark:text-blue-dark',
    green: 'bg-green-bg dark:bg-green-bg-dark text-green dark:text-green-dark',
    gray: 'bg-gray-bg dark:bg-gray-bg-dark text-gray dark:text-gray-dark',
    orange: 'bg-orange-bg dark:bg-orange-bg-dark text-orange dark:text-orange-dark',
    red: 'bg-red-bg dark:bg-red-bg-dark text-red dark:text-red-dark',
    purple: 'bg-purple-bg dark:bg-purple-bg-dark text-purple dark:text-purple-dark',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}







