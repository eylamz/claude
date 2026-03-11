'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { ParkCard } from '@/components/skateparks/ParkCard';
import { ArrowRight } from './arrow-right';

// Full park shape compatible with ParkCard (from API / homepage)
interface SkateparkForCard {
  _id: string;
  slug: string;
  name: { en: string; he: string } | string;
  imageUrl?: string;
  images?: { url: string; order: number; isFeatured?: boolean }[];
  area: 'north' | 'center' | 'south';
  location?: { lat: number; lng: number };
  amenities?: Record<string, boolean>;
  openingYear?: number | null;
  openingMonth?: number | null;
  closingYear?: number | null;
  createdAt?: string | null;
  isFeatured?: boolean;
  [key: string]: unknown;
}

interface ParkSectionProps {
  parks: SkateparkForCard[];
  t: (key: string) => string;
}

export const ParkSection = ({ parks, t: _t }: ParkSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showStartButton, setShowStartButton] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const locale = useLocale();
  const isRtl = locale === 'he';

  const updateButtonVisibility = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

      // Check if content overflows
      setHasOverflow(scrollWidth > clientWidth);

      if (isRtl) {
        // In RTL, scrollLeft is negative
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
      // Set initial scroll position for RTL
      if (isRtl) {
        container.scrollLeft = container.scrollWidth - container.clientWidth;
      }
      updateButtonVisibility();
      container.addEventListener('scroll', updateButtonVisibility);

      // Add resize observer to check for overflow on window resize
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
      if (scrollContainerRef.current) {
        const scrollAmount = 300;
        const container = scrollContainerRef.current;
        const { scrollLeft, scrollWidth, clientWidth } = container;

        // Normalize scrollLeft across browsers for RTL mode
        const normalizedScrollLeft = isRtl
          ? scrollLeft >= 0
            ? scrollLeft // Firefox-style RTL (positive from right)
            : Math.abs(scrollLeft) // Chrome/Safari RTL (negative from right)
          : scrollLeft;

        // Calculate normalized position for limit detection
        const scrollStart = isRtl
          ? scrollWidth - clientWidth - normalizedScrollLeft
          : normalizedScrollLeft;
        const scrollEnd = isRtl ? normalizedScrollLeft : scrollLeft + clientWidth;

        // Check limits using normalized values
        const isAtStart = scrollStart <= 0;
        const isAtEnd = scrollEnd >= scrollWidth;

        const isAtLimit = (direction === 'left' && isAtStart) || (direction === 'right' && isAtEnd);

        if (isAtLimit) {
          // Trigger the scale animation by adding and removing the class
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

        // Adjust scrollBy parameters for RTL
        const scrollDelta = direction === 'right' ? scrollAmount : -scrollAmount;
        // In RTL, we need to invert the scroll direction
        const adjustedScrollDelta = isRtl ? -scrollDelta : scrollDelta;

        container.scrollBy({
          left: adjustedScrollDelta,
          behavior: 'smooth',
        });
      }
    },
    [isRtl]
  );

  return (
    <section className="transform-gpu rtl:pr-4 ltr:pl-4 xl:!px-0 mx-auto relative">
      <div className="relative">
        {showStartButton && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute ltr:left-[5px] rtl:right-[5px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '900ms' }}
            aria-label="Previous parks"
          >
            <ArrowRight className="h-6 w-6 ltr:rotate-180" aria-hidden />
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className={`flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory pt-2 scrollbar-hide hover:scrollbar-show ${isRtl ? 'rtl' : 'ltr'}`}
        >
          {parks.map((park) => (
            <div
              key={park._id}
              className="flex-none w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] snap-center"
            >
              <ParkCard park={park as any} locale={locale} compact nameClassName="font-medium" />
            </div>
          ))}
        </div>
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute ltr:right-[5px] rtl:left-[5px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '900ms' }}
            aria-label="Next parks"
          >
            <ArrowRight className="h-6 w-6 rtl:rotate-180" aria-hidden />
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
