'use client';

import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { useLocale } from 'next-intl';
import { ArrowRight } from './arrow-right';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Guide {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image: string;
  views?: number;
  sports?: string[];
  difficulty?: string;
}

interface GuideSectionProps {
  guides: Guide[];
  t: (key: string) => string;
}

const getOptimizedImageUrl = (originalUrl: string): string | null => {
  if (!originalUrl || originalUrl.trim() === '') return null;
  if (originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_800,c_fill,q_auto:good,f_auto/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

const GuideThumbnail = memo(
  ({
    photoUrl,
    guideTitle,
    onLoad,
  }: {
    photoUrl: string;
    guideTitle: string;
    onLoad?: () => void;
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      setIsLoaded(false);
      setHasError(false);
    }, [photoUrl]);

    useEffect(() => {
      const checkImageLoaded = () => {
        if (imgRef.current) {
          const img = imgRef.current;
          if (img.complete && img.naturalHeight !== 0) {
            setIsLoaded(true);
            setHasError(false);
            onLoad?.();
            return true;
          } else if (img.complete && img.naturalHeight === 0) {
            setIsLoaded(true);
            setHasError(true);
            return true;
          }
        }
        return false;
      };
      if (checkImageLoaded()) return;
      const t1 = setTimeout(() => checkImageLoaded(), 100);
      const t2 = setTimeout(() => {
        if (!isLoaded && !hasError && imgRef.current) {
          const img = imgRef.current;
          if (!img.complete || img.naturalHeight === 0) {
            setIsLoaded(true);
            setHasError(true);
          }
        }
      }, 3000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }, [photoUrl, onLoad]);

    const handleImageLoad = () => {
      setIsLoaded(true);
      setHasError(false);
      onLoad?.();
    };

    const handleImageError = () => {
      setIsLoaded(true);
      setHasError(true);
    };

    const optimizedUrl = photoUrl ? getOptimizedImageUrl(photoUrl) : null;

    return (
      <>
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-background/20 dark:bg-background/20 flex items-center justify-center z-10">
            <LoadingSpinner />
          </div>
        )}
        {optimizedUrl ? (
          <img
            ref={imgRef}
            src={optimizedUrl}
            alt={guideTitle}
            className={`w-full h-full rounded-xl object-cover transition-all duration-200 select-none saturate-150 group-hover:saturate-[1.75] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <div className="w-16 h-16" />
          </div>
        )}
      </>
    );
  }
);
GuideThumbnail.displayName = 'GuideThumbnail';

export const GuideSection = ({ guides, t: _t }: GuideSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showStartButton, setShowStartButton] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const locale = useLocale();
  const isRtl = locale === 'he';

  const updateButtonVisibility = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setHasOverflow(scrollWidth > clientWidth);
      if (isRtl) {
        const maxScroll = scrollWidth - clientWidth;
        const isAtStart = Math.abs(scrollLeft) >= maxScroll;
        setShowStartButton(!isAtStart);
      } else {
        const isAtStart = scrollLeft === 0;
        setShowStartButton(!isAtStart);
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      if (isRtl) {
        container.scrollLeft = container.scrollWidth - container.clientWidth;
      }
      updateButtonVisibility();
      container.addEventListener('scroll', updateButtonVisibility);
      const resizeObserver = new ResizeObserver(updateButtonVisibility);
      resizeObserver.observe(container);
      return () => {
        container.removeEventListener('scroll', updateButtonVisibility);
        resizeObserver.disconnect();
      };
    }
  }, [isRtl]);

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      if (!scrollContainerRef.current) return;
      const scrollAmount = 300;
      const container = scrollContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const normalizedScrollLeft = isRtl
        ? scrollLeft >= 0
          ? scrollLeft
          : Math.abs(scrollLeft)
        : scrollLeft;
      const scrollStart = isRtl
        ? scrollWidth - clientWidth - normalizedScrollLeft
        : normalizedScrollLeft;
      const scrollEnd = isRtl ? normalizedScrollLeft : scrollLeft + clientWidth;
      const isAtStart = scrollStart <= 0;
      const isAtEnd = scrollEnd >= scrollWidth;
      const isAtLimit = (direction === 'left' && isAtStart) || (direction === 'right' && isAtEnd);
      if (isAtLimit) {
        const button =
          direction === 'right'
            ? (container.nextElementSibling as HTMLElement)
            : (container.previousElementSibling as HTMLElement);
        if (button) {
          button.classList.add('errorPop');
          setTimeout(() => button.classList.remove('errorPop'), 200);
        }
        return;
      }
      const scrollDelta = direction === 'right' ? scrollAmount : -scrollAmount;
      const adjustedScrollDelta = isRtl ? -scrollDelta : scrollDelta;
      container.scrollBy({ left: adjustedScrollDelta, behavior: 'smooth' });
    },
    [isRtl]
  );

  return (
    <section className="transform-gpu mx-auto relative rtl:pr-4 ltr:pl-4 xl:!px-0">
      <div className="relative">
        {showStartButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute ltr:left-[0px] rtl:right-[5px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '1600ms' }}
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className={`flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory pt-2 scrollbar-hide hover:scrollbar-show ${isRtl ? 'rtl' : 'ltr'}`}
        >
          {guides.map((guide) => (
            <GuideSectionCard key={guide.id} guide={guide} locale={locale} />
          ))}
        </div>
        {hasOverflow && (
          <button
            onClick={() => scroll('right')}
            className="absolute ltr:right-[-10px] rtl:left-[-10px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '1600ms' }}
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        )}
      </div>
      <style jsx>{`
        .errorPop {
          animation: 0.2s ease-in-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-show::-webkit-scrollbar {
          display: block;
          height: 8px;
        }
        .scrollbar-show::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        .scrollbar-show::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .scrollbar-show::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        .scrollbar-show {
          -ms-overflow-style: auto;
          scrollbar-width: thin;
        }
      `}</style>
    </section>
  );
};

// Single card for homepage: image + title only, always visible (no entrance animation)
const GuideSectionCard = memo(({ guide, locale }: { guide: Guide; locale: string }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsClicked(true);
      setTimeout(() => {
        window.location.href = `/${locale}/guides/${guide.slug}`;
      }, 300);
    },
    [guide.slug, locale]
  );

  return (
    <div
      onClick={handleCardClick}
      className={`h-fit group rounded-xl cursor-pointer relative select-none transform-gpu transition-all duration-300 before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''}`}
      aria-label={guide.title}
    >
      <div
        className="group-hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden flex-none w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] snap-center"
        style={{
          filter:
            'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)',
        }}
      >
        {isClicked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-2xl">
            <LoadingSpinner variant="header" size={40} />
          </div>
        )}
        <GuideThumbnail photoUrl={guide.image ?? ''} guideTitle={guide.title} />
      </div>

      <div className="w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] pt-2">
        <h3 className="text-lg font-medium text-text dark:text-text-dark line-clamp-2">
          {guide.title}
        </h3>
      </div>
    </div>
  );
});
GuideSectionCard.displayName = 'GuideSectionCard';
