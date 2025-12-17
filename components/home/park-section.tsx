'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/icons';
import { ArrowRight } from './arrow-right';

interface Skatepark {
  id: string;
  slug: string;
  name: string;
  image: string;
  area: 'north' | 'center' | 'south';
  openingYear?: number;
}

interface ParkSectionProps {
  parks: Skatepark[];
  t: (key: string) => string;
}

export const ParkSection = ({ parks, t }: ParkSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showStartButton, setShowStartButton] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [clickedCardId, setClickedCardId] = useState<string | null>(null);
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

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const container = scrollContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      // Normalize scrollLeft across browsers for RTL mode
      const normalizedScrollLeft = isRtl 
        ? (scrollLeft >= 0 
            ? scrollLeft  // Firefox-style RTL (positive from right)
            : Math.abs(scrollLeft)) // Chrome/Safari RTL (negative from right)
        : scrollLeft;
      
      // Calculate normalized position for limit detection
      const scrollStart = isRtl ? scrollWidth - clientWidth - normalizedScrollLeft : normalizedScrollLeft;
      const scrollEnd = isRtl ? normalizedScrollLeft : scrollLeft + clientWidth;
      
      // Check limits using normalized values
      const isAtStart = scrollStart <= 0;
      const isAtEnd = scrollEnd >= scrollWidth;
      
      const isAtLimit = (direction === 'left' && isAtStart) || (direction === 'right' && isAtEnd);
      
      if (isAtLimit) {
        // Trigger the scale animation by adding and removing the class
        const button = direction === 'right' 
          ? container.nextElementSibling as HTMLElement
          : container.previousElementSibling as HTMLElement;
        
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
        behavior: 'smooth'
      });
    }
  }, [isRtl]);

  return (
    <section className="rtl:pr-4 ltr:pl-4 xl:!px-0 mx-auto relative">
      <div className="relative">
        {showStartButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute ltr:left-[5px] rtl:right-[5px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '900ms' }}
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
        )}
        <div 
          ref={scrollContainerRef}
          className={`flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory pt-2 scrollbar-hide hover:scrollbar-show ${isRtl ? 'rtl' : 'ltr'}`}
        >
          {parks.map((park, index: number) => (
            <Link 
              href={`/${locale}/skateparks/${park.slug}`} 
              key={park.id}
              onClick={(e) => {
                e.preventDefault();
                setClickedCardId(park.id);
                setTimeout(() => {
                  window.location.href = `/${locale}/skateparks/${park.slug}`;
                }, 700);
              }}
            >
              <Card 
                className={`flex-none !rounded-3xl bg-card dark:bg-card-dark opacity-0 snap-center w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] shadow-lg shadow-[rgba(0,0,0,0.05)] hover:shadow-lg dark:hover:!scale-[1.02] border-[4px] border-card dark:border-card-dark overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-200 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:z-[1] before:pointer-events-none ${clickedCardId === park.id ? 'before:animate-shimmer' : ''}`}
                style={{ animationDelay: `${550 + (index * 125)}ms` }}
              >
                <div className="relative">
                  <img
                    src={park.image ?? '/placeholder.jpg'}
                    alt={park.name}
                    className="select-none w-full h-40 md:h-44 object-cover saturate-[1.75] rounded-xl"
                  />
                </div>
                <CardContent className="ps-3 pe-2 py-2 w-full">
                  <div className="flex flex-col w-full text-text-secondary dark:text-text-secondary-dark">
                    <div className="w-full">
                      <h3 className="font-semibold truncate text-base text-text dark:text-text-dark w-full">{park.name}</h3>
                      <div className="w-full flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <Icon name="calendar" className="h-4 w-4" />
                          <span className="text-sm pt-[0.125rem]">{park.openingYear}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {hasOverflow && (
          <button
            onClick={() => scroll('right')}
            className="absolute ltr:right-[5px] rtl:left-[5px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '900ms' }}
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





