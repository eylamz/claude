'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import FullscreenImageViewer from './FullscreenImageViewer';
import { Button } from '../ui';
import { Icon } from '@/components/icons';

interface ParkImageGalleryProps {
  images: { url: string; alt?: string }[];
  className?: string;
  parkName?: string;
  closingYear?: number | null;
  area?: 'north' | 'center' | 'south';
  updatedAt?: string | Date;
  locale?: string;
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

// Create a memoized image component to handle loading state
const OptimizedImage = React.memo(({ 
  url, 
  index, 
  alt,
  onClick,
  className
}: { 
  url: string; 
  index: number; 
  alt?: string;
  onClick: (index: number, e: React.MouseEvent) => void;
  className?: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-lg bg-card dark:bg-white/5 z-10">
          <LoadingSpinner />
        </div>
      )}
      <img
        src={getOptimizedImageUrl(url, 1200, 90)}
        alt={alt || `Image ${index + 1}`}
        className={cn(
          'w-full h-full object-cover select-none transition-all duration-300 cursor-zoom-in saturate-[1.3]',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        draggable={false}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onClick={(e) => onClick(index, e)}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Hook to detect when element enters viewport
const useInViewport = (options = {}) => {
  const [isInViewport, setIsInViewport] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsInViewport(true);
          setHasAnimated(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [hasAnimated, options]);

  return { ref, isInViewport };
};

// ImageContainer component that animates when entering viewport
const ImageContainer = ({ 
  children, 
  className, 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}) => {
  const { ref, isInViewport } = useInViewport();

  return (
    <div
      ref={ref}
      className={cn(
        className,
        isInViewport && 'animate-fadeInUp'
      )}
      style={{
        boxShadow: '0 1px 1px #66666612, 0 2px 2px #5e5e5e12, 0 4px 4px #7a5d4413, 0 8px 8px #5e5e5e12, 0 16px 16px #5e5e5e12'
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const ParkImageGallery = ({ 
  images, 
  className, 
  parkName = '',
  closingYear,
  area = 'center',
  updatedAt,
  locale = 'en'
}: ParkImageGalleryProps) => {
  const t = useTranslations('skateparks');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className={cn('relative h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center', className)}>
        <span className="text-gray-400">No images available</span>
      </div>
    );
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsFullscreenOpen(true);
  };

  // Get main image (first image)
  const mainImage = images[0];
  // Get side images (next 2 images) - only show if there are more than 1 image
  const sideImages = images.slice(1, 3);
  // Get remaining images (from index 3 onwards)
  const remainingImages = images.slice(3);

  const hasMoreImages = remainingImages.length > 0;

  // Function to group remaining images into rows with alternating layout
  const groupImagesIntoRows = (imgs: typeof images, startIndex: number) => {
    const rows: Array<{
      type: 'big-small-small' | 'small-small-big' | 'three-small' | 'two-small' | 'one-big';
      images: typeof images;
      startIndex: number;
    }> = [];

    let currentIndex = 0;
    let rowType: 'big-small-small' | 'small-small-big' = 'small-small-big'; // Start with reversed pattern

    while (currentIndex < imgs.length) {
      const remaining = imgs.length - currentIndex;

      if (remaining >= 3) {
        // Full row of 3 images with alternating pattern
        rows.push({
          type: rowType,
          images: imgs.slice(currentIndex, currentIndex + 3),
          startIndex: startIndex + currentIndex,
        });
        currentIndex += 3;
        // Alternate pattern
        rowType = rowType === 'big-small-small' ? 'small-small-big' : 'big-small-small';
      } else if (remaining === 2) {
        // 2 images: show as 2 small (50% width each)
        rows.push({
          type: 'two-small',
          images: imgs.slice(currentIndex, currentIndex + 2),
          startIndex: startIndex + currentIndex,
        });
        currentIndex += 2;
      } else if (remaining === 1) {
        // 1 image: show as big
        rows.push({
          type: 'one-big',
          images: imgs.slice(currentIndex, currentIndex + 1),
          startIndex: startIndex + currentIndex,
        });
        currentIndex += 1;
      }
    }

    return rows;
  };

  const imageRows = showAllImages ? groupImagesIntoRows(remainingImages, 3) : [];

  return (
    <>
      <div className={cn('w-full', className)}>
        <div className="-overflow-hidden">
          {/* Desktop Layout: Main image on left, 2 side images on right */}
          <div className="hidden md:flex md:flex-row gap-2 p-2">
            {/* Main Image - Takes 2/3 of width if side images exist, full width if not */}
            <ImageContainer
              className={cn(
                "relative aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in",
                sideImages.length > 0 ? "w-2/3" : "w-full"
              )}
              onClick={() => handleImageClick(0)}
            >
              <OptimizedImage 
                url={mainImage.url} 
                index={0} 
                alt={mainImage.alt}
                onClick={handleImageClick}
              />
              {/* Search Icon Overlay */}
              <div className={`absolute top-2 rounded-xl  ${locale === 'he' ? 'right-2' : 'left-2'} z-20 bg-background-dark/70 backdrop-blur-sm  flex items-start justify-start p-2`}>
                <Icon name="zoomIn" className="w-4 h-4 text-white" />
              </div>
            </ImageContainer>

            {/* Side Images Column - Takes 1/3 of width */}
            {sideImages.length > 0 && (
              <div className="flex flex-col w-1/3 gap-2">
                {sideImages.map((image, index) => (
                  <ImageContainer
                    key={index + 1}
                    className="relative flex-1 rounded-xl overflow-hidden cursor-zoom-in"
                    onClick={() => handleImageClick(index + 1)}
                  >
                    <OptimizedImage 
                      url={image.url} 
                      index={index + 1} 
                      alt={image.alt}
                      onClick={handleImageClick}
                    />
                  </ImageContainer>
                ))}
              </div>
            )}
          </div>

          {/* Mobile/Tablet Layout: Main image on top, 2 columns below */}
          <div className="md:hidden flex flex-col gap-2 p-2">
            {/* Main Image - Full width */}
            <ImageContainer
              className="relative w-full aspect-video rounded-xl overflow-hidden cursor-zoom-in"
              onClick={() => handleImageClick(0)}
            >
              <OptimizedImage 
                url={mainImage.url} 
                index={0} 
                alt={mainImage.alt}
                onClick={handleImageClick}
              />
         
            </ImageContainer>

            {/* Side Images - 2 columns grid */}
            {sideImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {sideImages.map((image, index) => (
                  <ImageContainer
                    key={index + 1}
                    className="relative aspect-video rounded-xl overflow-hidden cursor-zoom-in"
                    onClick={() => handleImageClick(index + 1)}
                  >
                    <OptimizedImage 
                      url={image.url} 
                      index={index + 1} 
                      alt={image.alt}
                      onClick={handleImageClick}
                    />
                  </ImageContainer>
                ))}
              </div>
            )}

            {/* Remaining Images - Alternating layout (shown when showAllImages is true) */}
            {showAllImages && imageRows.length > 0 && (
              <div className="space-y-2">
                {imageRows.map((row, rowIndex) => {
                  if (row.type === 'big-small-small') {
                    // 1 big + 2 small
                    return (
                      <div key={rowIndex} className="flex flex-row gap-2">
                        <ImageContainer
                          className="relative w-2/3 aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in"
                          onClick={() => handleImageClick(row.startIndex)}
                        >
                          <OptimizedImage 
                            url={row.images[0].url} 
                            index={row.startIndex} 
                            alt={row.images[0].alt}
                            onClick={handleImageClick}
                          />
                        </ImageContainer>
                        <div className="flex flex-col w-1/3 gap-2">
                          {row.images.slice(1).map((image, imgIndex) => (
                            <ImageContainer
                              key={imgIndex}
                              className="relative flex-1 rounded-xl overflow-hidden cursor-zoom-in"
                              onClick={() => handleImageClick(row.startIndex + imgIndex + 1)}
                            >
                              <OptimizedImage 
                                url={image.url} 
                                index={row.startIndex + imgIndex + 1} 
                                alt={image.alt}
                                onClick={handleImageClick}
                              />
                            </ImageContainer>
                          ))}
                        </div>
                      </div>
                    );
                  } else if (row.type === 'small-small-big') {
                    // 2 small + 1 big
                    return (
                      <div key={rowIndex} className="flex flex-row gap-2">
                        <div className="flex flex-col w-1/3 gap-2">
                          {row.images.slice(0, 2).map((image, imgIndex) => (
                            <ImageContainer
                              key={imgIndex}
                              className="relative flex-1 rounded-xl overflow-hidden cursor-zoom-in"
                              onClick={() => handleImageClick(row.startIndex + imgIndex)}
                            >
                              <OptimizedImage 
                                url={image.url} 
                                index={row.startIndex + imgIndex} 
                                alt={image.alt}
                                onClick={handleImageClick}
                              />
                            </ImageContainer>
                          ))}
                        </div>
                        <ImageContainer
                          className="relative w-2/3 aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in"
                          onClick={() => handleImageClick(row.startIndex + 2)}
                        >
                          <OptimizedImage 
                            url={row.images[2].url} 
                            index={row.startIndex + 2} 
                            alt={row.images[2].alt}
                            onClick={handleImageClick}
                          />
                        </ImageContainer>
                      </div>
                    );
                  } else if (row.type === 'three-small') {
                    // 3 small in a row
                    return (
                      <div key={rowIndex} className="grid grid-cols-3 gap-2">
                        {row.images.map((image, imgIndex) => (
                          <ImageContainer
                            key={imgIndex}
                            className="relative aspect-video rounded-xl overflow-hidden cursor-zoom-in"
                            onClick={() => handleImageClick(row.startIndex + imgIndex)}
                          >
                            <OptimizedImage 
                              url={image.url} 
                              index={row.startIndex + imgIndex} 
                              alt={image.alt}
                              onClick={handleImageClick}
                            />
                          </ImageContainer>
                        ))}
                      </div>
                    );
                  } else if (row.type === 'two-small') {
                    // 2 small (50% width each)
                    return (
                      <div key={rowIndex} className="grid grid-cols-2 gap-2">
                        {row.images.map((image, imgIndex) => (
                          <ImageContainer
                            key={imgIndex}
                            className="relative aspect-video rounded-xl overflow-hidden cursor-zoom-in"
                            onClick={() => handleImageClick(row.startIndex + imgIndex)}
                          >
                            <OptimizedImage 
                              url={image.url} 
                              index={row.startIndex + imgIndex} 
                              alt={image.alt}
                              onClick={handleImageClick}
                            />
                          </ImageContainer>
                        ))}
                      </div>
                    );
                  } else if (row.type === 'one-big') {
                    // 1 big
                    return (
                      <div key={rowIndex} className="w-full">
                        <ImageContainer
                          className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in"
                          onClick={() => handleImageClick(row.startIndex)}
                        >
                          <OptimizedImage 
                            url={row.images[0].url} 
                            index={row.startIndex} 
                            alt={row.images[0].alt}
                            onClick={handleImageClick}
                          />
                        </ImageContainer>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* Desktop: Remaining Images - Alternating layout (shown when showAllImages is true) */}
          {showAllImages && imageRows.length > 0 && (
            <div className="hidden md:block p-2 pt-0 space-y-2">
              {imageRows.map((row, rowIndex) => {
                if (row.type === 'big-small-small') {
                  // 1 big + 2 small
                  return (
                    <div key={rowIndex} className="flex flex-row gap-2">
                      <ImageContainer
                          className="relative w-2/3 aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in"
                        onClick={() => handleImageClick(row.startIndex)}
                      >
                        <OptimizedImage 
                          url={row.images[0].url} 
                          index={row.startIndex} 
                          alt={row.images[0].alt}
                          onClick={handleImageClick}
                        />
                      </ImageContainer>
                      <div className="flex flex-col w-1/3 gap-2">
                        {row.images.slice(1).map((image, imgIndex) => (
                          <ImageContainer
                            key={imgIndex}
                            className="relative flex-1 rounded-xl overflow-hidden cursor-zoom-in"
                            onClick={() => handleImageClick(row.startIndex + imgIndex + 1)}
                          >
                            <OptimizedImage 
                              url={image.url} 
                              index={row.startIndex + imgIndex + 1} 
                              alt={image.alt}
                              onClick={handleImageClick}
                            />
                          </ImageContainer>
                        ))}
                      </div>
                    </div>
                  );
                } else if (row.type === 'small-small-big') {
                  // 2 small + 1 big
                  return (
                    <div key={rowIndex} className="flex flex-row gap-2">
                      <div className="flex flex-col w-1/3 gap-2">
                        {row.images.slice(0, 2).map((image, imgIndex) => (
                          <ImageContainer
                            key={imgIndex}
                            className="relative flex-1 rounded-xl overflow-hidden cursor-zoom-in"
                            onClick={() => handleImageClick(row.startIndex + imgIndex)}
                          >
                            <OptimizedImage 
                              url={image.url} 
                              index={row.startIndex + imgIndex} 
                              alt={image.alt}
                              onClick={handleImageClick}
                            />
                          </ImageContainer>
                        ))}
                      </div>
                      <ImageContainer
                          className="relative w-2/3 aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in"
                        onClick={() => handleImageClick(row.startIndex + 2)}
                      >
                        <OptimizedImage 
                          url={row.images[2].url} 
                          index={row.startIndex + 2} 
                          alt={row.images[2].alt}
                          onClick={handleImageClick}
                        />
                      </ImageContainer>
                    </div>
                  );
                } else if (row.type === 'three-small') {
                  // 3 small in a row
                  return (
                    <div key={rowIndex} className="grid grid-cols-3 gap-2">
                      {row.images.map((image, imgIndex) => (
                        <ImageContainer
                          key={imgIndex}
                          className="relative aspect-video rounded-xl overflow-hidden cursor-zoom-in"
                          onClick={() => handleImageClick(row.startIndex + imgIndex)}
                        >
                          <OptimizedImage 
                            url={image.url} 
                            index={row.startIndex + imgIndex} 
                            alt={image.alt}
                            onClick={handleImageClick}
                          />
                        </ImageContainer>
                      ))}
                    </div>
                  );
                } else if (row.type === 'two-small') {
                  // 2 small (50% width each)
                  return (
                    <div key={rowIndex} className="grid grid-cols-2 gap-2">
                      {row.images.map((image, imgIndex) => (
                        <ImageContainer
                          key={imgIndex}
                          className="relative aspect-video rounded-xl overflow-hidden cursor-zoom-in"
                          onClick={() => handleImageClick(row.startIndex + imgIndex)}
                        >
                          <OptimizedImage 
                            url={image.url} 
                            index={row.startIndex + imgIndex} 
                            alt={image.alt}
                            onClick={handleImageClick}
                          />
                        </ImageContainer>
                      ))}
                    </div>
                  );
                } else if (row.type === 'one-big') {
                  // 1 big
                  return (
                    <div key={rowIndex} className="w-full">
                      <ImageContainer
                        className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in"
                        onClick={() => handleImageClick(row.startIndex)}
                      >
                        <OptimizedImage 
                          url={row.images[0].url} 
                          index={row.startIndex} 
                          alt={row.images[0].alt}
                          onClick={handleImageClick}
                        />
                      </ImageContainer>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Show More/Less Button */}
          {hasMoreImages && (
            <div className="flex flex-col items-center gap-3 p-2 pb-0">
              <div className="grid grid-cols-3 items-start gap-4 w-full">
                {/* Share Button */}
                <div 
                  className={`flex ${locale === 'he' ? 'justify-end' : 'justify-start'}`}
                  style={{ order: locale === 'he' ? 3 : 1 }}
                >
                  {parkName && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.share) {
                          navigator.share({
                            title: parkName,
                            text: `${parkName} - Skatepark`,
                            url: typeof window !== 'undefined' ? window.location.href : '',
                          }).catch((error) => {
                            console.error('Error sharing:', error);
                          });
                        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg font-medium transition-all duration-700  }`}
                      aria-label="Share"
                    >
                      <Icon name="shareBold" className="-mt-[2px] w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Show More/Less Button - Center */}
                <div className="flex justify-center" style={{ order: 2 }}>
                  <Button
                    onClick={() => setShowAllImages(!showAllImages)}
                    className="-mx-14 line-clamp-2 max-w-[37vw] backdrop-blur-[2px] flex items-center gap-2 px-6 py-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/[7.5%] dark:hover:bg-white/[7.5%] transition-colors text-text-secondary dark:text-text-dark/70 font-medium opacity-0 animate-bounceDownSqueeze"
                    aria-label={showAllImages ? t('showLessImages') : t('showMoreImages', { count: remainingImages.length })}
                  >
                    {showAllImages ? (
                      <>
                        <span>{t('showLessImages')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('showMoreImages', { count: remainingImages.length })}</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Last Updated Time */}
                <div 
                  className={`flex flex-col md:flex-row md:gap-1 ${locale === 'he' ? 'justify-start' : 'justify-end'} text-xs text-text/50 dark:text-text-dark/50`}
                  style={{ order: locale === 'he' ? 1 : 3 }}
                >
                  {updatedAt && (
                    <>
                      <span>
                        {locale === 'he' ? 'עודכן לאחרונה: ' : 'Last updated: '}
                      </span>
                      <span>
                        {new Date(updatedAt).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>

             
            </div>
          )}
        </div>
      </div>

      <FullscreenImageViewer
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </>
  );
};

export default ParkImageGallery;

