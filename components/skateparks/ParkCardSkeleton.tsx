'use client';

import { Skeleton } from '@/components/ui/skeleton';

const ParkCardSkeleton = () => {
  return (
    <div className="h-fit cursor-pointer relative group select-none transform-gpu transition-all duration-300">
   
      {/* Image container with drop-shadow (matching SkateparkCard) */}
      <div 
        className="relative h-[12rem] lg:h-[14rem] overflow-hidden rounded-2xl opacity-60">
        {/* Main image skeleton */}
        <Skeleton className="absolute inset-0 w-full h-full rounded-2xl" />

      </div>
    </div>
  );
};

export default ParkCardSkeleton;





