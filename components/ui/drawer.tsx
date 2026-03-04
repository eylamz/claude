'use client';

import { FC, ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}

const TRANSITION_MS = 300;

export const Drawer: FC<DrawerProps> = ({ isOpen, onClose, children, title }) => {
  const locale = useLocale();
  const isRtl = locale === 'he';
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isEntered, setIsEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Animate in from off-screen (like MobileSidebar)
  useEffect(() => {
    if (isOpen && !closing) {
      setIsEntered(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  // Reset entered state when drawer is fully closed so next open animates in
  useEffect(() => {
    if (!isOpen && !closing) setIsEntered(false);
  }, [isOpen, closing]);

  const startClose = () => {
    if (closing) return;
    setClosing(true);
  };

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== drawerRef.current || !closing) return;
    onClose();
    setClosing(false);
    setIsEntered(false);
  };

  // Swipe to close drawer (right in LTR, left in RTL)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOpen || closing) return;
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
      if (isRtl) {
        // RTL: swipe left to close
        if (diffX < 0) setSwipeDistance(-diffX);
      } else {
        // LTR: swipe right to close
        if (diffX > 0) setSwipeDistance(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;

    const threshold = 100;
    if (swipeDistance > threshold) {
      startClose();
    }

    setTouchStart(null);
    setSwipeDistance(0);
  };

  // Close drawer when clicking outside (start close animation)
  useEffect(() => {
    if (!isOpen && !closing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        startClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closing]);

  // Prevent body scroll when drawer is open or closing
  useEffect(() => {
    if (isOpen || closing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, closing]);

  const visible = isOpen || closing;
  if (!visible) return null;

  const isOffScreen = closing || !isEntered;
  const closedTransform = isRtl ? 'translateX(100%)' : 'translateX(-100%)';
  const openTransform =
    swipeDistance > 0
      ? isRtl
        ? `translateX(-${swipeDistance}px)`
        : `translateX(${swipeDistance}px)`
      : 'translateX(0)';
  const transform = isOffScreen ? closedTransform : openTransform;

  const drawerContent = (
    <>
      {/* Backdrop - above MobileNav (z-50) and MobileSidebar (z-61) */}
      <div
        className={`md:hidden fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={startClose}
      />

      {/* Drawer - above MobileNav (z-50) and MobileSidebar (z-61) */}
      <div
        ref={drawerRef}
        className={`md:hidden fixed inset-y-0 w-[80%] max-w-[300px] z-[90] overflow-y-auto bg-background dark:bg-background-dark ease flex flex-col ${isRtl ? 'right-0' : 'left-0'}`}
        style={{
          transform,
          transition: swipeDistance === 0 ? `transform ${TRANSITION_MS}ms ease-out` : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mx-2 border-b border-border dark:border-border-dark pt-6">
          <button
            onClick={startClose}
            className="h-14 p-2"
            aria-label="Close drawer"
          >
            <X className="w-6 h-6 text-gray/75 dark:text-gray-dark/75" />
          </button>
          <h2 className="me-5 text-xl font-semibold text-text dark:text-text-dark ">
            {title}
          </h2>
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

