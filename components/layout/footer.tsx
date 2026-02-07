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
            <Link href={`/${locale}`} className="inline-block mb-4">
              <Icon name="logo" className="text-brand-main dark:text-brand-dark w-32 h-8" />
            </Link>
            <p className="text-sm w-full max-w-[120%] text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {t('footer.missionStatement')}
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="https://www.instagram.com/enboss_official" className="text-text dark:text-text-dark hover:text-brand-main transition-colors duration-200">
              <Icon name="instagram" size={20} /></a>
              <a href="https://www.tiktok.com/enboss_official" className="text-text dark:text-text-dark hover:text-brand-main transition-colors duration-200">
              <Icon name="tiktok" size={20} /></a>
              <a href={`/${locale}/contact`} className="text-text dark:text-text-dark hover:text-brand-main transition-colors duration-200">
                <Icon name="messages" size={20} /></a>
              <a href="https://www.youtube.com/@enboss2136" className="text-text dark:text-text-dark hover:text-brand-main transition-colors duration-200">
              <Icon name="youtube" size={20} /></a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mb-4">{t('footer.discover')}</h4>
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
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mb-4">{t('mobileNav.infoSupport')}</h4>
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
        <div className="py-8 border-t border-border dark:border-border-dark flex flex-col sm:flex-row justify-between items-center gap-3">

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