'use client';

import React from 'react';

const ParkCardSkeleton = () => {
  return (
    <div className="h-fit bg-card dark:bg-card-dark rounded-3xl overflow-hidden relative group select-none transform-gpu transition-all duration-200 animate-pulse">
      {/* Image skeleton */}
      <div className="relative bg-black/25 h-[10.5rem] overflow-hidden">
        <div className="absolute inset-0 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200" />
      </div>
      
      {/* Content skeleton */}
      <div className="px-4 py-3  space-y-1">
        {/* Title skeleton */}
        <div className="w-3/4 h-6 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200 rounded-md" />
        
        {/* Location and rating skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200 rounded-full mr-1" />
            <div className=" w-10 h-4 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200 rounded-md" />
          </div>
          <div className="flex items-end gap-1">
              <div className="w-4 h-4 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200 rounded-full" />
              <div className="w-5 h-5 -mt-1 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParkCardSkeleton;





