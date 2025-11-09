'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import type { IMultilingualText } from '@/lib/models/Settings';

interface HeroCarouselImage {
  desktopImageUrl?: string;
  tabletImageUrl?: string;
  mobileImageUrl?: string;
  link?: string;
  title?: string | IMultilingualText;
  subtitle?: string | IMultilingualText;
  ctaText?: string | IMultilingualText;
  textOverlay?: string | IMultilingualText;
  order: number;
}

interface HeroCarouselProps {
  images: HeroCarouselImage[];
  autoSlideInterval?: number; // in milliseconds
}

// Map Tailwind max-width classes to their rem/px values for positioning logic
const MAX_WIDTH_MAP = {
    mobile: 275, // max-w-[275px]
    md: 690,     // md:max-w-[690px]
    lg: 980      // lg:max-w-[980px]
};

// Assuming 1rem = 16px (standard for modern browsers)
const REM_TO_PX = 16;

export default function HeroCarousel({ images, autoSlideInterval = 5000 }: HeroCarouselProps) {
  const localeFromHook = useLocale();
  const pathname = usePathname();
  // Get locale from pathname as fallback to ensure it matches the URL
  const locale = (pathname?.split('/')?.[1] as 'en' | 'he') || (localeFromHook as 'en' | 'he') || 'en';
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // State and Ref for accurate width measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [slidePxWidth, setSlidePxWidth] = useState(MAX_WIDTH_MAP.mobile);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  // Helper function to get text in current locale
  const getLocalizedText = (text: string | IMultilingualText | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[locale] || text.en || text.he || '';
  };

  // --- Utility Functions ---
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };
  const handleSwipe = () => {
    const distance = touchStart - touchEnd;
    const swipeThreshold = 50;

    if (Math.abs(distance) > swipeThreshold) {
      if (distance > 0) {
        goToNext(); // Swipe left - next
      } else {
        goToPrevious(); // Swipe right - previous
      }
    }
  };

  const calculateWidths = useCallback(() => {
    if (!containerRef.current) return;

    const currentWidth = containerRef.current.clientWidth;
    setContainerWidth(currentWidth);

    // Determine the max-width based on the current breakpoint
    let newSlidePxWidth = MAX_WIDTH_MAP.mobile;
    let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'mobile';
    
    if (currentWidth >= 1024) { // Equivalent to lg breakpoint (often 1024px)
        newSlidePxWidth = MAX_WIDTH_MAP.lg;
        breakpoint = 'desktop';
    } else if (currentWidth >= 768) { // Equivalent to md breakpoint (often 768px)
        newSlidePxWidth = MAX_WIDTH_MAP.md;
        breakpoint = 'tablet';
    } else {
        breakpoint = 'mobile';
    }
    
    setCurrentBreakpoint(breakpoint);
    
    // The *actual* slide width is the minimum of the container width and the defined max-width
    // This is the key to matching the CSS
    setSlidePxWidth(Math.min(currentWidth, newSlidePxWidth));
  }, []);

  // Recalculate widths on mount and resize
  useEffect(() => {
    calculateWidths();
    window.addEventListener('resize', calculateWidths);
    return () => window.removeEventListener('resize', calculateWidths);
  }, [calculateWidths]);


  // Auto-slide, goToSlide, goToNext, goToPrevious, etc. (Omitted for brevity, assuming they are correct)
  useEffect(() => {
    if (images.length <= 1 || isHovering || isTransitioning) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [currentIndex, isHovering, isTransitioning, images.length, autoSlideInterval]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 800); 
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, goToSlide]);

  const goToPrevious = useCallback(() => {
    goToSlide((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, goToSlide]);
  
  // (Rest of the touch/keyboard handlers are also omitted for brevity)

  if (!images || images.length === 0) {
    return null;
  }

  const sortedImages = [...images].sort((a, b) => a.order - b.order);
  
  // Helper function to get the appropriate image URL based on breakpoint
  const getImageUrl = (image: HeroCarouselImage): string | undefined => {
    // Priority: current breakpoint image > desktop (fallback) > tablet > mobile
    switch (currentBreakpoint) {
      case 'mobile':
        return image.mobileImageUrl || image.desktopImageUrl || image.tabletImageUrl;
      case 'tablet':
        return image.tabletImageUrl || image.desktopImageUrl || image.mobileImageUrl;
      case 'desktop':
        return image.desktopImageUrl || image.tabletImageUrl || image.mobileImageUrl;
      default:
        return image.desktopImageUrl || image.tabletImageUrl || image.mobileImageUrl;
    }
  };
  const gapSizeRem = 1; // rem (equals gap-6)
  
  // The 'slideWidthPercent' is now effectively 100% of the slide's determined width
  const slideWidthPercent = 100; 
  
  /**
   * FIXED LOGIC: Calculate position based on pixel/rem values derived from the slide's actual size.
   * This maintains a fixed 1.5rem gap regardless of screen resize.
   */
// The core of the fix: revised position calculation
// The core of the fix: revised position calculation
const getSlideStyles = (slideIndex: number) => {
  if (containerWidth === 0) return {}; // Prevent render errors before measurement

  // gap-6 in Tailwind is typically 1.5rem (24px) - You defined gapSizeRem as 1rem (16px)
  // I will use your definition of 1rem = 16px. The `gap-6` className is 1.5rem, or 24px.
  // The provided Tailwind class name for gap-6 would imply a gap of 1.5rem or 24px
  const gapPx = gapSizeRem * REM_TO_PX; // 16px (based on your gapSizeRem = 1)
  
  // The distance the entire carousel needs to shift to bring the current slide (currentIndex) to the center.
  // This is the total distance from the start of the first slide up to the start of the current slide.
  const distanceToSlideStartPx = (currentIndex * slidePxWidth) + (currentIndex * gapPx);

  // The final transform value centers the current slide.
  // We want the *center* of the current slide to align with the *center* of the container.
  // Container Center: containerWidth / 2
  // Current Slide Center: distanceToSlideStartPx + (slidePxWidth / 2)
  // Translation needed: Container Center - Current Slide Center
  const centeringShiftPx = (containerWidth / 2) - (distanceToSlideStartPx + (slidePxWidth / 2));
  
  // Calculate the horizontal position of THIS specific slide (slideIndex) 
  // relative to the container's left edge (before any translation).
  const slideInitialPositionPx = (slideIndex * slidePxWidth) + (slideIndex * gapPx);
  
  // The final position is the slide's natural position + the centering shift.
  // We use `left: 0` on the individual slide and apply the total translation.
  const finalTransformX = slideInitialPositionPx + centeringShiftPx;

  return {
    left: '0', // Start all slides at the left edge of the slides container
    transform: `translateX(${finalTransformX}px)`,
    width: `${slidePxWidth}px`,
  };
};




return (
    <div className="w-full flex flex-col items-center">
      {/* Carousel Container */}
      <div
        ref={containerRef} 
        className="relative w-full h-screen max-h-[500px] min-h-[500px] md:min-h-[370px] md:max-h-[370px] lg:min-h-[520px] lg:max-h-[520px] 3xl:max-h-[520px] overflow-hidden"        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {/* Previous Arrow */}
            <button
              onClick={goToPrevious}
              className="sm:hidden absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
              aria-label="Previous slide"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 sm:w-6 sm:h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {/* Next Arrow */}
            <button
              onClick={goToNext}
              className="sm:hidden absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
              aria-label="Next slide"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 sm:w-6 sm:h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Gallery Wrapper */}
        <div className="relative w-full h-full overflow-hidden px-2 sm:px-4 md:px-6">
          {/* Slides Container - individual positioned slides */}
          <div className="relative w-full h-full">
            {sortedImages.map((image, index) => {
              const isActive = index === currentIndex;
              return (
                <div
                  key={index}
                  className={`absolute top-0 h-full max-h-[500px] md:max-h-[370px] lg:max-h-[520px] max-w-[275px] md:max-w-[690px] lg:max-w-[980px] flex items-center justify-center overflow-hidden transition-all duration-[300ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform ${
                    isActive ? 'opacity-100' : 'opacity-20'
                  }`}
                  style={{
                    width: `${slideWidthPercent}%`,
                    ...getSlideStyles(index)
                  }}
                >
                  {/* Slide Image - Full Bleed */}
                  {(() => {
                    const imageUrl = getImageUrl(image);
                    const altText = getLocalizedText(image.title) || getLocalizedText(image.textOverlay) || `Slide ${index + 1}`;
                    return imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={altText}
                        className="w-full h-full object-cover object-center"
                        loading="eager"
                        decoding="async"
                      />
                    ) : null;
                  })()}

                  {/* Slide Content Overlay */}
                  {(() => {
                    const titleText = getLocalizedText(image.title);
                    const subtitleText = getLocalizedText(image.subtitle);
                    const ctaText = getLocalizedText(image.ctaText);
                    const textOverlayText = getLocalizedText(image.textOverlay);
                    
                    if (!titleText && !subtitleText && !textOverlayText && !ctaText) return null;
                    
                    return (
                      <div 
                        key={`overlay-${index}-${currentIndex}`}
                        className={`flex items-end justify-center md:justify-start h-1/2 md:h-1/2 absolute bottom-0 left-0 right-0 px-5 pb-2 pt-8 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-[2] ${
                          isActive ? '' : 'opacity-0'
                        }`}>
                        {/* Content wrapper with animation */}
                        <div 
                          key={`content-${index}-${currentIndex}`}
                          className={`${
                            isActive ? 'opacity-0 animate-fadeUpIn' : ''
                          }`}
                          style={isActive ? { animationDelay: '0.5s' } : undefined}
                        >
                          {/* Layout: Button at start, Title in middle (row on lg+, column on md and below) */}
                          <div className="flex flex-col md:flex-row align-middle justify-center md:justify-start items-center gap-1 md:gap-4 mb-4">
                            {/* Button at start */}
                            {image.link && ctaText && (
                              <Link
                                href={image.link}
                                className="order-last md:order-first text-sm inline-block px-4 py-2 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 transform shadow-lg hover:shadow-xl whitespace-nowrap order-1 lg:order-1 lg:col-start-1 lg:justify-self-start"
                              >
                                {ctaText}
                              </Link>
                            )}
                            {/* Title in middle - centered on lg+ */}
                            {titleText && (
                              <h2 className="text-white text-lg font-medium leading-[1.1] tracking-[-0.02em] text-start order-2 lg:order-2 lg:col-start-2 lg:justify-self-center lg:text-center navHighShadow " style={{ textShadow: '0px 0px 5px rgba(0,0,0,0.6)' }}>
                                {titleText}
                              </h2>
                            )}
                            {/* Subtitle - shown in same row/column */}
                            {subtitleText && (
                              <p className="text-sm font-medium leading-[1.4] text-white/90 text-start order-3 lg:order-3 lg:col-start-2 lg:justify-self-center lg:text-center navHighShadow">
                                {subtitleText}
                              </p>
                            )}
                            {/* Empty spacer on right side for lg+ to balance the button and center title */}
                            <div className="hidden order-first lg:block lg:col-start-3"></div>
                          </div>
                          {/* Fallback for old textOverlay field */}
                          {!titleText && !subtitleText && textOverlayText && (
                            <p className="text-sm sm:text-base md:text-lg lg:text-[21px] font-normal leading-[1.4] text-white/90 max-w-full sm:max-w-md md:max-w-lg lg:max-w-[600px] mb-4 sm:mb-5 md:mb-6 text-start mx-auto">
                              {textOverlayText}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination Dots - Below Carousel */}
      <div className="w-full flex gap-2 sm:gap-2.5 md:gap-3 items-center justify-center py-4 sm:py-5 md:py-6">
        {sortedImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'w-6 sm:w-8 md:w-6 h-1.5 sm:h-2 md:h-2 bg-black dark:bg-white rounded'
                : 'w-1.5 sm:w-2 md:w-2 h-1.5 sm:h-2 md:h-2 bg-black/40 dark:bg-white/40 hover:bg-black/60 dark:hover:bg-white/60 hover:scale-110'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentIndex ? 'true' : undefined}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

