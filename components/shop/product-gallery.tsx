'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface ProductImage {
  url: string;
  alt: string;
  order?: number;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  className?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  className,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  if (!images || images.length === 0) {
    return (
      <div className={cn('aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center', className)}>
        <p className="text-gray-400 dark:text-gray-600">No images available</p>
      </div>
    );
  }

  const selectedImage = images[selectedIndex] || images[0];
  const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    setZoomPosition({ x: 50, y: 50 });
  };

  const handleImageHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const nextImage = () => {
    setSelectedIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const prevImage = () => {
    setSelectedIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  return (
    <>
      <div className={cn('flex flex-col gap-4', className)}>
        {/* Main Image */}
        <div
          className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900 cursor-zoom-in group"
          onMouseEnter={handleImageHover}
          onClick={() => setIsFullscreen(true)}
        >
          <img
            src={selectedImage.url}
            alt={selectedImage.alt || productName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            style={{
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
            }}
          />
          {/* Zoom indicator */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div
              className="absolute w-32 h-32 border-2 border-white rounded-full shadow-lg"
              style={{
                left: `${zoomPosition.x}%`,
                top: `${zoomPosition.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
          {/* Navigation arrows (only show if multiple images) */}
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                aria-label="Previous image"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                aria-label="Next image"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Navigation */}
        {sortedImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {sortedImages.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  'shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                  selectedIndex === index
                    ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
                aria-label={`View image ${index + 1}`}
              >
                <img
                  src={image.url}
                  alt={image.alt || `${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-10"
            aria-label="Close fullscreen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.alt || productName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-3 bg-black/50 rounded-full"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-3 bg-black/50 rounded-full"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {sortedImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(index);
                    }}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      selectedIndex === index
                        ? 'bg-white w-8'
                        : 'bg-white/50 hover:bg-white/75'
                    )}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};











