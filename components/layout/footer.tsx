'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/components/icons/Icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Button } from '../ui/button';

interface FooterNavSection {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
}

export const Footer: FC = () => {
  const locale = useLocale();
  const t = useTranslations('common');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use logo icon, fallback to logo-hostage if needed
  const logoIconName: 'logo-hostage3' | 'logo' = 'logo';

  // Example navigation sections - you can customize these
  const navSections: FooterNavSection[] = [
    {
      title: t('footer.platform'),
      links: [
        { label: t('footer.features'), href: `/${locale}/features` },
        { label: t('footer.pricing'), href: `/${locale}/pricing` },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { label: t('footer.documentation'), href: `/${locale}/docs` },
        { label: t('footer.contact'), href: `/${locale}/contact` },
      ],
    },
  ];

  if (!isMounted) {
    return null;
  }

  return (
    <footer role="contentinfo" className="footer pt-6 position-relative">
      <h2 className="sr-only">{t('footer.siteWideLinks')}</h2>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap py-5 mb-5">
          {/* Logo and Newsletter Section */}
          <section className="w-full lg:w-1/3 mb-5 lg:pe-4">
            <Link 
              href={`/${locale}`}
              className="inline-block h-auto text-gray-900 dark:text-gray-100"
              aria-label={t('footer.goToHomepage')}
            >
              <Icon 
                name={logoIconName} 
                className="w-[124px] h-[39px] sm:w-[128px] sm:h-[24px] text-brand-main"
              />
            </Link>

            <h3 className="font-semibold mt-4 mb-0 text-gray-900 dark:text-gray-100">
              {t('footer.subscribeToNewsletter')}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {t('footer.newsletterDescription')}
            </p>

            <a 
              className="inline-block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300  mb-4"
              href={`/${locale}/newsletter`}
            >
              <Button 
              variant="ghost"
              className="w-full"
              >
                 {t('footer.subscribe')}
              </Button>
            </a>
          </section>

          {/* Navigation Sections */}
          {navSections.map((section, index) => (
            <nav
              key={section.title}
              className={`w-1/2 sm:w-1/3 lg:w-1/6 mb-6 lg:mb-2 ${
                index === 0 ? 'lg:pl-4' : 'lg:pl-4'
              }`}
              aria-labelledby={`footer-title-${section.title.toLowerCase()}`}
            >
              <h3
                className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-3 font-normal"
                id={`footer-title-${section.title.toLowerCase()}`}
              >
                {section.title}
              </h3>
              <ul className="list-none text-gray-600 dark:text-gray-400 text-sm space-y-3">
                {section.links.map((link) => (
                  <li key={link.href} className="leading-tight">
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bg-background-secondary dark:bg-background-secondary-dark">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
          <nav className="w-full" aria-label={t('footer.legalAndResourceLinks')}>
            <ul className="list-none flex flex-wrap items-start gap-x-3 text-gray-600 dark:text-gray-400">
              <li className="font-poppins">
                © <time dateTime="2025">2025</time> ENBOSS
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/sitemap`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {t('footer.sitemap')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Social Media and Controls */}
          <nav
            aria-label={t('footer.socialMediaAndSettings')}
            className="flex w-full justify-end items-center gap-6 mt-3 md:mt-0"
          >
            {/* Social Media Icons - Add your social links here */}
            <div className="flex items-center justify-end gap-3">
              <a
                href="https://instagram.com"
                className="h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                aria-label={t('footer.instagram')}
              >
                <Icon name="instagram" className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com"
                className="h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                aria-label={t('footer.youtube')}
              >
                <Icon name="youtube" className="w-5 h-5" />
              </a>
              <a
                href="https://tiktok.com"
                className="h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                aria-label={t('footer.tiktok')}
              >
                <Icon name="tiktok" className="w-5 h-5" />
              </a>
            </div>

             {/* Language Switcher */}
             <div className="flex items-center">
               <LanguageSwitcher className="text-xs" />
             </div>

             {/* Theme Toggle */}
             <div className="flex items-center">
               <ThemeToggle className="text-xs" />
             </div>
          </nav>
        </div>
      </div>
    </footer>
  );
};
