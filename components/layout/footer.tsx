'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/icons/Icon';
import { Button, Input } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { isEcommerceEnabled, isTrainersEnabled, isNewsletterEnabled } from '@/lib/utils/ecommerce';
import '@/app/[locale]/(public)/button-bg-animated.css';

export function Footer() {
  const locale = useLocale();
  const t = useTranslations('common');
  const tMobileNav = useTranslations('common.mobileNav');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThankYouPopup, setShowThankYouPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewsletterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setError(t('footer.subscribeError'));
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, locale: locale === 'he' ? 'he' : 'en' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 200) {
          setError(data.message || t('footer.subscribeError'));
          return;
        }
        setEmail('');
        setShowThankYouPopup(true);
        setTimeout(() => setShowThankYouPopup(false), 3000);
      } catch {
        setError(t('footer.subscribeError'));
      } finally {
        setLoading(false);
      }
    },
    [email, locale, t]
  );

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
    { href: `/${locale}/terms`, label: t('footer.termsAndPrivacy') },
    { href: `/${locale}/cookies`, label: t('footer.cookiePolicy') },
    { href: `/${locale}/accessibility`, label: tMobileNav('accessibility') },
  ];

  if (!isNewsletterEnabled()) {
    return null;
  }

  return (
    <footer className="bg-header dark:bg-header-dark border-t border-border dark:border-border-dark transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-12">
        <div className="flex flex-col justify-start items-start gap-1">
          {/* Logo */}
          <div>
            <Link href={`/${locale}`} className="inline-block group">
              <Icon
                name="logo"
                className="text-brand-main dark:text-brand-dark stroke-[7px] stroke-[#003f03] dark:stroke-transparent dark:group-hover:stroke-[#012f03] w-32 h-8 overflow-visible transition-all duration-200 group-hover:[filter:drop-shadow(0_0_10px_rgba(60,170,65,0.35))]"
                style={{ paintOrder: 'stroke' }}
              />
            </Link>
          </div>

          {/* Mission Statement & Navigation Links */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-20 justify-between flex-1 max-w-2xl md:max-w-full mb-8">
            <div className="max-w-xs">
              <p className="text-sm min-w-[230px] w-full max-w-[120%] text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {t('footer.missionStatement')}
              </p>
              <div className="flex items-center gap-4 md:gap-2 md:mb-4 mt-6 overflow-visible">
                <a
                  href="https://www.instagram.com/enboss_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="group relative flex items-center justify-center p-1 cursor-pointer touch-manipulation transition-all duration-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 md:w-6 md:h-6 transition-all duration-200 
                stroke-black/0 dark:stroke-white/80 stroke-[1px]            
               fill-[url(#insta-gradient)] 
               /* צל שחור ב-Light Mode וצל לבן ב-Dark Mode על ה-SVG */
               [filter:drop-shadow(0_0_3px_rgba(0,0,0,0.15))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))] 
               
               
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
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="flex items-center justify-center cursor-pointer transition-all duration-200 text-white stroke-black stroke-[0.75px] [filter:drop-shadow(-1px_-0.7px_0_#25F4EEd9)_drop-shadow(1.25px_1.25px_0_#FE2C55d9)_drop-shadow(0_0_8px_rgba(37,244,238,0.25))_drop-shadow(0_0_8px_rgba(227,45,21,0.35))] md:text-text md:dark:text-text-dark md:stroke-transparent md:[filter:none] md:hover:text-white md:hover:stroke-black md:hover:scale-110 
                md:hover:[filter:drop-shadow(-1px_-0.7px_0_#25F4EEd9)_drop-shadow(1.25px_1.25px_0_#FE2C55d9)_drop-shadow(0_0_8px_rgba(37,244,238,0.25))_drop-shadow(0_0_8px_rgba(227,45,21,0.35))]"
                >
                  <Icon
                    name="tiktok"
                    size={32}
                    className="md:w-6 md:h-6 transition-all duration-200"
                  />
                </a>
                <a
                  href={`/${locale}/contact`}
                  aria-label={t('contact')}
                  className="flex items-center justify-center group cursor-pointer p-1 transition-all duration-200 touch-manipulation"
                >
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 md:w-6 h-8 md:h-6 transition-all duration-200 drop-shadow-[0_0_10px_rgba(60,170,65,0.4)] md:fill-text md:dark:fill-text-dark md:drop-shadow-none md:group-hover:drop-shadow-[0_0_10px_rgba(60,170,65,0.4)] md:group-hover:scale-110"
                  >
                    <path
                      className="fill-brand-main dark:fill-brand-dark md:fill-text dark:md:fill-text-dark md:group-hover:fill-brand-main md:dark:group-hover:fill-brand-dark"
                      d="M18.4704 16.83L18.8604 19.99C18.9604 20.82 18.0704 21.4 17.3604 20.97L13.9004 18.91C13.6604 18.77 13.6004 18.47 13.7304 18.23C14.2304 17.31 14.5004 16.27 14.5004 15.23C14.5004 11.57 11.3604 8.59 7.50038 8.59C6.71038 8.59 5.94038 8.71 5.22038 8.95C4.85038 9.07 4.49038 8.73 4.58038 8.35C5.49038 4.71 8.99038 2 13.1704 2C18.0504 2 22.0004 5.69 22.0004 10.24C22.0004 12.94 20.6104 15.33 18.4704 16.83Z"
                    />
                    <path
                      className="fill-[#4cdb52] dark:fill-[#55f15e] md:fill-text dark:md:fill-text-dark md:group-hover:fill-[#4cdb52] md:dark:group-hover:fill-[#55f15e]"
                      d="M13 15.2298C13 16.4198 12.56 17.5198 11.82 18.3898C10.83 19.5898 9.26 20.3598 7.5 20.3598L4.89 21.9098C4.45 22.1798 3.89 21.8098 3.95 21.2998L4.2 19.3298C2.86 18.3998 2 16.9098 2 15.2298C2 13.4698 2.94 11.9198 4.38 10.9998C5.27 10.4198 6.34 10.0898 7.5 10.0898C10.54 10.0898 13 12.3898 13 15.2298Z"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@enboss2136"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex items-center justify-center cursor-pointer transition-all duration-200 text-[#FF0000] scale-110 [filter:drop-shadow(0_0_8px_rgba(255,0,0,0.25))] md:text-text md:dark:text-text-dark md:scale-100 md:[filter:none] md:hover:text-[#FF0000] md:hover:scale-110 md:hover:[filter:drop-shadow(0_0_8px_rgba(255,0,0,0.25))]"
                >
                  <Icon
                    name="youtube"
                    size={28}
                    className="md:w-6 md:h-6 transition-all duration-200"
                  />
                </a>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="grid grid-cols-2 gap-12 w-full">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-text dark:text-text-dark mb-4">
                  {t('footer.discover')}
                </h4>
                <ul className="space-y-1">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="-ms-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:font-medium hover:text-black dark:hover:text-brand-dark transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-text dark:text-text-dark mb-4">
                  {t('mobileNav.infoSupport')}
                </h4>
                <ul className="space-y-1">
                  {secondaryLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="-ms-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:font-medium hover:text-black dark:hover:text-brand-dark transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Subscribe to newsletter */}
            <div className="w-full max-w-[3313px]">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text dark:text-text-dark mb-4">
                {t('footer.subscribeToNewsletter')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('footer.newsletterDescriptionNew')}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col xsm:flex-row gap-2">
                <Input
                  type="email"
                  variant="default"
                  placeholder={t('footer.enterYourEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  aria-label={t('footer.enterYourEmail')}
                  className="w-full"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className={`button-gradient btn-buy w-auto !rounded-xl !bg-transparent !border-0 !px-8 text-white font-semibold h-[40px] min-h-[40px] ${loading ? 'loading disabled' : 'visible'}`}
                >
                  <div className="btn-content">
                    {loading ? t('footer.subscribing') : t('footer.subscribe')}
                  </div>
                  <div className="gradient-0" aria-hidden />
                  <div className="gradient-1" aria-hidden />
                  <div className="glass" aria-hidden />
                  <div className="gradient-2" aria-hidden>
                    <div className="color-1 color" />
                    <div className="color-2 color" />
                    <div className="color-3 color" />
                    <div className="color-4 color" />
                    <div className="color-5 color" />
                    <div className="color-6 color" />
                  </div>
                </Button>
                {error && (
                  <p className="text-xs text-red dark:text-red-dark" role="alert">
                    {error}
                  </p>
                )}
              </form>
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
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {locale === 'he' ? (
              <>© {currentYear} אנבוס. כל הזכויות שמורות.</>
            ) : (
              <>© {currentYear} ENBOSS. All rights reserved.</>
            )}
          </p>
        </div>
      </div>

      {/* Thank you for newsletter popup */}
      <AnimatePresence>
        {showThankYouPopup && (
          <motion.div
            key="newsletter-thank-you-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="backdrop-blur-sm fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            aria-live="polite"
          >
            <div
              dir={locale === 'he' ? 'rtl' : 'ltr'}
              className="pointer-events-auto rounded-xl px-6 py-4 shadow-lg bg-sidebar dark:bg-sidebar-dark border border-border dark:border-border-dark text-center max-w-sm"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
            >
              <p className="text-base font-medium text-text dark:text-text-dark">
                {t('footer.subscribed')}
              </p>
              <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                {t('footer.newsletterThankYouMessage')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
