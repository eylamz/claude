'use client';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className = '', orientation = 'horizontal' }: SeparatorProps) {
  const baseClasses = orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px';
  
  return (
    <div className={`${baseClasses} bg-border dark:bg-border-dark ${className}`} />
  );
}







