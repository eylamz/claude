'use client';

import React from 'react';

const ParkCardSkeleton = () => {
  return (
    <div className="h-fit bg-card dark:bg-card-dark rounded-3xl overflow-hidden relative group select-none transform-gpu transition-all duration-200 animate-pulse">
      {/* Image skeleton */}
      <div className="relative bg-black/25 h-[10.5rem] overflow-hidden">
        <div className="absolute inset-0 bg-text-secondary-dark/50 dark:bg-background-dark/50 transition-all duration-200" />
      </div>
      

    </div>
  );
};

export default ParkCardSkeleton;





