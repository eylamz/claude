'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from './arrow-right';

interface Guide {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image: string;
  views?: number;
}

interface GuideSectionProps {
  guides: Guide[];
  t: (key: string) => string;
}

export const GuideSection = ({ guides, t: _t }: GuideSectionProps) => {
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
    <section className="mx-auto relative rtl:pr-4 ltr:pl-4 xl:!px-0">
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
          {guides.map((guide: Guide, index: number) => (
            <Link 
              href={`/${locale}/guides/${guide.slug}`} 
              key={guide.id}
              onClick={(e) => {
                e.preventDefault();
                setClickedCardId(guide.id);
                setTimeout(() => {
                  window.location.href = `/${locale}/guides/${guide.slug}`;
                }, 700);
              }}
            >
              <Card 
                className={`flex-none bg-card dark:bg-card-dark opacity-0 snap-center w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] hover:shadow-lg dark:hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-3xl overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-200 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:z-[1] before:pointer-events-none ${clickedCardId === guide.id ? 'before:animate-shimmer' : ''}`}
                style={{ animationDelay: `${1400 + (index * 125)}ms` }}
              >
                <img
                  src={guide.image ?? '/placeholder.jpg'}
                  alt={guide.title}
                  className="select-none w-full h-36 md:h-40 object-cover rounded-t-lg saturate-[1.75] bg-black/10 dark:bg-white/10"
                />
                <CardContent className="p-2 w-full h-[120px] flex flex-col">
                  <div className="flex flex-col w-full text-text-secondary dark:text-text-secondary-dark flex-grow">
                    <div className="w-full">
                      <h3 className="h3 leading-none font-semibold text-lg text-text dark:text-text-dark w-full min-h-[2rem] line-clamp-2">
                        {guide.title}
                      </h3>
                      <div className="w-full flex justify-between items-center px-1 mt-1">
                        <div className="flex">
                          <span className="text-sm line-clamp-2 h-[2.5rem]">
                            {guide.description}
                          </span>
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





