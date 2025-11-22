'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';

interface FixedBannerProps {
  isRtl: boolean;
  locale: 'en' | 'he';
}

export default function FixedBanner({ isRtl, locale }: FixedBannerProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check dark mode on mount and when it changes
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const fixedImage = "https://res.cloudinary.com/dr0rvohz9/image/upload/w_auto,c_scale,q_auto,f_auto/v1747210546/mordechai-rimok-springjam-24.webp";
  
  const title = locale === 'he' ? 'לאחד ולגלוש' : 'Unite & Ride';

  return (
    <div 
      className={`select-none opacity-0 relative w-full h-[200px] sm:h-[220px] xl:rounded-2xl overflow-hidden xl:bord shadow-lg animate-fadeIn ${isRtl ? 'rtl' : 'ltr'}`}
      style={{ animationDelay: '1000ms' }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-[0_40%] md:bg-[0_30%] lg:bg-[0_25%] bg-no-repeat bg-cover"
        style={{ 
          backgroundImage: `url(${fixedImage})`,
          filter: `saturate(${isDark ? '120%' : '100%'}) brightness(${isDark ? '90%' : '110%'}) contrast(100%)`
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 dark:shadow-[inset_0px_0px_50px_20px_rgba(0,0,0,0.15)]"></div>
      </div>
      
      {/* Banner Text */}
      <div className={`absolute inset-0 flex items-end justify-start ltr:justify-end px-4 sm:px-6 md:px-8 lg:px-12 mb-4 text-white`}>
        <div
          className={`opacity-0 max-w-2xl animate-slideLeft text-right ps-4 sm:ps-8`}
          style={{ animationDelay: '1150ms' }}
        >
          <Icon 
            name="logo" 
            className="w-[12rem] sm:w-[15rem] md:w-[18rem] navShadow stroke-[7px] text-header-text stroke-header-dark overflow-visible" 
            style={{ paintOrder: 'stroke' }}
          />
          <h2 className="mt-2 text-center rtl:font-rtl ltr:font-ltr leading-[0.95] text-text-dark font-bold navShadow text-3xl sm:text-4xl md:text-5xl">
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
}





