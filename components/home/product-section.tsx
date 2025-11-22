'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from './arrow-right';

interface Product {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  discountPrice?: number;
  hasDiscount?: boolean;
}

interface ProductSectionProps {
  products: Product[];
  t: (key: string) => string;
}

// Helper function to format price with commas for thousands
const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const ProductSection = ({ products, t }: ProductSectionProps) => {
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
    <section className="mx-auto relative">
      <div className="relative">
        {showStartButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute ltr:right-[5px] rtl:left-[5px] top-1/2 -translate-y-1/2 z-10 transition-all duration-200 bg-white/80 hover:bg-white/90 dark:bg-black/80 dark:hover:bg-black/90 rounded-full p-2 shadow-lg opacity-0 animate-popFadeIn"
            style={{ animationDelay: '400ms' }}
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
        )}
        <div 
          ref={scrollContainerRef}
          className={`flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory pt-2 scrollbar-hide hover:scrollbar-show ${isRtl ? 'rtl' : 'ltr'}`}
        >
          {products.map((product, index: number) => (
            <Link 
              href={`/${locale}/shop/${product.slug}`} 
              key={product.id}
              onClick={(e) => {
                e.preventDefault();
                setClickedCardId(product.id);
                setTimeout(() => {
                  window.location.href = `/${locale}/shop/${product.slug}`;
                }, 700);
              }}
            >
              <Card 
                className={`flex-none bg-card dark:bg-card-dark opacity-0 snap-center w-[220px] min-w-[220px] md:w-[260px] md:min-w-[260px] hover:shadow-lg dark:hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-3xl overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-200 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:z-[1] before:pointer-events-none ${clickedCardId === product.id ? 'before:animate-shimmer' : ''}`}
                style={{ animationDelay: `${150 + (index * 125)}ms` }}
              >
                <img
                  src={product.image ?? '/placeholder.jpg'}
                  alt={product.name}
                  className="select-none w-full h-36 md:h-40 object-cover rounded-t-lg saturate-[1.75]"
                />
                <CardContent className="p-2 w-full">
                  <div className="flex flex-col w-full text-text-secondary dark:text-text-secondary-dark">
                    <div className="w-full">
                      <h3 className="h3 font-semibold text-lg text-text dark:text-text-dark w-full line-clamp-2 min-h-[2rem]">{product.name}</h3>
                      <div className="w-full flex justify-between items-center">
                        <div className="flex px-1 gap-2">
                          {product.hasDiscount && product.discountPrice ? (
                            <>
                              <span className="text-sm font-bold text-brand-main">
                                ₪{formatPrice(Math.round(product.discountPrice))}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                ₪{formatPrice(product.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-brand-main">
                              ₪{formatPrice(product.price)}
                            </span>
                          )}
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
            style={{ animationDelay: '400ms' }}
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





