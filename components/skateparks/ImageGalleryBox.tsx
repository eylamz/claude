'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import FullscreenImageViewer from './FullscreenImageViewer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ImageGalleryBoxProps {
  images: { url: string; alt?: string }[];
  className?: string;
}

// Creates optimized versions of Cloudinary images
const getOptimizedImageUrl = (originalUrl: string, width: number = 800, quality: number = 90): string => {
  if (originalUrl && originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_${width},q_${quality},c_fill/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

// Creates optimized thumbnails
const getOptimizedThumbnailUrl = (originalUrl: string, width: number = 120, quality: number = 80): string => {
  if (originalUrl && originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_${width},h_${width},c_fill,q_${quality}/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

const ImageGalleryBox = ({ images, className }: ImageGalleryBoxProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [mainImageLoading, setMainImageLoading] = useState(true);

  if (!images || images.length === 0) {
    return (
      <div className={cn('relative h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center', className)}>
        <span className="text-gray-400">No images available</span>
      </div>
    );
  }

  const handleThumbnailClick = (index: number) => {
    // If there are more than 5 images, open fullscreen viewer instead of changing main image
    if (images.length > 5) {
      setSelectedIndex(index);
      setIsFullscreenOpen(true);
    } else {
      setSelectedIndex(index);
      setMainImageLoading(true);
    }
  };

  const handleMainImageClick = () => {
    setIsFullscreenOpen(true);
  };

  const currentImage = images[selectedIndex];

  // Determine how many thumbnails to show
  // Show 5 by default, but if there are more than 10 images, show 10
  const maxThumbnails = images.length > 10 ? 10 : Math.min(images.length, 5);
  const thumbnailsToShow = images.slice(0, maxThumbnails);

  return (
    <>
      <div className={cn('w-full', className)}>
        <div className="backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70 rounded-3xl overflow-hidden border-4 border-border-dark/20 dark:border-text-secondary-dark/70">
          {/* Main Image - Top on mobile, Left on lg+ */}
          <div className="relative w-full lg:w-auto lg:flex lg:flex-row">
            <div 
              className="relative w-full lg:w-3/4 aspect-video lg:aspect-auto lg:h-[500px] cursor-pointer group overflow-hidden"
              onClick={handleMainImageClick}
            >
              {mainImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-lg bg-gray-50/75 dark:bg-gray-900/75 z-10">
                  <LoadingSpinner />
                </div>
              )}
              <img
                src={getOptimizedImageUrl(currentImage.url, 1200, 90)}
                alt={currentImage.alt || `Image ${selectedIndex + 1}`}
                className={cn(
                  'w-full h-full object-cover p-2 rounded-3xl select-none transition-all duration-300 saturate-[125%]',
                  mainImageLoading ? 'opacity-0' : 'opacity-100'
                )}
                draggable={false}
                loading="lazy"
                onLoad={() => setMainImageLoading(false)}
              />
              {/* Overlay on hover */}
              <div className="m-2 rounded-xl absolute inset-0 opacity-0 group-hover:opacity-100  transition-all duration-300 flex items-center justify-center backdrop-blur-[2px] group-hover:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent to-black/50">
                <div className="transition-opacity duration-300 text-white text-sm  bg-black/50 px-4 py-2 rounded-lg">
                  Click to view fullscreen
                </div>
              </div>
            </div>

            {/* Thumbnails - Bottom on mobile (5 column grid), Right on lg+ (vertical) */}
            <div className="w-full lg:w-1/4 lg:h-[500px] py-1 px-2 flex flex-col">
              {/* Mobile: 5 column grid */}
              <div className="grid grid-cols-5 gap-1 lg:hidden">
                {thumbnailsToShow.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={cn(
                      'relative rounded-lg overflow-hidden border-2 transition-all duration-200',
                      'hover:scale-105 hover:shadow-lg',
                      index === selectedIndex
                        ? 'border-brand-main dark:border-brand-dark shadow-md ring-2 ring-brand-main/20 dark:ring-brand-dark/20'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                    style={{
                      aspectRatio: '4/3',
                    }}
                  >
                    <img
                      src={getOptimizedThumbnailUrl(image.url, 150, 80)}
                      alt={image.alt || `Thumbnail ${index + 1}`}
                      className={cn(
                        'w-full h-full object-cover select-none transition-opacity duration-200',
                        index === selectedIndex ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                      )}
                      draggable={false}
                      loading="lazy"
                    />
                    {index === selectedIndex && (
                      <div className="absolute inset-0 pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>

              {/* Desktop: Vertical column - fits height, no scrolling */}
              <div className="hidden lg:flex lg:flex-col lg:h-full gap-1">
                {thumbnailsToShow.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={cn(
                      'flex-1 relative rounded-lg overflow-hidden border-2 transition-all duration-200 min-h-0',
                      'hover:scale-105 hover:shadow-lg w-full',
                      index === selectedIndex
                        ? 'border-brand-main dark:border-brand-dark shadow-md ring-2 ring-brand-main/20 dark:ring-brand-dark/20'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                    style={{
                      maxHeight: `${100 / thumbnailsToShow.length}%`,
                    }}
                  >
                    <img
                      src={getOptimizedThumbnailUrl(image.url, 150, 80)}
                      alt={image.alt || `Thumbnail ${index + 1}`}
                      className={cn(
                        'w-full h-full object-cover select-none transition-opacity duration-200',
                        index === selectedIndex ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                      )}
                      draggable={false}
                      loading="lazy"
                    />
                    {index === selectedIndex && (
                      <div className="absolute inset-0 pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FullscreenImageViewer
        images={images}
        initialIndex={selectedIndex}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </>
  );
};

export default ImageGalleryBox;

