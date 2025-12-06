import { HTMLAttributes, FC } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-skeleton bg-gray-200 dark:bg-white/10 rounded ${className}`}
      {...props}
    />
  );
};


