'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImage {
  id: string;
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTap, setLastTap] = useState(0);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState(1);
  
  const mainImageRef = useRef<HTMLDivElement>(null);
  const fullscreenImageRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleCloseFullscreen();
          break;
        case 'ArrowLeft':
          handlePrevImage();
          break;
        case 'ArrowRight':
          handleNextImage();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, activeIndex, zoomLevel]);

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleThumbnailClick = (index: number) => {
    setActiveIndex(index);
    setImageLoading({ ...imageLoading, [index]: true });
  };

  const handleMainImageClick = () => {
    setIsFullscreen(true);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handlePrevImage = () => {
    const newIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
    setActiveIndex(newIndex);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleNextImage = () => {
    const newIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(newIndex);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageRef.current) return;
    
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setHoverPosition({ x, y });
  };

  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      setIsPanning(true);
      e.preventDefault();
    }
  };

  const handlePanMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || zoomLevel <= 1) return;

    setPanPosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  }, [isPanning, zoomLevel]);

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Touch handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      
      // Double tap detection
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (now - lastTap < DOUBLE_TAP_DELAY) {
        handleDoubleTap();
      }
      setLastTap(now);
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoomLevel(zoomLevel);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance && isFullscreen) {
      // Pinch to zoom
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(1, Math.min(4, initialZoomLevel * scale));
      setZoomLevel(newZoom);
      e.preventDefault();
    } else if (e.touches.length === 1 && touchStart && zoomLevel <= 1) {
      // Swipe to change image
      const deltaX = e.touches[0].clientX - touchStart.x;
      const SWIPE_THRESHOLD = 50;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
          handlePrevImage();
        } else {
          handleNextImage();
        }
        setTouchStart(null);
      }
    } else if (e.touches.length === 1 && touchStart && zoomLevel > 1) {
      // Pan when zoomed
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      setPanPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setInitialPinchDistance(null);
  };

  const handleDoubleTap = () => {
    if (isFullscreen) {
      if (zoomLevel === 1) {
        setZoomLevel(2);
      } else {
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  // Scroll thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeThumbnail = thumbnailContainerRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      ) as HTMLElement;
      
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [activeIndex]);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <>
      {/* Main Gallery */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Thumbnails - Vertical on desktop, horizontal on mobile */}
        <div 
          ref={thumbnailContainerRef}
          className="order-2 lg:order-1 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px] pb-2 lg:pb-0 lg:pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              data-index={index}
              onClick={() => handleThumbnailClick(index)}
              className={`relative flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden transition-all ${
                index === activeIndex
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : 'ring-1 ring-gray-200 hover:ring-gray-300'
              }`}
            >
              {imageErrors[index] ? (
                <div className="flex items-center justify-center w-full h-full bg-gray-100">
                  <span className="text-xs text-gray-400">Error</span>
                </div>
              ) : (
                <>
                  <Image
                    src={image.url}
                    alt={image.alt || `${productName} thumbnail ${index + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                  />
                  {imageLoading[index] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Main Image */}
        <div className="order-1 lg:order-2 flex-1">
          <div
            ref={mainImageRef}
            className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in group"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
            onClick={handleMainImageClick}
          >
            {imageErrors[activeIndex] ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Failed to load image</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageErrors(prev => ({ ...prev, [activeIndex]: false }));
                      setImageLoading(prev => ({ ...prev, [activeIndex]: true }));
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt || `${productName} image ${activeIndex + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-contain"
                  priority={activeIndex === 0}
                  onLoad={() => handleImageLoad(activeIndex)}
                  onError={() => handleImageError(activeIndex)}
                />
                {imageLoading[activeIndex] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                {/* Hover zoom effect */}
                {isHovering && !imageLoading[activeIndex] && (
                  <div 
                    className="absolute inset-0 hidden lg:block pointer-events-none"
                    style={{
                      backgroundImage: `url(${activeImage.url})`,
                      backgroundPosition: `${hoverPosition.x}% ${hoverPosition.y}%`,
                      backgroundSize: '200%',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}

                {/* Click to view fullscreen hint */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white bg-opacity-90 px-4 py-2 rounded-full flex items-center gap-2">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-sm font-medium">Click to view fullscreen</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Image counter */}
          <div className="mt-4 text-center text-sm text-gray-600">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={handleCloseFullscreen}
            className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Zoom controls */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-20 rounded-full p-2 flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="text-white p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm font-medium min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4}
              className="text-white p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm">
            {activeIndex + 1} / {images.length}
          </div>

          {/* Main fullscreen image */}
          <div
            ref={fullscreenImageRef}
            className={`relative w-full h-full flex items-center justify-center overflow-hidden ${
              zoomLevel > 1 ? 'cursor-move' : 'cursor-default'
            }`}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
          >
            {imageErrors[activeIndex] ? (
              <div className="text-center">
                <p className="text-white text-lg mb-4">Failed to load image</p>
                <button
                  onClick={() => {
                    setImageErrors(prev => ({ ...prev, [activeIndex]: false }));
                    setImageLoading(prev => ({ ...prev, [activeIndex]: true }));
                  }}
                  className="bg-white text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div
                className="relative transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                  width: '90%',
                  height: '90%'
                }}
              >
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt || `${productName} image ${activeIndex + 1}`}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  onLoad={() => handleImageLoad(activeIndex)}
                  onError={() => handleImageError(activeIndex)}
                />
                {imageLoading[activeIndex] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile instructions hint */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-white text-xs opacity-70 lg:hidden">
            Swipe • Pinch to zoom • Double tap
          </div>
        </div>
      )}
    </>
  );
}







