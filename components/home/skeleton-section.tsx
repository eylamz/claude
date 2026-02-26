'use client';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface SkeletonCardProps {
  imageHeight?: string;
  contentHeight?: string;
  showExtraContent?: boolean;
}

export const SkeletonCard = ({ 
}: SkeletonCardProps) => {
  return (
    <div className="h-40 md:h-52 flex-none bg-card dark:bg-card-dark w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] rounded-3xl overflow-hidden flex items-center justify-center transition-all duration-200">
      <LoadingSpinner />
    </div>
  );
};

interface SkeletonSectionProps {
  showExtraContent?: boolean;
}

export const SkeletonSection = ({ showExtraContent = false }: SkeletonSectionProps) => {
  return (
    <div className="flex gap-4 pb-4 pt-2 -mx-4 px-4 overflow-hidden">
      {[...Array(4)].map((_, index) => (
        <SkeletonCard key={index} showExtraContent={showExtraContent} />
      ))}
    </div>
  );
};





