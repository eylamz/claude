// nextjs-app/components/layout/MobileNav.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ShoppingBag, Menu } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { useCartItemCount } from '@/stores/cartStore';
import MobileSidebar from './MobileSidebar';

export default function MobileNavMinimal() {
  const pathname = usePathname();
  const locale = useLocale();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
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

  // Scroll detection for header visibility
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
        className={`[@media_(min-width:820px)]:hidden fixed top-0 left-0 right-0 z-[50] bg-header dark:bg-header-dark ${getBorderClass()} border-header-border dark:border-header-border-dark shadow-sm transition-all duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          
          {/* Left: Menu Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2.5 -ml-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 active:scale-95"
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

          {/* Right: Cart Button - Minimal Badge */}
          <Link
            href={`/${locale}/cart`}
            className="relative p-2.5 -mr-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 active:scale-95 group"
            aria-label={`Cart with ${itemCount} items`}
          >
            <ShoppingBag className="w-6 h-6" strokeWidth={2} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-brand-main rounded-full shadow-lg ring-2 ring-white dark:ring-gray-900">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
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