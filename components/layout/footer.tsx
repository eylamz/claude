'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/components/icons/Icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Youtube,
  Mail,
  MapPin,
  Phone,
  Send,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export function Footer() {
  const locale = useLocale();
  const t = useTranslations('common');

  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Newsletter signup handler
  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubscribing) return;

    setIsSubscribing(true);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setSubscribeStatus('success');
      setEmail('');
      
      // Reset success message after 3 seconds
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    } catch (error) {
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    } finally {
      setIsSubscribing(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-800">
      
      {/* ========================================
          MAIN FOOTER CONTENT
      ======================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* ========================================
              BRAND SECTION (Logo + Tagline + Mission)
          ======================================== */}
          <div className="lg:col-span-4">
            {/* Logo */}
            <Link href={`/${locale}`} className="inline-block mb-4">
              <Icon name="logo-hostage3" className="w-32 h-10 text-brand-main" />
            </Link>
            
            {/* Brand Tagline */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('footer.brandTagline')}
            </h3>
            
            {/* Mission Statement */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {t('footer.missionStatement')}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 text-white hover:scale-110 transition-transform"
                aria-label={t('footer.instagram')}
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:scale-110 transition-transform"
                aria-label={t('footer.facebook')}
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 text-white hover:scale-110 transition-transform"
                aria-label={t('footer.twitter')}
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white hover:scale-110 transition-transform"
                aria-label={t('footer.youtube')}
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>

            {/* Social Proof Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-brand-main/10 dark:bg-brand-main/20 border border-brand-main/20">
              <div className="flex -space-x-2">
                {/* Avatar placeholders */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 border-2 border-white dark:border-gray-900" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white dark:border-gray-900" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-white dark:border-gray-900" />
              </div>
              <span className="text-xs font-semibold text-brand-main">
                {t('footer.activeRiders')}
              </span>
            </div>
          </div>

          {/* ========================================
              NAVIGATION COLUMNS
          ======================================== */}
          
          {/* Discover Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t('footer.discover')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/skateparks`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.findParks')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/events`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.events')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/trainers`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors inline-flex items-center gap-2"
                >
                  {t('footer.findCoaches')}
                  <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-full">
                    {t('footer.soon')}
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/guides`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.guidesTips')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/community`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.community')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Shop Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t('footer.shop')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/shop`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/shop/category/skateboarding`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.skateboarding')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/shop/category/bmx`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.bmx')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/shop/category/apparel`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.apparel')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/shop/deals`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors font-semibold"
                >
                  {t('footer.dealsOffers')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t('footer.company')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/careers`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.careers')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/press`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.pressKit')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/blog`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
                >
                  {t('footer.blog')}
                </Link>
              </li>
            </ul>
          </div>

          {/* ========================================
              NEWSLETTER SIGNUP
          ======================================== */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t('footer.stayUpdated')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('footer.newsletterDescriptionNew')}
            </p>
            
            <form onSubmit={handleNewsletterSignup} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.enterYourEmail')}
                  disabled={isSubscribing || subscribeStatus === 'success'}
                  className="w-full px-4 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-main focus:border-transparent outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button
                type="submit"
                disabled={isSubscribing || subscribeStatus === 'success' || !email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-main to-green-500 hover:from-brand-main/90 hover:to-green-500/90 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('footer.subscribing')}</span>
                  </>
                ) : subscribeStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('footer.subscribed')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('footer.subscribe')}</span>
                  </>
                )}
              </button>
            </form>
            {subscribeStatus === 'error' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                {t('footer.subscribeError')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ========================================
          BOTTOM BAR (Legal Links + Copyright)
      ======================================== */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Copyright + Brand Statement */}
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {currentYear} Enboss. {t('footer.allRightsReserved')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('footer.builtByRiders')}
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link
                href={`/${locale}/privacy`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
              >
                {t('footer.privacyPolicy')}
              </Link>
              <Link
                href={`/${locale}/terms`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
              >
                {t('footer.termsOfService')}
              </Link>
              <Link
                href={`/${locale}/cookies`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
              >
                {t('footer.cookiePolicy')}
              </Link>
              <Link
                href={`/${locale}/accessibility`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
              >
                {t('footer.accessibility')}
              </Link>
            </div>

            {/* Language Switcher and Theme Toggle */}
            <div className="flex items-center gap-4">
              <LanguageSwitcher className="text-xs" />
              <ThemeToggle className="text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          OPTIONAL: CONTACT INFO BAR (Mobile-Friendly)
      ======================================== */}
      <div className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a
              href={`mailto:${t('footer.contactEmail')}`}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{t('footer.contactEmail')}</span>
            </a>
            <a
              href={`tel:${t('footer.contactPhone')}`}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-main transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>{t('footer.contactPhone')}</span>
            </a>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{t('footer.contactLocation')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
