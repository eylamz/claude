// nextjs-app/components/layout/MobileNav.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { useTranslations } from 'next-intl';
import { useCartItemCount } from '@/stores/cartStore';
import MobileSidebar from './MobileSidebar';
import { isEcommerceEnabled } from '@/lib/utils/ecommerce';

export default function MobileNavMinimal() {
  const pathname = usePathname();
  const locale = useLocale();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openWithSearch, setOpenWithSearch] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  const ecommerceEnabled = isEcommerceEnabled();
  const itemCount = useCartItemCount();
  const tCommon = useTranslations('common');

  // Check if on skateparks page
  const isSkateparksPage = pathname.includes('/skateparks');
  
  // Determine border class based on page and scroll
  const getBorderClass = () => {
    if (isSkateparksPage) {
      // On skateparks page: border-b when not scrolled, border-b-2 when scrolled
      return scrollY > 0 ? 'border-b' : 'border-b';
    } else {
      // On all other pages: always border-b-2
      return 'border-b';
    }
  };

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Scroll detection for header visibility and skateparks page
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;
      
      // Determine scroll direction
      if (currentScrollY < prevScrollY || currentScrollY < 10) {
        // Scrolling up or at top - show header
        setIsHeaderVisible(true);
      } else if (currentScrollY > prevScrollY) {
        // Scrolling down - hide header
        setIsHeaderVisible(false);
      }
      
      prevScrollYRef.current = currentScrollY;
      setScrollY(currentScrollY);
    };

    // Set initial scroll position
    const initialScrollY = window.scrollY;
    setScrollY(initialScrollY);
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  return (
    <>
      {/* ========================================
          MOBILE HEADER - MINIMAL & REFINED
          Green accent only on active/hover states
      ======================================== */}
      <header 
        className={`[@media_(min-width:820px)]:hidden fixed top-0 left-0 right-0 z-[50] bg-header dark:bg-header-dark ${getBorderClass()} border-border dark:border-border-dark shadow-sm transition-[transform,background-color,border-color] duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          
          {/* Left: Search + Menu Buttons */}
          <div className="flex items-center">
            <button
              onClick={() => {
                setOpenWithSearch(false);
                setIsMenuOpen(true);
              }}
              className="p-2.5 -ms-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-dark transition-colors duration-200"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" strokeWidth={2} />
            </button>
            <button
              onClick={() => {
                // 1. Synchronously focus a hidden input to "claim" the keyboard
                const trigger = document.getElementById('safari-focus-trigger');
                trigger?.focus();

                // 2. Open the sidebar logic
                setOpenWithSearch(true);
                setIsMenuOpen(true);
              }}
              className="p-2.5 -mb-[0.4rem] text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-dark transition-colors duration-200 active:scale-95"
              aria-label={tCommon('search') || 'Open search'}
            >
              {/* Invisible input that Safari will allow to trigger the keyboard */}
              <label htmlFor="safari-focus-trigger" className="sr-only">
                {tCommon('search') || 'Search'}
              </label>
              <input 
                id="safari-focus-trigger" 
                className="absolute opacity-0 pointer-events-none w-0 h-0" 
                readOnly
              />
            <Icon name="search" className="w-[1.2rem] h-[1.2rem]" />
            </button>

          </div>

          {/* Center: Logo */}
          <Link href={`/${locale}`} className="flex flex-col items-center group">
            <Icon 
              name="logo" 
              className="w-[124px] h-[39px] sm:w-[128px] sm:h-[24px] text-brand-main dark:text-brand-dark overflow-visible group-hover:stroke-[7px] group-hover:stroke-[#003f03] dark:group-hover:stroke-[#011c02] group-hover:[filter:drop-shadow(0_0_10px_rgba(60,170,65,0.35))] dark:group-hover:[filter:drop-shadow(0_0_10px_rgba(60,170,65,0.15))] transition-all duration-200" 
              style={{ paintOrder: 'stroke' }}
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
        onClose={() => { setIsMenuOpen(false); setOpenWithSearch(false); }} 
        openWithSearch={openWithSearch}
      />
    </>
  );
}