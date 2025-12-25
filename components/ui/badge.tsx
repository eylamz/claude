'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'brandOutline' | 'destructive';
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
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}







