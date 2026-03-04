'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import FullscreenImageViewer from './FullscreenImageViewer';
import { Button } from '../ui';
import { Icon } from '@/components/icons';

interface ParkImageGalleryProps {
  images: { url: string; alt?: string; caption?: string }[];
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
        'group',
        className,
        isInViewport && 'md:animate-fadeInUp',
        'md:[box-shadow:0_1px_1px_#66666612,0_2px_2px_#5e5e5e12,0_4px_4px_#7a5d4413,0_8px_8px_#5e5e5e12,0_16px_16px_#5e5e5e12]'
      )}
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
  updatedAt,
  locale = 'en'
}: ParkImageGalleryProps) => {
  const t = useTranslations('skateparks');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);
  const [mobileCurrentIndex, setMobileCurrentIndex] = useState(0);

  // Mobile swipe detection
  const mobileGalleryRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const touchStartScrollLeft = useRef<number>(0);
  const touchStartIndex = useRef<number>(0);
  const isScrolling = useRef<boolean>(false);
  const isTouching = useRef<boolean>(false);
  const currentImageIndex = useRef<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
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

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mobileGalleryRef.current) return;
    const container = mobileGalleryRef.current;
    const imageWidth = container.clientWidth;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    touchStartScrollLeft.current = container.scrollLeft;
    touchStartIndex.current = locale === 'he'
      ? Math.round(-container.scrollLeft / imageWidth)
      : Math.round(container.scrollLeft / imageWidth);
    isTouching.current = true;
    isScrolling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!mobileGalleryRef.current) return;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    
    // Track if user is scrolling (not just tapping)
    if (deltaY > 5 || deltaX > 5) {
      isScrolling.current = true;
    }
  };

  // Limit scroll to at most one slide from touch start (prevents fast swipe from jumping multiple images)
  // and clamp to valid range so we never show content past first/last image
  const handleScroll = () => {
    const container = mobileGalleryRef.current;
    if (!container) return;
    const imageWidth = container.clientWidth;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const isRtl = locale === 'he';

    if (isTouching.current) {
      const start = touchStartScrollLeft.current;
      const maxDelta = imageWidth;
      let clamped = scrollLeft;
      if (scrollLeft < start - maxDelta) clamped = start - maxDelta;
      else if (scrollLeft > start + maxDelta) clamped = start + maxDelta;
      // Clamp to valid range: LTR [0, maxScroll], RTL [-maxScroll, 0]
      if (isRtl) {
        clamped = Math.max(-maxScroll, Math.min(0, clamped));
      } else {
        clamped = Math.max(0, Math.min(maxScroll, clamped));
      }
      if (clamped !== scrollLeft) container.scrollLeft = clamped;
    } else {
      // Not touching (e.g. programmatic or scroll momentum): still enforce valid range
      if (isRtl) {
        if (scrollLeft > 0) container.scrollLeft = 0;
        else if (scrollLeft < -maxScroll) container.scrollLeft = -maxScroll;
      } else {
        if (scrollLeft < 0) container.scrollLeft = 0;
        else if (scrollLeft > maxScroll) container.scrollLeft = maxScroll;
      }
    }
  };

  const handleTouchEnd = () => {
    const container = mobileGalleryRef.current;
    if (!container) return;
    
    isTouching.current = false;
    
    const maxScroll = container.scrollWidth - container.clientWidth;
    const isRtl = locale === 'he';
    // Clamp scroll to valid range
    let scrollLeft = container.scrollLeft;
    if (isRtl) {
      scrollLeft = Math.max(-maxScroll, Math.min(0, scrollLeft));
    } else {
      scrollLeft = Math.max(0, Math.min(maxScroll, scrollLeft));
    }
    container.scrollLeft = scrollLeft;
    
    isScrolling.current = false;
  };

  // Track visible slide with IntersectionObserver (reliable for snap scroll)
  useEffect(() => {
    const container = mobileGalleryRef.current;
    if (!container) return;

    const slideElements = container.querySelectorAll('[data-slide-index]');
    if (!slideElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isTouching.current) return; // Don't update index during touch (avoids jump to first on fast swipe)
        let bestIndex = currentImageIndex.current;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const indexAttr = entry.target.getAttribute('data-slide-index');
          if (indexAttr === null) return;
          const i = parseInt(indexAttr, 10);
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = i;
          }
        });
        if (bestRatio >= 0.5) {
          currentImageIndex.current = bestIndex;
          setMobileCurrentIndex(bestIndex);
        }
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    slideElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [images.length]);

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
      <div className={cn('w-full relative z-0', className)}>
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
              {mainImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                  {mainImage.caption}
                </div>
              )}
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
                    {image.caption && (
                      <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-xs px-3 py-1">
                        {image.caption}
                      </div>
                    )}
                  </ImageContainer>
                ))}
              </div>
            )}
          </div>

          {/* Mobile/Tablet Layout: Horizontal scroll with swipe navigation */}
          <div className="md:hidden relative">
            <div 
              ref={mobileGalleryRef}
              id="product-gallery" 
              className="npp-media-images relative w-full flex overflow-x-scroll snap-x snap-mandatory"
              style={{
                height: '400px',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onScroll={handleScroll}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  data-slide-index={index}
                  className="snap-start snap-always relative flex-shrink-0 w-full"
                  style={{
                    height: '400px',
                    minWidth: '100%',
                  }}
                >
                  <ImageContainer
                    className="relative w-full h-full overflow-hidden cursor-zoom-in"
                    onClick={() => handleImageClick(index)}
                  >
                    <OptimizedImage 
                      url={image.url} 
                      index={index} 
                      alt={image.alt}
                      onClick={handleImageClick}
                    />
                    {image.caption && (
                      <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                        {image.caption}
                      </div>
                    )}
                  </ImageContainer>
                </div>
              ))}
            </div>

            {/* Mobile-only Instagram-style pagination with Fixed Scrubbing - own div under gallery */}
            <div className="flex justify-center py-2">
              <div
                className={cn(
                  "w-fit max-w-[100px] overflow-hidden py-2 px-2 touch-none select-none transition-colors duration-200 rounded-full",
                  isScrubbing ? "bg-[#e8e8e8] dark:bg-[#27272a]" : "bg-transparent"
                )}
                onTouchStart={() => setIsScrubbing(true)}
                onTouchEnd={() => setIsScrubbing(false)}
                onTouchMove={(e) => {
                  const gallery = mobileGalleryRef.current;
                  if (!gallery) return;

                  const rect = e.currentTarget.getBoundingClientRect();
                  const touchX = e.touches[0].clientX - rect.left;

                  // Calculate progress
                  let progress = Math.max(0, Math.min(1, touchX / rect.width));
                  const maxScroll = gallery.scrollWidth - gallery.clientWidth;

                  if (locale === 'he') {
                    gallery.scrollLeft = -(progress * maxScroll);
                  } else {
                    gallery.scrollLeft = progress * maxScroll;
                  }
                }}
              >
                <div
                  className="flex items-center gap-2 transition-transform duration-300 ease-out pointer-events-none"
                  style={{
                    transform: `translateX(${
                      (images.length <= 5
                        ? 0
                        : Math.min(Math.max(0, mobileCurrentIndex - 2), images.length - 5) * 14) * (locale === 'he' ? 1 : -1)
                    }px)`
                  }}
                >
                  {images.map((_, index) => {
                    const distance = Math.abs(index - mobileCurrentIndex);
                    let sizeClass = "scale-100 opacity-100";
                    if (distance === 1) sizeClass = "scale-[0.85] opacity-80";
                    if (distance === 2) sizeClass = "scale-75 opacity-60";
                    if (distance >= 3) sizeClass = "scale-50 opacity-30";

                    return (
                      <span
                        key={index}
                        className={cn(
                          'flex-shrink-0 block w-1.5 h-1.5 rounded-full transition-all duration-300 ease-in-out',
                          index === mobileCurrentIndex
                            ? 'bg-background-dark dark:bg-background'
                            : 'bg-background-dark/60 dark:bg-background/60',
                          sizeClass
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
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
                        {row.images[0].caption && (
                          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                            {row.images[0].caption}
                          </div>
                        )}
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
                            {image.caption && (
                              <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                                {image.caption}
                              </div>
                            )}
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
                            {image.caption && (
                              <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                                {image.caption}
                              </div>
                            )}
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
                        {row.images[2].caption && (
                          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                            {row.images[2].caption}
                          </div>
                        )}
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
                          {image.caption && (
                            <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                              {image.caption}
                            </div>
                          )}
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
                          {image.caption && (
                            <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                              {image.caption}
                            </div>
                          )}
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
                        {row.images[0].caption && (
                          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-sm px-3 py-2 text-center">
                            {row.images[0].caption}
                          </div>
                        )}
                      </ImageContainer>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Share + Show more/less + Last updated - hidden on mobile (share moved to page next to hours) */}
          {hasMoreImages && (
            <div className="hidden md:flex flex-col items-center gap-3 p-2 pb-0">
              <div className="grid grid-cols-3 items-start gap-4 w-full">
                {/* Share Button - same style as events/guides */}
                <div 
                  className={`flex ${locale === 'he' ? 'justify-end' : 'justify-start'}`}
                  style={{ order: locale === 'he' ? 3 : 1 }}
                >
                  {parkName && (
                    <Button
                      variant="brand"
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
                      className="px-2 py-1 rounded-lg font-medium flex-shrink-0"
                      aria-label={locale === 'he' ? 'שתף סקייטפארק' : 'Share skatepark'}
                    >
                      <Icon name="shareBold" className="w-5 h-5" />
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

