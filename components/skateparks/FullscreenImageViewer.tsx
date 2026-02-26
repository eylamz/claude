'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Create inline animation styles
const animationStylesElement = (
  <style>
    {`
      @keyframes slideUpFadeIn {
        0% {
          opacity: 0;
          transform: translate(-50%, 20px);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      @keyframes fadeOut {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      .helper-text-animation {
        animation: slideUpFadeIn 0.5s ease-out forwards;
      }
      .helper-text-fade-out {
        animation: fadeOut 0.5s ease-out forwards;
      }
    `}
  </style>
);

interface FullscreenImageViewerProps {
  images: { url: string; alt?: string; caption?: string }[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

// Creates optimized versions of Cloudinary images for thumbnails
const getOptimizedThumbnailUrl = (
  originalUrl: string,
  width: number = 100,
  quality: number = 80
): string => {
  if (originalUrl && originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_${width},h_${width},c_fill,q_${quality}/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

// Creates high-quality versions of Cloudinary images for zooming
const getHighQualityImageUrl = (originalUrl: string, quality: number = 100): string => {
  if (originalUrl && originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/q_${quality}/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

const FullscreenImageViewer = ({
  images,
  initialIndex,
  isOpen,
  onClose,
}: FullscreenImageViewerProps) => {
  const t = useTranslations('skateparks.imageViewer');
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showHelperText, setShowHelperText] = useState(false);
  const [isHelperFadingOut, setIsHelperFadingOut] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const mainImageWrapperRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const startScaleRef = useRef(1);
  const touchTimeoutRef = useRef<number | null>(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const minSwipeDistance = 50;
  const highQualityImageRef = useRef<HTMLImageElement | null>(null);
  const lastClickTimeRef = useRef(0);
  const lastClickPositionRef = useRef({ x: 0, y: 0 });
  const doubleClickDelay = 300;

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const checkTouchDevice = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(hasTouch);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetZoom();
      setIsHighQualityLoaded(false);
      setImageLoading(true);
      setShowHelperText(true);
      setIsHelperFadingOut(false);

      const helperTextTimer = setTimeout(() => {
        setIsHelperFadingOut(true);
        setTimeout(() => {
          setShowHelperText(false);
        }, 500);
      }, 5000);

      if (images[initialIndex]) {
        const img = new Image();
        img.src = getHighQualityImageUrl(images[initialIndex].url);
        img.onload = () => {
          setIsHighQualityLoaded(true);
        };
        highQualityImageRef.current = img;
      }

      return () => {
        clearTimeout(helperTextTimer);
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }
      };
    }
  }, [initialIndex, isOpen, images, resetZoom]);

  useEffect(() => {
    setImageLoading(true);
  }, [currentIndex]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'scroll';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'ArrowLeft':
          if (scale === 1) {
            setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            resetZoom();
          }
          break;
        case 'ArrowRight':
          if (scale === 1) {
            setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            resetZoom();
          }
          break;
        case 'Escape':
          onClose();
          break;
        case '0':
        case 'r':
          resetZoom();
          break;
        case '+':
          handleZoom(Math.min(scale + 0.5, 4));
          break;
        case '-':
          handleZoom(Math.max(scale - 0.5, 1));
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose, scale, resetZoom]);

  const navigate = useCallback(
    (direction: 'prev' | 'next', e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      if (scale > 1) return;

      if (direction === 'prev') {
        setCurrentIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : images.length - 1;
          preloadHighQualityImage(newIndex);
          return newIndex;
        });
      } else {
        setCurrentIndex((prev) => {
          const newIndex = prev < images.length - 1 ? prev + 1 : 0;
          preloadHighQualityImage(newIndex);
          return newIndex;
        });
      }
      resetZoom();
      setImageLoading(true);
    },
    [images.length, resetZoom, scale]
  );

  const preloadHighQualityImage = (index: number) => {
    setIsHighQualityLoaded(false);
    if (images[index]) {
      const img = new Image();
      img.src = getHighQualityImageUrl(images[index].url);
      img.onload = () => {
        setIsHighQualityLoaded(true);
      };
      highQualityImageRef.current = img;
    }
  };

  const handleZoom = (newScale: number) => {
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleZoom(Math.min(scale + 0.5, 4));
  };

  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleZoom(Math.max(scale - 0.5, 1));
  };

  const isClickOnMainImage = (element: EventTarget): boolean => {
    if (!imageRef.current) return false;
    return element === imageRef.current || imageRef.current.contains(element as Node);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.stopPropagation();
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      lastPositionRef.current = { ...position };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scale > 1) {
      e.preventDefault();
      const deltaX = e.clientX - panStartRef.current.x;
      const deltaY = e.clientY - panStartRef.current.y;
      setPosition({
        x: lastPositionRef.current.x + deltaX,
        y: lastPositionRef.current.y + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (isSwiping && e.touches.length === 1 && scale === 1) {
      touchEndXRef.current = e.touches[0].clientX;
    }
  };

  const handleSwipeEnd = () => {
    if (isSwiping && scale === 1) {
      const distanceX = touchEndXRef.current - touchStartXRef.current;
      const isLeftSwipe = distanceX < -minSwipeDistance;
      const isRightSwipe = distanceX > minSwipeDistance;

      if (isLeftSwipe) {
        navigate('prev');
      } else if (isRightSwipe) {
        navigate('next');
      }

      setIsSwiping(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isClickOnMainImage(e.target)) {
        if (scale === 1) {
          touchStartXRef.current = touch.clientX;
          touchEndXRef.current = touch.clientX;
          touchStartYRef.current = touch.clientY;
          setIsSwiping(true);
        }
      }
    }

    if (e.touches.length === 2) {
      e.stopPropagation();
      e.preventDefault();
      setIsSwiping(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      pinchStartDistanceRef.current = distance;
      startScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      e.stopPropagation();
      setIsPanning(true);
      setIsSwiping(false);
      panStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      lastPositionRef.current = { ...position };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isSwiping && scale === 1) {
      touchEndXRef.current = e.touches[0].clientX;
    }

    if (isClickOnMainImage(e.target)) {
      handleSwipeMove(e);
    }

    if (e.touches.length === 2) {
      e.stopPropagation();
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const pinchScale = distance / pinchStartDistanceRef.current;
      let newScale = Math.max(1, Math.min(4, startScaleRef.current * pinchScale));
      setScale(newScale);

      if (newScale > 1) {
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        if (imageContainerRef.current) {
          const rect = imageContainerRef.current.getBoundingClientRect();
          const offsetX = centerX - (rect.left + rect.width / 2);
          const offsetY = centerY - (rect.top + rect.height / 2);
          setPosition({
            x: -offsetX * (newScale / startScaleRef.current - 1) + lastPositionRef.current.x,
            y: -offsetY * (newScale / startScaleRef.current - 1) + lastPositionRef.current.y,
          });
        }
      } else {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isPanning && scale > 1) {
      e.preventDefault();
      e.stopPropagation();
      const deltaX = e.touches[0].clientX - panStartRef.current.x;
      const deltaY = e.touches[0].clientY - panStartRef.current.y;
      setPosition({
        x: lastPositionRef.current.x + deltaX,
        y: lastPositionRef.current.y + deltaY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isClickOnMainImage(e.target)) {
      handleSwipeEnd();
    }

    if (e.touches.length === 1 && pinchStartDistanceRef.current > 0) {
      panStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      lastPositionRef.current = { ...position };
      pinchStartDistanceRef.current = 0;
    } else if (e.touches.length === 0) {
      setIsPanning(false);
      pinchStartDistanceRef.current = 0;
    }
  };

  const getImageSrc = () => {
    if (!images[currentIndex]) return '';
    return isHighQualityLoaded && scale > 1.5
      ? getHighQualityImageUrl(images[currentIndex].url)
      : images[currentIndex].url;
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    const currentTime = new Date().getTime();
    const clickPosition = { x: e.clientX, y: e.clientY };
    const distanceBetweenClicks = Math.hypot(
      clickPosition.x - lastClickPositionRef.current.x,
      clickPosition.y - lastClickPositionRef.current.y
    );

    if (currentTime - lastClickTimeRef.current < doubleClickDelay && distanceBetweenClicks < 30) {
      e.preventDefault();
      e.stopPropagation();
      if (scale > 1) {
        resetZoom();
      } else {
        handleZoom(2.5);
        const rect = imageContainerRef.current.getBoundingClientRect();
        const offsetX = clickPosition.x - (rect.left + rect.width / 2);
        const offsetY = clickPosition.y - (rect.top + rect.height / 2);
        setPosition({
          x: -offsetX * (2.5 - 1),
          y: -offsetY * (2.5 - 1),
        });
      }
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = currentTime;
      lastClickPositionRef.current = clickPosition;
    }
  };

  if (!isOpen) return null;

  // Render via portal into document.body so the viewer sits above HeaderNav/MobileNav (fixed z-50)
  const overlay = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center select-none"
      onClick={handleBackgroundClick}
    >
      {animationStylesElement}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-50"
        aria-label={t('closeFullscreen')}
      >
        <X className="w-8 h-8" />
      </button>

      <div
        className="absolute top-4 left-4 text-white/80 z-50 flex flex-col items-end gap-2 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-row-reverse items-center justify-left gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomOut(e);
            }}
            className={`p-1 rounded-full ${scale <= 1 ? 'text-white/40 cursor-not-allowed' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
            disabled={scale <= 1}
            aria-label={t('zoomOut')}
          >
            <ZoomOut className="w-6 h-6" />
          </button>
          <span className="text-white/80 min-w-[2.5rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomIn(e);
            }}
            className={`p-1 rounded-full ${scale >= 4 ? 'text-white/40 cursor-not-allowed' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
            disabled={scale >= 4}
            aria-label={t('zoomIn')}
          >
            <ZoomIn className="w-6 h-6" />
          </button>
          {scale > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              className="ml-2 text-sm text-white/80 hover:text-white hover:underline transition-colors"
            >
              {t('reset')}
            </button>
          )}
        </div>

        <div className="text-white/80 text-sm pl-10">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={imageContainerRef}
          className="relative flex items-center justify-center w-full h-full"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div
            ref={mainImageWrapperRef}
            className="relative max-h-[90vh] max-w-[90vw] flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            style={{
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <LoadingSpinner />
                </div>
              )}

              <img
                ref={imageRef}
                src={getImageSrc()}
                alt={images[currentIndex]?.alt || `Image ${currentIndex + 1}`}
                className={`max-h-[90vh] max-w-[90vw] object-contain rounded-xl saturate-[120%] select-none ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  cursor: scale > 1 ? 'grab' : 'pointer',
                  transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                  willChange: 'transform',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  pointerEvents: 'auto',
                  boxShadow:
                    '0 1px 1px #66666612, 0 2px 2px #5e5e5e12, 0 4px 4px #7a5d4413, 0 8px 8px #5e5e5e12, 0 16px 16px #5e5e5e12',
                }}
                onLoad={handleImageLoad}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(e);
                }}
                draggable={false}
              />
            </div>

            {showHelperText && (
              <div
                className={cn(
                  'flex justify-center items-center fixed left-1/2 text-white/60 text-sm bg-black/20 py-1 px-3 w-full max-w-[200px] rounded-full select-none',
                  images[currentIndex]?.caption ? 'bottom-[9.5rem]' : 'bottom-[6rem]',
                  isHelperFadingOut ? 'helper-text-fade-out' : 'helper-text-animation'
                )}
                style={{
                  transform: `translateX(-50%)`,
                  backfaceVisibility: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {isTouchDevice ? t('tapToZoom') : t('doubleClickToZoom')}
              </div>
            )}
          </div>

          {scale === 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('next', e);
                }}
                className="absolute left-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors z-10"
                aria-label={t('nextImage')}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('prev', e);
                }}
                className="absolute right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors z-10"
                aria-label={t('previousImage')}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 max-w-[95vw] z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption above thumbnail strip */}
        {images[currentIndex]?.caption && (
          <div
            className="text-white/90 text-xs text-center px-3 py-1.5 bg-black/50 rounded-lg max-w-[95vw]"
            style={{ userSelect: 'none' }}
          >
            {images[currentIndex].caption}
          </div>
        )}
        <div
          className="flex gap-1 sm:gap-2 p-2 bg-black/50 rounded-lg overflow-x-auto scrollbar-none select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            userSelect: 'none',
          }}
        >
        <div className="flex gap-1 sm:gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
                resetZoom();
                preloadHighQualityImage(index);
                setImageLoading(true);
              }}
              className={cn(
                'flex-shrink-0 w-12 h-9 sm:w-16 sm:h-12 rounded-md overflow-hidden transition-all',
                currentIndex === index ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
              )}
            >
              <img
                src={getOptimizedThumbnailUrl(image.url, 100, 80)}
                alt={image.alt || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover saturate-[125%] select-none"
                draggable={false}
              />
            </button>
          ))}
        </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
};

export default FullscreenImageViewer;
