'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import FullscreenImageViewer from './FullscreenImageViewer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ImageSliderProps {
  images: { url: string; alt?: string; isFeatured?: boolean }[];
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

// Create a memoized image component to handle loading state
const OptimizedImage = React.memo(({ 
  url, 
  index, 
  alt,
  onClick 
}: { 
  url: string; 
  index: number; 
  alt?: string;
  onClick: (index: number, e: React.MouseEvent) => void;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-lg bg-gray-50/75 dark:bg-gray-900/75">
          <LoadingSpinner />
        </div>
      )}
      <img
        src={getOptimizedImageUrl(url, 800, 90)}
        alt={alt || `Image ${index + 1}`}
        className={cn(
          'w-full h-full object-cover select-none transition-opacity duration-300',
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

const ImageSlider = ({ images, className }: ImageSliderProps) => {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [showRightButton, setShowRightButton] = useState(false);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const touchStartTime = useRef(0);
  const touchEndTime = useRef(0);
  const touchMoved = useRef(false);

  useEffect(() => {
    const isTouchCapable = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 || 
                          (navigator as any).msMaxTouchPoints > 0;
    setIsTouchDevice(isTouchCapable);
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      setTimeout(() => {
        if (sliderRef.current) {
          sliderRef.current.scrollLeft = 0;
        }
      }, 100);
    }
  }, [images]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      if (slider.scrollLeft !== 0 && !showRightButton) {
        setShowRightButton(true);
      }
    };

    slider.addEventListener('scroll', handleScroll);
    return () => {
      slider.removeEventListener('scroll', handleScroll);
    };
  }, [showRightButton]);

  const checkScrollPosition = () => {
    if (!sliderRef.current) return { isAtStart: false, isAtEnd: true };
    
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    const maxScroll = scrollWidth - clientWidth;
    
    return {
      isAtStart: Math.abs(scrollLeft) <= 10,
      isAtEnd: Math.abs(scrollLeft) >= maxScroll - 10,
    };
  };

  const handleMouseDown = (_e: React.MouseEvent) => {
    if (isTouchDevice) return;
    isDragging.current = true;
    startX.current = _e.pageX;
    scrollLeft.current = sliderRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (_e: React.MouseEvent) => {
    if (!isDragging.current || isTouchDevice) return;
    _e.preventDefault();
    if (!sliderRef.current) return;
    
    const x = _e.pageX;
    const walk = (startX.current - x) * 0.5;
    sliderRef.current.scrollLeft = scrollLeft.current + walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (_e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchMoved.current = false;
    startX.current = _e.touches[0].pageX;
  };

  const handleTouchMove = (_e: React.TouchEvent) => {
    touchMoved.current = true;
  };

  const handleTouchEnd = (_e: React.TouchEvent) => {
    touchEndTime.current = Date.now();
  };

  const handleImageClick = (index: number, _e: React.MouseEvent) => {
    if (!isTouchDevice && isDragging.current) {
      return;
    }
    
    if (isTouchDevice && touchMoved.current) {
      return;
    }
    
    setSelectedImageIndex(index);
    setIsFullscreenOpen(true);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    
    const { isAtStart, isAtEnd } = checkScrollPosition();

    if (direction === 'right' && !showRightButton) {
      setShowRightButton(true);
    }
    
    if ((direction === 'right' && isAtEnd) || (direction === 'left' && isAtStart)) {
      setAnimationDirection(direction);
      setIsAnimating(true);
      
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationDirection(null);
      }, 400);
      
      return;
    }
    
    const amount = 400;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? amount : -amount,
      behavior: 'smooth'
    });
  };

  if (!images || images.length === 0) {
    return (
      <div className="relative h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No images available</span>
      </div>
    );
  }

  return (
    <div className={cn('w-full relative', className)} style={{ direction: 'rtl' }}>
      <div className="relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] overflow-visible">
        <div className="container w-fit max-w-[100vw] mx-auto relative">
          <div 
            ref={sliderRef}
            className={cn(
              "flex gap-4 overflow-x-auto overflow-y-visilbe scroll-smooth py-8 -my-4 lg:-mx-2 pl-7 pr-4",
              "scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]",
              "[&::-webkit-scrollbar]:hidden",
              "relative saturate-[125%] w-full lg:max-w-[100vw]",
              "select-none",
              isTouchDevice ? "overflow-x-scroll" : "",
              isAnimating && animationDirection === 'left' && "animate-bounce-left",
              isAnimating && animationDirection === 'right' && "animate-bounce-right"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ userSelect: 'none' }}
          >
            {images.map((image, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-[350px] h-[230px] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2 border-white dark:border-gray-800 hover:scale-[1.02] hover:saturate-150 shadow-lg hover:shadow-xl "
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  willChange: 'transform',
                }}
              >
                <OptimizedImage 
                  url={image.url} 
                  index={index} 
                  alt={image.alt}
                  onClick={handleImageClick}
                />
              </div>
            ))}
          </div>

          {(!isTouchDevice || (typeof window !== 'undefined' && window.innerWidth > 768)) && (
            <>
              <button
                onClick={() => scroll('right')}
                className="absolute top-1/2 -translate-y-1/2 left-12 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 transition-colors flex items-center justify-center text-white backdrop-blur-sm z-10 shadow-lg"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {showRightButton && (
                <button
                  onClick={() => scroll('left')}
                  className="absolute top-1/2 -translate-y-1/2 right-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 transition-colors flex items-center justify-center text-white backdrop-blur-sm z-10 shadow-lg"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <FullscreenImageViewer
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </div>
  );
};

export default ImageSlider;

