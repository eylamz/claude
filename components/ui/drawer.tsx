'use client';

import { FC, ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/Icon';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}

export const Drawer: FC<DrawerProps> = ({ isOpen, onClose, children, title }) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Swipe to close drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOpen) return;
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
    setSwipeDistance(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStart.x;
    const diffY = currentY - touchStart.y;

    // Check if horizontal swipe (threshold 45 degrees)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      // Swipe right to close
      if (diffX > 0) {
        setSwipeDistance(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    
    const threshold = 100;
    if (swipeDistance > threshold) {
      onClose();
    }
    
    setTouchStart(null);
    setSwipeDistance(0);
  };

  // Close drawer when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const drawerContent = (
    <>
      {/* Backdrop - above MobileNav (z-50) and MobileSidebar (z-61) */}
      <div
        className="md:hidden fixed inset-0 z-[80] bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />
      
      {/* Drawer - above MobileNav (z-50) and MobileSidebar (z-61) */}
      <div
        ref={drawerRef}
        className="md:hidden fixed inset-y-0 left-0 w-[80%] z-[90] overflow-y-auto backdrop-blur-md bg-background dark:bg-background-dark"
        style={{
          transform: swipeDistance > 0 ? `translateX(${swipeDistance}px)` : 'translateX(0)',
          transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-2 mx-2 border-b border-border dark:border-border-dark pt-6">
          <h2 className="text-2xl font-semibold text-header-text-dark dark:text-header-text">{title}</h2>
          <button
            onClick={onClose}
            className="h-14 p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
            aria-label="Close drawer"
          >
            <Icon name="X" className="w-10 h-10" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-4 py-4">{children}</div>
      </div>
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(drawerContent, document.body);
  }
  return null;
};

