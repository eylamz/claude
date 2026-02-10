'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/components/icons/Icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { isEcommerceEnabled, isTrainersEnabled } from '@/lib/utils/ecommerce';


export function Footer() {
  const locale = useLocale();
  const t = useTranslations('common');
  const tMobileNav = useTranslations('common.mobileNav');
  
  const ecommerceEnabled = isEcommerceEnabled();
  const trainersEnabled = isTrainersEnabled();
  const currentYear = new Date().getFullYear();

  // Navigation logic synced with HeaderNav and MobileSidebar
  const navLinks = [
    { href: `/${locale}/skateparks`, label: t('skateparks') }, // From HeaderNav logic
    { href: `/${locale}/guides`, label: tMobileNav('guides') },
    { href: `/${locale}/events`, label: tMobileNav('events') },
    ...(ecommerceEnabled ? [{ href: `/${locale}/shop`, label: tMobileNav('shop') }] : []),
    ...(trainersEnabled ? [{ href: `/${locale}/trainers`, label: tMobileNav('findCoaches') }] : []),
    { href: `/${locale}/about`, label: t('about') },
  ];

  const secondaryLinks = [
    { href: `/${locale}/contact`, label: t('contact') },
    { href: `/${locale}/terms`, label: t('footer.termsOfService') },
    { href: `/${locale}/privacy`, label: t('footer.privacyPolicy') },
    { href: `/${locale}/accessibility`, label: tMobileNav('accessibility') },
  ];

  return (
    <footer className="bg-header dark:bg-header-dark border-t border-border dark:border-border-dark transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          
          {/* Brand Section */}
          <div className="max-w-xs">
            <Link href={`/${locale}`} className="inline-block mb-4 ">
              <Icon name="logo"
              className="text-brand-dark dark:text-brand-main stroke-[7px] stroke-text dark:stroke-text-dark w-32 h-8 overflow-visible"
              style={{ paintOrder: 'stroke' }}
              />
            </Link>
            <p className="text-sm w-full max-w-[120%] text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {t('footer.missionStatement')}
            </p>
            <div className="flex items-center gap-4 md:mb-4 mt-6 overflow-visible">
            <a href="https://www.instagram.com/enboss_official" className="group relative flex items-center justify-center p-1 cursor-pointer touch-manipulation">
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 transition-all duration-500 
                stroke-black/0 dark:stroke-white/80 stroke-[1px]            
               fill-[url(#insta-gradient)] 
               /* צל שחור ב-Light Mode וצל לבן ב-Dark Mode על ה-SVG */
               [filter:drop-shadow(0_0_3px_rgba(0,0,0,0.15))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))] 
               dark:[filter:drop-shadow(0_0_3px_rgba(255,255,255,0.25))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))]
               
              md:stroke-transparent md:fill-text md:dark:fill-text-dark md:drop-shadow-none 
               md:group-hover:scale-110 md:group-hover:stroke-black md:group-hover:stroke-[1px] 
               md:group-hover:fill-[url(#insta-gradient)] 
               /* אפקט הובר משולב ב-Desktop */
               md:group-hover:[filter:drop-shadow(0_0_1px_rgba(0,0,0,0.8))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))]
               md:dark:group-hover:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.8))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))]"
                style={{ paintOrder: 'stroke' }}
              >
                <defs>
                  <linearGradient id="insta-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#f9ce34' }} />
                    <stop offset="50%" style={{ stopColor: '#ee2a7b' }} />
                    <stop offset="100%" style={{ stopColor: '#6228d7' }} />
                  </linearGradient>
                </defs>
                <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM12 15.88C9.86 15.88 8.12 14.14 8.12 12C8.12 9.86 9.86 8.12 12 8.12C14.14 8.12 15.88 9.86 15.88 12C15.88 14.14 14.14 15.88 12 15.88ZM17.92 6.88C17.87 7 17.8 7.11 17.71 7.21C17.61 7.3 17.5 7.37 17.38 7.42C17.26 7.47 17.13 7.5 17 7.5C16.73 7.5 16.48 7.4 16.29 7.21C16.2 7.11 16.13 7 16.08 6.88C16.03 6.76 16 6.63 16 6.5C16 6.37 16.03 6.24 16.08 6.12C16.13 5.99 16.2 5.89 16.29 5.79C16.52 5.56 16.87 5.45 17.19 5.52C17.26 5.53 17.32 5.55 17.38 5.58C17.44 5.6 17.5 5.63 17.56 5.67C17.61 5.7 17.66 5.75 17.71 5.79C17.8 5.89 17.87 5.99 17.92 6.12C17.97 6.24 18 6.37 18 6.5C18 6.63 17.97 6.76 17.92 6.88Z" />
              </svg>
            </a>
              <a 
                href="https://www.tiktok.com/enboss_official" 
                className="flex items-center justify-center cursor-pointer transition-all duration-300 text-white stroke-black stroke-[0.75px] [filter:drop-shadow(-1px_-0.7px_0_#25F4EEd9)_drop-shadow(1.25px_1.25px_0_#FE2C55d9)_drop-shadow(0_0_8px_rgba(37,244,238,0.25))_drop-shadow(0_0_8px_rgba(227,45,21,0.35))] md:text-text md:dark:text-text-dark md:stroke-transparent md:[filter:none] md:hover:text-white md:hover:stroke-black md:hover:scale-110 
                md:hover:[filter:drop-shadow(-1px_-0.7px_0_#25F4EEd9)_drop-shadow(1.25px_1.25px_0_#FE2C55d9)_drop-shadow(0_0_8px_rgba(37,244,238,0.25))_drop-shadow(0_0_8px_rgba(227,45,21,0.35))]"
              >
                <Icon name="tiktok" size={32} />
              </a>
              <a href={`/${locale}/contact`} className="flex items-center justify-center group cursor-pointer p-1 transition-all duration-200 touch-manipulation">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 transition-all duration-200 drop-shadow-[0_0_10px_rgba(60,170,65,0.4)] md:fill-text md:dark:fill-text-dark md:drop-shadow-none md:group-hover:drop-shadow-[0_0_10px_rgba(60,170,65,0.4)] md:group-hover:scale-110"
                >
                  <path className="fill-brand-main dark:fill-brand-dark md:fill-text dark:md:fill-text-dark md:group-hover:fill-brand-main md:dark:group-hover:fill-brand-dark" d="M18.4704 16.83L18.8604 19.99C18.9604 20.82 18.0704 21.4 17.3604 20.97L13.9004 18.91C13.6604 18.77 13.6004 18.47 13.7304 18.23C14.2304 17.31 14.5004 16.27 14.5004 15.23C14.5004 11.57 11.3604 8.59 7.50038 8.59C6.71038 8.59 5.94038 8.71 5.22038 8.95C4.85038 9.07 4.49038 8.73 4.58038 8.35C5.49038 4.71 8.99038 2 13.1704 2C18.0504 2 22.0004 5.69 22.0004 10.24C22.0004 12.94 20.6104 15.33 18.4704 16.83Z" />
                  <path className="fill-[#4cdb52] dark:fill-[#55f15e] md:fill-text dark:md:fill-text-dark md:group-hover:fill-[#4cdb52] md:dark:group-hover:fill-[#55f15e]" d="M13 15.2298C13 16.4198 12.56 17.5198 11.82 18.3898C10.83 19.5898 9.26 20.3598 7.5 20.3598L4.89 21.9098C4.45 22.1798 3.89 21.8098 3.95 21.2998L4.2 19.3298C2.86 18.3998 2 16.9098 2 15.2298C2 13.4698 2.94 11.9198 4.38 10.9998C5.27 10.4198 6.34 10.0898 7.5 10.0898C10.54 10.0898 13 12.3898 13 15.2298Z" />
                </svg>
              </a>
              <a href="https://www.youtube.com/@enboss2136" className="flex items-center justify-center cursor-pointer transition-all duration-200 text-[#FF0000] scale-110 [filter:drop-shadow(0_0_8px_rgba(255,0,0,0.25))] md:text-text md:dark:text-text-dark md:scale-100 md:[filter:none] md:hover:text-[#FF0000] md:hover:scale-110 md:hover:[filter:drop-shadow(0_0_8px_rgba(255,0,0,0.25))]">
              <Icon name="youtube" size={28} /></a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-text dark:text-text-dark mb-4">{t('footer.discover')}</h4>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-text dark:text-text-dark mb-4">{t('mobileNav.infoSupport')}</h4>
              <ul className="space-y-3">
                {secondaryLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="py-4 border-t border-border dark:border-border-dark flex flex-col sm:flex-row justify-between items-center gap-3">

        <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border dark:border-border-dark flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-xs text-gray-500">
            {locale === 'he' ? (
              <>© {currentYear} אנבוס. כל הזכויות שמורות.</>
            ) : (
              <>© {currentYear} ENBOSS. All rights reserved.</>
            )}
          </p>
          
          
        </div>
      </div>
    </footer>
  );
}