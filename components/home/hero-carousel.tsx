'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import type { IMultilingualText } from '@/lib/models/Settings';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { optimizeCloudinaryUrl, HERO_CAROUSEL_WIDTHS } from '@/lib/cloudinary-utils';

// Skeleton: same layout as carousel container, with 3 slide-like placeholders
export function HeroCarouselSkeleton() {
  return (
    <div className="pt-[15px] bg-background dark:bg-background-dark w-full flex flex-col items-center">
      <div
        className="relative w-full h-screen max-h-[500px] min-h-[500px] md:min-h-[370px] md:max-h-[370px] lg:min-h-[520px] lg:max-h-[520px] 3xl:max-h-[520px] overflow-hidden bg-background dark:bg-background-dark pt-10 "
        aria-hidden
      >
        <div className="relative max-w-[2000px] mx-auto w-full h-full px-2 sm:px-4 md:px-6 flex items-end justify-center gap-5">
          {/* 3 slide-like placeholders: narrower on mobile so all 3 fit, match carousel slide size on md+ */}
          <div className="flex-none w-[275px] sm:w-[220px] md:w-[690px] md:max-w-[690px] lg:w-[980px] lg:max-w-[980px] h-[97%] min-h-[485px] md:min-h-[358px] lg:min-h-[505px] max-h-[485px] md:max-h-[358px] lg:max-h-[505px] bg-card dark:bg-card-dark  opacity-90" />
          <div className="flex-none w-[275px] sm:w-[220px] md:w-[690px] md:max-w-[690px] lg:w-[980px] lg:max-w-[980px] h-[97%] min-h-[500px] md:min-h-[373px] lg:min-h-[520px] max-h-[500px] md:max-h-[373px] lg:max-h-[512px] bg-card dark:bg-card-dark  "
          >
            <LoadingSpinner size={36} variant="default" />
          </div>
          <div className="flex-none w-[275px] sm:w-[220px] md:w-[690px] md:max-w-[690px] lg:w-[980px] lg:max-w-[980px] h-[97%] min-h-[485px] md:min-h-[358px] lg:min-h-[505px] max-h-[485px] md:max-h-[358px] lg:max-h-[505px] bg-card dark:bg-card-dark  opacity-90" />
        </div>
      </div>
      <div className="w-full flex gap-2 sm:gap-2.5 md:gap-3 items-center justify-center py-1 sm:py-2 md:py-3">
        <div className="w-1.5 sm:w-2 md:w-2 h-1.5 sm:h-2 md:h-2 bg-gray-200 dark:bg-white/30 rounded-full" />
        <div className="w-1.5 sm:w-2 md:w-2 h-1.5 sm:h-2 md:h-2 bg-gray-200 dark:bg-white/30 rounded-full" />
        <div className="w-1.5 sm:w-2 md:w-2 h-1.5 sm:h-2 md:h-2 bg-gray-200 dark:bg-white/30 rounded-full" />
        <div className="w-6 sm:w-8 md:w-6 h-1.5 sm:h-2 md:h-2 bg-gray-300 dark:bg-bg-white rounded-full" />
      </div>
    </div>
  );
}

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

const MAX_WIDTH_MAP = {
    mobile: 275, 
    md: 690,     
    lg: 980      
};

const REM_TO_PX = 16;
const GAP_REM = 1.5; // 24px

const CarouselSlideImage = memo(function CarouselSlideImage({
  imageUrl,
  altText,
  isEager,
}: {
  imageUrl: string;
  altText: string;
  isEager: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [imageUrl]);

  useEffect(() => {
    const check = () => {
      if (!imgRef.current) return false;
      const img = imgRef.current;
      if (img.complete && img.naturalHeight !== 0) {
        setIsLoaded(true);
        setHasError(false);
        return true;
      }
      if (img.complete && img.naturalHeight === 0) {
        setIsLoaded(true);
        setHasError(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const t1 = setTimeout(check, 100);
    const t2 = setTimeout(() => {
      if (!imgRef.current) return;
      const img = imgRef.current;
      if (!isLoaded && !hasError && (!img.complete || img.naturalHeight === 0)) {
        setIsLoaded(true);
        setHasError(true);
      }
    }, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [imageUrl, isLoaded, hasError]);

  const onLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };
  const onError = () => {
    setIsLoaded(true);
    setHasError(true);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
          <LoadingSpinner size={36} variant="default" />
        </div>
      )}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={altText}
        className={`w-full h-full object-cover object-top transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={isEager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
});

// --- Define Animation Speeds in ms ---
const NORMAL_SPEED = 600;
const FAST_JUMP_SPEED = 500; // Fast-forward/Rewind effect speed
const INSTANT_JUMP_SPEED = 0; // New: Speed for transitioning to the fake slide

export default function HeroCarousel({ images, autoSlideInterval = 3000 }: HeroCarouselProps) {
  const localeFromHook = useLocale();
  const pathname = usePathname();
  const locale = (pathname?.split('/')?.[1] as 'en' | 'he') || (localeFromHook as 'en' | 'he') || 'en';
  
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [currentViewIndex, setCurrentViewIndex] = useState(1);
  
  const [isHovering, setIsHovering] = useState(false);
  // Controls the transition speed: 300ms, 150ms (fast jump), or 0ms (instant jump)
  const [transitionSpeed, setTransitionSpeed] = useState(NORMAL_SPEED); 

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [slidePxWidth, setSlidePxWidth] = useState(MAX_WIDTH_MAP.mobile);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  
  const getLocalizedText = (text: string | IMultilingualText | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[locale] || text.en || text.he || '';
  };

  // --- Slides Setup (Unchanged) ---
  const sortedImages = useMemo(() => [...images].sort((a, b) => a.order - b.order), [images]);

  const slides = useMemo(() => {
    if (sortedImages.length <= 1) return sortedImages;
    const first = sortedImages[0];
    const last = sortedImages[sortedImages.length - 1];
    return [last, ...sortedImages, first];
  }, [sortedImages]);
  
  const realSlidesCount = sortedImages.length;
  const totalSlidesCount = slides.length; 

  // --- Width Calculation: ResizeObserver on container only (not window), throttled via rAF to avoid scroll jank
  const updateWidthsFromContainer = useCallback(() => {
    if (!containerRef.current) return;
    const currentWidth = containerRef.current.clientWidth;
    setContainerWidth(currentWidth);
    let newSlidePxWidth = MAX_WIDTH_MAP.mobile;
    let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'mobile';
    if (currentWidth >= 1024) {
      newSlidePxWidth = MAX_WIDTH_MAP.lg;
      breakpoint = 'desktop';
    } else if (currentWidth >= 768) {
      newSlidePxWidth = MAX_WIDTH_MAP.md;
      breakpoint = 'tablet';
    }
    setCurrentBreakpoint(breakpoint);
    setSlidePxWidth(Math.min(currentWidth, newSlidePxWidth));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number | null = null;
    let lastWidth = 0;
    const onResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        if (w === lastWidth) return;
        lastWidth = w;
        setContainerWidth(w);
        let newSlidePxWidth = MAX_WIDTH_MAP.mobile;
        let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'mobile';
        if (w >= 1024) {
          newSlidePxWidth = MAX_WIDTH_MAP.lg;
          breakpoint = 'desktop';
        } else if (w >= 768) {
          newSlidePxWidth = MAX_WIDTH_MAP.md;
          breakpoint = 'tablet';
        }
        setCurrentBreakpoint(breakpoint);
        setSlidePxWidth(Math.min(w, newSlidePxWidth));
      });
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    // Initial measure (ResizeObserver may fire async)
    updateWidthsFromContainer();
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [updateWidthsFromContainer]);

  // --- Core Navigation and Loop Logic with Fast Jump ---

  const goToViewIndex = useCallback((targetViewIndex: number) => {
    if (totalSlidesCount <= 2) {
        // Handle case with 0 or 1 real slides (no looping needed)
        setCurrentViewIndex(targetViewIndex);
        setCurrentIndex(targetViewIndex - 1);
        setTransitionSpeed(NORMAL_SPEED);
        return;
    }
    
    // Check if the target is a fake slide (or triggers the next state to be a fake slide)
    const isMovingToFakeSlide = targetViewIndex === totalSlidesCount - 1 || targetViewIndex === 0;
    
    // 1. Set the transition speed for the initial move
    setTransitionSpeed(isMovingToFakeSlide ? INSTANT_JUMP_SPEED : NORMAL_SPEED);
    setCurrentViewIndex(targetViewIndex);

    let jumpIndex = -1;
    let newRealIndex = -1;

    // Determine if a loop jump is needed based on the new target index
    if (targetViewIndex === totalSlidesCount - 1) { // Hit FAKE FIRST
        jumpIndex = 1; // Jump to REAL FIRST
        newRealIndex = 0;
    } 
    else if (targetViewIndex === 0) { // Hit FAKE LAST
        jumpIndex = totalSlidesCount - 2; // Jump to REAL LAST
        newRealIndex = realSlidesCount - 1;
    }
    else {
        // We are on a real slide (index 1 to N)
        newRealIndex = targetViewIndex - 1;
    }
    
    setCurrentIndex(newRealIndex);

    // Handle the fast-forward/rewind jump
    if (jumpIndex !== -1) {
        // The delay for the jump depends on the preceding transition speed
        const precedingTransitionDuration = isMovingToFakeSlide ? INSTANT_JUMP_SPEED : NORMAL_SPEED;
        
        const transitionTimeout = setTimeout(() => {
          // 2. Set transition to FAST_JUMP_SPEED for the visible rewind
          setTransitionSpeed(FAST_JUMP_SPEED); 
          // 3. Jump immediately to the real slide
          setCurrentViewIndex(jumpIndex); 
          
          // 4. Reset to NORMAL_SPEED immediately after the jump state update
          const reEnableTimeout = setTimeout(() => {
            setTransitionSpeed(NORMAL_SPEED);
          }, 50); // Small delay to ensure the fast transition takes effect
          
          return () => clearTimeout(reEnableTimeout);

        }, precedingTransitionDuration); // Wait for the transition to the fake slide

        return () => clearTimeout(transitionTimeout);
    }

  }, [realSlidesCount, totalSlidesCount]);
  
  const goToNext = useCallback(() => {
    // If we are on the REAL LAST slide (view index N), the next move (to view index N+1, the fake slide) 
    // must be instant to avoid the slide-in effect, before the rewind happens.
    const target = currentViewIndex + 1;
    goToViewIndex(target);
  }, [currentViewIndex, goToViewIndex]);

  const goToPrevious = useCallback(() => {
    // If we are on the REAL FIRST slide (view index 1), the next move (to view index 0, the fake slide) 
    // must be instant to avoid the slide-in effect, before the fast forward happens.
    const target = currentViewIndex - 1;
    goToViewIndex(target);
  }, [currentViewIndex, goToViewIndex]);
  
  const goToSlide = useCallback((realIndex: number) => {
    // For pagination, we always use the normal transition speed
    setTransitionSpeed(NORMAL_SPEED);
    goToViewIndex(realIndex + 1);
  }, [goToViewIndex]);

  // Auto-slide 
  useEffect(() => {
    if (realSlidesCount <= 1 || isHovering || transitionSpeed !== NORMAL_SPEED) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [goToNext, isHovering, transitionSpeed, realSlidesCount, autoSlideInterval]);

  // Initial setup: ensure speed is set correctly on mount
  useEffect(() => {
    setTransitionSpeed(NORMAL_SPEED);
  }, []);
  
  // --- Rendering Logic (Only getSlideStyles needs the new transitionSpeed) ---

  if (!images || images.length === 0) {
    return null;
  }
  
  const getImageUrl = (image: HeroCarouselImage): string | undefined => {
    let url: string | undefined;
    switch (currentBreakpoint) {
      case 'mobile':
        url = image.mobileImageUrl || image.desktopImageUrl || image.tabletImageUrl;
        break;
      case 'tablet':
        url = image.tabletImageUrl || image.desktopImageUrl || image.mobileImageUrl;
        break;
      case 'desktop':
        url = image.desktopImageUrl || image.tabletImageUrl || image.mobileImageUrl;
        break;
      default:
        url = image.desktopImageUrl || image.tabletImageUrl || image.mobileImageUrl;
    }
    if (!url) return undefined;
    const width =
      currentBreakpoint === 'desktop'
        ? HERO_CAROUSEL_WIDTHS.desktop
        : currentBreakpoint === 'tablet'
          ? HERO_CAROUSEL_WIDTHS.tablet
          : HERO_CAROUSEL_WIDTHS.mobile;
    return optimizeCloudinaryUrl(url, { width, crop: 'fill' });
  };
  
  const slideWidthPercent = 100; 
  
  const getSlideStyles = (slideIndex: number) => {
    if (containerWidth === 0) return {};

    const gapPx = GAP_REM * REM_TO_PX; 
    
    const indexToCenter = currentViewIndex; 

    const distanceToSlideStartPx = (indexToCenter * slidePxWidth) + (indexToCenter * gapPx);
    const centeringShiftPx = (containerWidth / 2) - (distanceToSlideStartPx + (slidePxWidth / 2));
    const slideInitialPositionPx = (slideIndex * slidePxWidth) + (slideIndex * gapPx);
    const finalTransformX = slideInitialPositionPx + centeringShiftPx;
    
    // Dynamically set transition duration using the state variable
    const transitionDuration = `${transitionSpeed}ms`;

    return {
      left: '0', 
      transform: `translateX(${finalTransformX}px)`,
      width: `${slidePxWidth}px`,
      // Use transitionSpeed state for dynamic control
      transition: `transform ${transitionDuration} ease-in-out, opacity 300ms ease-in-out`,
    };
  };

  // --- Touch Handlers (Unchanged) ---
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
        goToNext(); 
      } else {
        goToPrevious(); 
      }
    }
  };
  
  // --- JSX Rendering (Unchanged) ---
  return (
    <div className="transform-gpu w-full flex flex-col items-center">
      {/* Carousel Container */}
      <div
        ref={containerRef} 
        className="relative w-full h-screen max-h-[500px] min-h-[500px] md:min-h-[370px] md:max-h-[370px] lg:min-h-[520px] lg:max-h-[520px] 3xl:max-h-[520px] overflow-hidden"        
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Arrows */}
        {realSlidesCount > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="md:hidden absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
              aria-label="Previous slide"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button
              onClick={goToNext}
              className="md:hidden absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
              aria-label="Next slide"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </>
        )}

        {/* Gallery Wrapper */}
        <div className="relative max-w-[2000px] mx-auto w-full h-full overflow-hidden px-2 sm:px-4 md:px-6">
          <div className="relative w-full h-full">
            {slides.map((image, viewIndex) => {
              const isRealSlide = viewIndex > 0 && viewIndex < totalSlidesCount - 1;
              const realIndex = isRealSlide ? viewIndex - 1 : -1;
              const isActive = realIndex === currentIndex;
              
              return (
                <div
                  key={viewIndex}
                  className={`absolute bottom-0 max-h-[500px] md:max-h-[370px] lg:max-h-[520px] max-w-[275px] md:max-w-[690px] lg:max-w-[980px] flex items-center justify-center overflow-hidden transition-none ${
                    isActive ? 'opacity-100 h-full' : 'opacity-20 h-[97%]'
                  }`}
                  style={{
                    width: `${slideWidthPercent}%`,
                    ...getSlideStyles(viewIndex) 
                  }}
                >
                  {/* Slide Image - Full Bleed */}
                  {(() => {
                    const imageUrl = getImageUrl(image);
                    const altText = isRealSlide ? (getLocalizedText(image.title) || `Slide ${realIndex + 1}`) : "Carousel transition image";
                    return imageUrl ? (
                      <CarouselSlideImage
                        imageUrl={imageUrl}
                        altText={altText}
                        isEager={viewIndex === currentViewIndex}
                      />
                    ) : null;
                  })()}

                  {/* Slide Content Overlay - Only render content for real slides */}
                  {isRealSlide && (() => {
                    const titleText = getLocalizedText(image.title);
                    const subtitleText = getLocalizedText(image.subtitle);
                    const ctaText = getLocalizedText(image.ctaText);
                    const textOverlayText = getLocalizedText(image.textOverlay);
                    
                    if (!titleText && !subtitleText && !textOverlayText && !ctaText) return null;
                    
                    return (
                      <div 
                        key={`overlay-${viewIndex}-${currentViewIndex}`}
                        className={`flex items-end justify-center md:justify-start h-1/2 absolute bottom-0 left-0 right-0 px-5 pb-2 pt-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent md:from-black/90 md:via-black/30 md:to-transparent z-[2] transition-opacity duration-300 ${
                          isActive ? 'opacity-100' : 'opacity-[0.9]'
                        }`}>
                        {/* Content wrapper with animation */}
                        <div 
                          key={`content-${viewIndex}-${currentViewIndex}`}
                          className={`${
                            isActive ? 'opacity-0 animate-fadeUpIn' : ''
                          }`}
                          style={isActive ? { animationDelay: '0.5s' } : undefined}
                        >
                          {/* Layout: Button at start, Title in middle (row on lg+, column on md and below) */}
                          <div className="flex flex-col md:flex-row align-middle justify-center md:justify-start items-center gap-1 md:gap-4 mb-2 md:mb-4">
                            {/* Button at start */}
                            {image.link && ctaText && (
                              <Link href={image.link} className="order-last md:order-first text-sm inline-block px-4 py-2 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 transform shadow-lg hover:shadow-xl whitespace-nowrap order-1 lg:order-1 lg:col-start-1 lg:justify-self-start">{ctaText}</Link>
                            )}
                            {/* Title in middle - centered on lg+ */}
                            {titleText && (
                              <h2 className="text-white text-lg font-medium leading-[1.1] tracking-[-0.02em] text-start order-2 lg:order-2 lg:col-start-2 lg:justify-self-center lg:text-center md:navHighShadow " style={{ textShadow: '0px 0px 5px rgba(0,0,0,0.6)' }}>{titleText}</h2>
                            )}
                            {/* Subtitle - shown in same row/column */}
                            {subtitleText && (
                              <p className="text-sm font-medium leading-[1.4] text-white/90 text-start order-3 lg:order-3 lg:col-start-2 lg:justify-self-center lg:text-center navHighShadow">{subtitleText}</p>
                            )}
                            {/* Empty spacer on right side for lg+ to balance the button and center title */}
                            <div className="hidden order-first lg:block lg:col-start-3"></div>
                          </div>
                          {/* Fallback for old textOverlay field */}
                          {!titleText && !subtitleText && textOverlayText && (
                            <p className="text-sm sm:text-base md:text-lg lg:text-[21px] font-normal leading-[1.4] text-white/90 max-w-full sm:max-w-md md:max-w-lg lg:max-w-[600px] mb-4 sm:mb-5 md:mb-6 text-start mx-auto">{textOverlayText}</p>
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
      <div className="w-full flex rtl:flex-row-reverse gap-2 sm:gap-2.5 md:gap-3 items-center justify-center py-1 sm:py-2 md:py-3">
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