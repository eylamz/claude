'use client';

import React from 'react';

export const LoadingSpinner: React.FC<{ 
  className?: string;
  variant?: 'default' | 'error' | 'info' | 'success' | 'warning' | 'header';
  size?: number;
}> = ({ className, variant = 'default', size = 32 }) => {
  const getVariantColor = () => {
    switch (variant) {
      case 'error':
        return 'border-red-500';
      case 'info':
        return 'border-blue-500';
      case 'success':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'header':
        return 'border-gray-900 dark:border-gray-100';
      default:
        return 'border-brand-main dark:border-brand-dark';
    }
  };

  return (
    <div className={`flex items-center justify-center h-full ${className || ''}`}>
      <div 
        className={`animate-spin h-8 w-8 border-4 ${getVariantColor()} border-t-transparent rounded-full mx-auto mb-4`}
      ></div>
    </div>
  );
};

export default LoadingSpinner;



