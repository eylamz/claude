// nextjs-app/components/layout/MobileNav.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { useCartItemCount } from '@/stores/cartStore';
import MobileSidebar from './MobileSidebar';
import { isEcommerceEnabled } from '@/lib/utils/ecommerce';

export default function MobileNavMinimal() {
  const pathname = usePathname();
  const locale = useLocale();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  const ecommerceEnabled = isEcommerceEnabled();
  const itemCount = useCartItemCount();

  // Check if on skateparks page
  const isSkateparksPage = pathname.includes('/skateparks');
  
  // Determine border class based on page and scroll
  const getBorderClass = () => {
    if (isSkateparksPage) {
      // On skateparks page: border-b when not scrolled, border-b-2 when scrolled
      return scrollY > 0 ? 'border-b-2' : 'border-b';
    } else {
      // On all other pages: always border-b-2
      return 'border-b-2';
    }
  };

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const threshold = 50000; // Use your desired 50px here
    let accumulatedScroll = 0;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollY;
      
      // 1. Always show if at the very top
      if (currentScrollY < 10) {
        setIsHeaderVisible(true);
        accumulatedScroll = 0;
      } 
      else {
        // 2. Check if we changed direction
        // If we were scrolling down but now up (or vice versa), reset accumulator
        const isScrollingDown = deltaY > 0;
        const wasScrollingDown = accumulatedScroll > 0;
        
        if (isScrollingDown !== wasScrollingDown) {
          accumulatedScroll = 0;
        }

        accumulatedScroll += deltaY;

        // 3. Trigger visibility based on threshold
        if (Math.abs(accumulatedScroll) > threshold) {
          if (accumulatedScroll > 0) {
            setIsHeaderVisible(false); // Scrolled down 50px
          } else {
            setIsHeaderVisible(true);  // Scrolled up 50px
          }
          accumulatedScroll = 0; // Reset after trigger
        }
      }

      lastScrollY = currentScrollY;
      setScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  return (
    <>
      {/* ========================================
          MOBILE HEADER - MINIMAL & REFINED
          Green accent only on active/hover states
      ======================================== */}
      <header 
        className={`[@media_(min-width:820px)]:hidden fixed top-0 left-0 right-0 z-[50] bg-header dark:bg-header-dark ${getBorderClass()} border-header-border dark:border-header-border-dark shadow-sm transition-[transform,background-color,border-color] duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          
          {/* Left: Menu Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2.5 h-11 -ms-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-[transform,background-color,border-color,color] duration-200 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>

          {/* Center: Logo */}
          <Link href={`/${locale}`} className="flex flex-col items-center group">
            <Icon 
              name="logo-hostage3" 
              className="w-[124px] h-[39px] sm:w-[128px] sm:h-[24px] text-brand-main dark:text-brand-dark transition-opacity group-hover:opacity-80" 
            />
          </Link>

          {/* Right: Cart Button - Minimal Badge - only show if ecommerce is enabled */}
          {ecommerceEnabled && (
            <Link
              href={`/${locale}/cart`}
              className="relative h-11 p-2.5 -me-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 active:scale-95 group overflow-visible"              
              aria-label={`Cart with ${itemCount} items`}
            >
              <Icon name="backpack" className=" overflow-visible w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-brand-main rounded-full shadow-lg ring-2 ring-white dark:ring-gray-900">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>


      {/* Mobile Sidebar - Main Menu */}
      <MobileSidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />
    </>
  );
}