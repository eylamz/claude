'use client';

import '@/app/[locale]/(public)/button-bg-animated.css';
import '@/app/[locale]/(public)/card-bg-animated.css';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HeroCarousel,
  FixedBanner,
  SkeletonSection,
  ProductSection,
  ParkSection,
  GuideSection,
  ArrowRight,
} from '@/components/home';
import { Button } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { Locale } from '@/i18n';
import { isEcommerceEnabled } from '@/lib/utils/ecommerce';
import { parseSkateparksVersion, isSkateparksCacheFresh } from '@/lib/search-from-cache';

interface HeroCarouselImage {
  desktopImageUrl?: string;
  tabletImageUrl?: string;
  mobileImageUrl?: string;
  link?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  textOverlay?: string;
  order: number;
}

interface HomepageSettings {
  heroCarouselImages: HeroCarouselImage[];
  featuredProductsCount: number;
  featuredSkateparksCount: number;
  featuredTrainersCount: number;
  featuredGuidesCount: number;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  discountPrice?: number;
  hasDiscount?: boolean;
  category?: string;
}

// Full park shape for ParkCard (matches API + ParkCard Skatepark)
interface HomeSkatepark {
  _id: string;
  id?: string;
  slug: string;
  name: { en: string; he: string } | string;
  image?: string;
  imageUrl?: string;
  images?: { url: string; order: number; isFeatured?: boolean }[];
  area: 'north' | 'center' | 'south';
  location?: { lat: number; lng: number };
  amenities?: Record<string, boolean>;
  rating?: number;
  totalReviews?: number;
  isFeatured?: boolean;
  openingYear?: number | null;
  openingMonth?: number | null;
  closingYear?: number | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

interface Guide {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image: string;
  views?: number;
  sports?: string[];
  difficulty?: string;
}

export default function HomePage() {
  const localeFromHook = useLocale();
  const pathname = usePathname();
  // Get locale from pathname as fallback to ensure it matches the URL
  const locale = (pathname?.split('/')?.[1] as Locale) || (localeFromHook as Locale) || 'en';
  const t = useTranslations('common.homepage');
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);
  const ecommerceEnabled = isEcommerceEnabled();

  const [loading, setLoading] = useState(true);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [skateparks, setSkateparks] = useState<HomeSkatepark[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetchHomepageData();
  }, [locale]);

  const fetchHomepageData = async () => {
    try {
      const cacheKey = 'skateparks_cache';
      const versionKey = 'skateparks_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersionRaw = localStorage.getItem(versionKey);
      const { fetchedAt } = parseSkateparksVersion(cachedVersionRaw);

      let allSkateparks: any[] = [];
      let shouldFetchSkateparks = true;

      // If cache exists and was fetched less than 1 hour ago, use it without fetching
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          allSkateparks = parsedData || [];
          if (isSkateparksCacheFresh(fetchedAt)) {
            shouldFetchSkateparks = false; // Don't fetch if cache is fresh
          }
          // If cache exists but older than 1 hour, we still fetch to refresh
        } catch (e) {
          // If cache is corrupted, continue to fetch fresh data
          console.warn('Failed to parse cached skateparks data', e);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(versionKey);
          shouldFetchSkateparks = true;
        }
      }

      // Fetch homepage data and skateparks (if needed) in parallel
      const fetchPromises = [fetch(`/api/homepage?locale=${locale}`)];

      if (shouldFetchSkateparks) {
        fetchPromises.push(fetch('/api/skateparks'));
      }

      const responses = await Promise.all(fetchPromises);

      // Process homepage data
      if (responses[0].ok) {
        const data = await responses[0].json();
        setHomepageSettings(data.homepage);
        setProducts(data.products || []);
        setGuides(data.guides || []);
      }

      // Process skateparks data - fetch if cache didn't exist
      if (shouldFetchSkateparks && responses[1]?.ok) {
        const skateparksData = await responses[1].json();
        const currentVersion = skateparksData.version || 1;
        allSkateparks = skateparksData.skateparks || [];

        // Store in cache with fetch time so we don't refetch for at least 1 hour
        localStorage.setItem(cacheKey, JSON.stringify(allSkateparks));
        localStorage.setItem(
          versionKey,
          JSON.stringify({ version: currentVersion, fetchedAt: new Date().toISOString() })
        );
      }

      // Filter and sort parks from the last 3 years (same logic as skateparks page)
      const currentYear = new Date().getFullYear();
      const recentYearThreshold = currentYear - 2; // Last 3 years (current and previous 2)

      // Sort all parks by opening year (newest first), then by opening month (latest month first) when year is equal
      const sortedParks = [...allSkateparks].sort((a: any, b: any) => {
        const yearDiff = (b.openingYear || 0) - (a.openingYear || 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.openingMonth || 0) - (a.openingMonth || 0);
      });

      // First try to get parks from the last 3 years
      const recentParks = sortedParks.filter(
        (park: any) => park.openingYear && park.openingYear >= recentYearThreshold
      );

      // If we have at least 4 recent parks, use them
      // Otherwise, return recent parks + enough older parks to make at least 4 total
      const filteredParks =
        recentParks.length >= 4
          ? recentParks
          : sortedParks.slice(0, Math.max(4, recentParks.length));

      // Normalize to full park shape for ParkCard (preserve all fields, normalize location)
      const transformedParks: HomeSkatepark[] = filteredParks.map((park: any) => {
        const coords = park.location?.coordinates;
        const id = park._id || park.id;
        return {
          ...park,
          _id: id,
          id,
          name: park.name,
          imageUrl: park.images?.[0]?.url || park.imageUrl || '',
          images: park.images || [],
          area: park.area,
          amenities: park.amenities || {},
          openingYear: park.openingYear ?? null,
          openingMonth: park.openingMonth ?? null,
          closingYear: park.closingYear ?? null,
          createdAt: park.createdAt ?? null,
          isFeatured: park.isFeatured || false,
          location: coords ? { lat: coords[1], lng: coords[0] } : park.location,
        };
      });

      setSkateparks(transformedParks);
    } catch (error) {
      console.error('Error fetching homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className=" w-full bg-background dark:bg-background-dark">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple/10 via-transparent to-brand-main/10 dark:from-purple/5 dark:to-brand-dark/5">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 hero-gradient z-[1] bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]"></div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-5 max-w-[1000px]">
          {/* Main title */}
          <h1
            className="hero-title-gradient font-extrabold mb-6 leading-[1] tracking-[-0.02em]"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 6rem)',
              animation: 'fadeInUp 0.7s ease-out',
            }}
          >
            {t('heroTitle')
              .split('<br/>')
              .map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
          </h1>

          {/* Subtitle */}
          <p
            className="font-normal mb-8 max-w-3xl mx-auto leading-relaxed text-[#5C5C5C] dark:text-[#A0A0A0]"
            style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              lineHeight: '1.6',
              animation: 'fadeInUp 0.7s ease-out 0.2s backwards',
            }}
          >
            {t('heroSubtitle')}
          </p>

          {/* Tagline */}
          <div
            className="font-bold mb-12 text-[#3ba540] dark:text-[#5fbb63]"
            style={{
              fontSize: 'clamp(1.3rem, 3vw, 2rem)',
              letterSpacing: '-0.01em',
              animation: 'fadeInUp 0.7s ease-out 0.25s backwards',
            }}
          >
            {t('heroTagline')}
          </div>

          {/* CTA Button */}
          <Link href={`/${locale}/skateparks`}>
            <Button
              variant="primary"
              className="opacity-0 inline-block !px-12 !py-[18px] !text-lg dark:text-white font-semibold !h-auto rounded-full transition-all duration-300"
              style={{
                background: '#3caa41',
                boxShadow: '0 10px 40px rgba(13, 119, 19, 0.3)',
                animation: 'popFadeIn 0.3s ease-out 0.6s  forwards',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(13, 119, 19, 0.5)';
                e.currentTarget.style.background = '#389f3c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(13, 119, 19, 0.3)';
                e.currentTarget.style.background = '#3fb344';
              }}
            >
              {t('discoverSkateparks')}
            </Button>
          </Link>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#5C5C5C] dark:text-[#A0A0A0]"
          style={{
            fontSize: '0.85rem',
            animation: 'bounce 2s infinite',
          }}
        >
          <div className="text-center">
            <div>↓</div>
            <div style={{ marginTop: '4px' }}>{t('scrollToExplore')}</div>
          </div>
        </div>
      </section>


      {/* Hero Carousel Section */}
      {homepageSettings?.heroCarouselImages && homepageSettings.heroCarouselImages.length > 0 && (
        <HeroCarousel images={homepageSettings.heroCarouselImages} />
      )}

      {/* Featured Products Section - only show if ecommerce is enabled */}
      {ecommerceEnabled && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-2 px-4 xl:px-0 select-none">
              <h2 className="text-header-text dark:text-text-secondary-dark text-lg font-bold">
                {t('newArrivals')}
              </h2>
              <Link href={`/${locale}/shop`}>
                <Button
                  variant="secondary"
                  className="opacity-0 !px-0 animate-popFadeIn group"
                  style={{ animationDelay: '400ms' }}
                >
                  {t('seeAllProducts')}
                  <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4 rtl:rotate-180 transition-all duration-200 group-hover:w-[1.25rem] group-hover:h-[1.25rem] group-hover:ltr:translate-x-[10px] group-hover:rtl:translate-x-[-10px]" />
                </Button>
              </Link>
            </div>
            {loading || !products || products.length === 0 ? (
              <SkeletonSection />
            ) : (
              <ProductSection products={products} t={t} />
            )}
          </div>
        </section>
      )}

      {/* Skateparks Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-2 px-4 select-none">
            <h2
              className="text-text dark:text-text-dark text-lg font-bold opacity-0 animate-fadeIn"
              style={{ animationDelay: '300ms' }}
            >
              {t('discoverSkateparks')}
            </h2>
            <Link href={`/${locale}/skateparks`}>
              <Button
                variant="secondary"
                className="opacity-0 !px-0 animate-popFadeIn group [animation-delay:900ms]"
              >
                {t('viewAllSkateparks')}
                <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4 rtl:rotate-180 transition-all duration-200 group-hover:w-[1.25rem] group-hover:h-[1.25rem] group-hover:ltr:translate-x-[10px] group-hover:rtl:translate-x-[-10px]" />
              </Button>
            </Link>
          </div>
          {loading || !skateparks || skateparks.length === 0 ? (
            <SkeletonSection />
          ) : (
            <ParkSection parks={skateparks} t={t} />
          )}
        </div>
      </section>

      {/* Fixed Banner Section */}
      <section>
        <div className="flex flex-col justify-center w-full max-w-6xl gap-12 mx-auto my-9">
          <FixedBanner isRtl={locale === 'he'} locale={locale} />
        </div>
      </section>

      {/* Featured Guides Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-2 px-4 xl:px-0 select-none">
            <h2
              className="text-text dark:text-text-dark text-lg font-bold opacity-0 animate-fadeIn"
              style={{ animationDelay: '1300ms' }}
            >
              {t('featuredGuides')}
            </h2>
            <Link href={`/${locale}/guides`}>
              <Button
                variant="secondary"
                className="opacity-0 !px-0 animate-popFadeIn group"
                style={{ animationDelay: '1600ms' }}
              >
                {t('viewAllGuides') || t('explore')}
                <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4 rtl:rotate-180 transition-all duration-200 group-hover:w-[1.25rem] group-hover:h-[1.25rem] group-hover:ltr:translate-x-[10px] group-hover:rtl:translate-x-[-10px]" />
              </Button>
            </Link>
          </div>
          {loading || !guides || guides.length === 0 ? (
            <SkeletonSection />
          ) : (
            <GuideSection guides={guides} t={t} />
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-24 sm:mb-32 px-4 ">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 text-text dark:text-text-dark">
            {t('whyEnboss')}
          </h2>
          <p className="text-lg sm:text-xl text-center text-text-secondary dark:text-text-secondary-dark mb-16 max-w-2xl mx-auto">
            {t('whyEnbossSubtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            <Link
              href={`/${locale}/skateparks`}
              className="group block bg-transparent transition-all duration-300"
            >
              <div className=" card-gradient card-anim-1 rounded-[22px] overflow-hidden relative min-h-full">
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
                  <div className="color-7 color" />
                  <div className="color-8 color" />
                </div>
                <div className="card-content relative z-10 p-8 lg:p-10 text-white">
                  <div className="card-icon-gradient card-icon-anim-1 mb-6 shadow-xl">
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
                      <div className="color-7 color" />
                      <div className="color-8 color" />
                    </div>
                    <div className="card-content">
                      <Icon name="mapBold" className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('featureDiscoverTitle')}
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    {t('featureDiscoverDesc')}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/guides`}
              className="group block bg-transparent transition-all duration-300"
            >
              <div className=" card-gradient card-anim-2 rounded-[22px] overflow-hidden relative min-h-full">
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
                  <div className="color-7 color" />
                  <div className="color-8 color" />
                </div>
                <div className="card-content relative z-10 p-8 lg:p-10 text-white shadow-xl">
                  <div className="card-icon-gradient card-icon-anim-2 mb-6">
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
                      <div className="color-7 color" />
                      <div className="color-8 color" />
                    </div>
                    <div className="card-content">
                      <Icon name="bookBold" className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('featureLearnTitle')}
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    {t('featureLearnDesc')}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/skateparks`}
              className="group block  bg-transparent transition-all duration-300"
            >
              <div className=" card-gradient card-anim-3 rounded-[22px] overflow-hidden relative min-h-full">
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
                  <div className="color-7 color" />
                  <div className="color-8 color" />
                </div>
                <div className="card-content relative z-10 p-8 lg:p-10 text-white">
                  <div className="card-icon-gradient card-icon-anim-3 mb-6 shadow-xl">
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
                      <div className="color-7 color" />
                      <div className="color-8 color" />
                    </div>
                    <div className="card-content">
                      <Icon name="reviewBold" className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('featureRateTitle')}
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    {t('featureRateDesc')}
                  </p>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  navigator
                    .share({
                      title: 'Enboss',
                      text: t('whyEnbossSubtitle'),
                      url:
                        typeof window !== 'undefined'
                          ? window.location.origin + (locale ? `/${locale}` : '')
                          : '',
                    })
                    .catch((err) => {
                      console.error('Error sharing:', err);
                    });
                } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  const url =
                    typeof window !== 'undefined'
                      ? window.location.origin + (locale ? `/${locale}` : '')
                      : '';
                  navigator.clipboard.writeText(url);
                }
              }}
              className="group block bg-transparent transition-all duration-300 text-left w-full cursor-pointer"
            >
              <div className="card-gradient card-anim-4 rounded-[22px] overflow-hidden relative min-h-full">
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
                  <div className="color-7 color" />
                  <div className="color-8 color" />
                </div>
                <div className="card-content relative z-10 p-8 lg:p-10 text-white text-start">
                  <div className="card-icon-gradient card-icon-anim-4 mb-6">
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
                      <div className="color-7 color" />
                      <div className="color-8 color" />
                    </div>
                    <div className="card-content">
                      <Icon name="heartBold" className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('featureSpreadTitle')}
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    {t('featureSpreadDesc')}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>


      {/* Final CTA Section */}
      <section
        className="relative 4xl:rounded-2xl h-[400px] md:h-[500px] lg:h-[900px] max-w-[2000px] mx-auto py-20 sm:py-8 md:py-20 lg:py-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden bg-cover bg-bottom bg-no-repeat 4xl:shadow-lg "
        style={{
          backgroundImage: "url('https://res.cloudinary.com/dr0rvohz9/image/upload/v1771769672/wcjoumbnl57r6aqe9nae.webp')",
        }}
      >
        <div className="absolute inset-0  dark:bg-background-dark/30 md:dark:bg-background-dark/20" aria-hidden="true" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-8  [text-shadow:_0px_0px_25px_rgba(0,0,0,1)] leading-tight text-white dark:text-text-dark translate-x-8 lg:translate-x-0 xl:translate-x-[8rem]">
            {t('nextSessionAwaits')
              .split('<br/>')
              .map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
          </h2>
          <Link href={`/${locale}/skateparks`} className="block">

            <Button
              className="px-6 md:px-8 py-4 md:py-6 text-xs md:text-base lg:text-lg font-semibold text-text dark:text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 translate-x-5 sm:translate-x-2.5 lg:translate-x-0 xl:translate-x-20"
            >
              {t('getStarted')}
            </Button>
          </Link>
        </div>
      </section>


      {/* Community Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 text-text dark:text-text-dark">
            {t('togetherWeRide')}
          </h2>
          <p className="text-lg sm:text-xl text-center text-text-secondary dark:text-text-secondary-dark mb-16 max-w-2xl mx-auto">
            {t('togetherWeRideSubtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {[
              {
                label: t('communityProParks'),
                href: `/${locale}/skateparks`,
                gradient: 'from-[#32CD32] to-[#2ECC71]',
                backgroundImage:
                  'https://res.cloudinary.com/dr0rvohz9/image/upload/w_1200,q_90,c_fill/v1743681941/e7yc36ybmw6yxsinuffv.webp',
              },
              {
                label: t('communityGuides'),
                href: `/${locale}/guides`,
                gradient: 'from-[#14A3A8] to-[#32CD32]',
                backgroundImage:
                  'https://placehold.co/800x800/333333/FFFFFF/png?text=What%20is%20a%20skate%20bearing%20beginner%20guide&w=828&q=100',
              },
              {
                label: t('communityEvents'),
                href: `/${locale}/events`,
                gradient: 'from-[#2ECC71] to-[#39FF14]',
                backgroundImage:
                  'https://res.cloudinary.com/dr0rvohz9/image/upload/w_1200,q_90,c_fill/v1756030070/t4wjquwwrdmgb3it1x5x.jpg',
              },
            ].map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={`relative aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} overflow-hidden transition-all duration-300 hover:bg-[length:160%] bg-[length:150%] bg-center saturate-150 block`}
                style={
                  item.backgroundImage
                    ? { backgroundImage: `url(${item.backgroundImage})` }
                    : undefined
                }
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div className="absolute bottom-5 left-5 z-10 font-semibold text-white">
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0D7377] to-[#32CD32] text-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            {[
              { number: '1,000+', label: t('statsActiveRiders') },
              { number: '40+', label: t('statsParksMapped') },
              { number: '25K+', label: t('statsReviewsShared') },
              { number: '∞', label: t('statsPassionJoy') },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2">
                  {stat.number}
                </div>
                <div className="text-lg sm:text-xl font-medium opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built By Section */}
      <footer className="relative pt-14 pb-16  px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple/10 via-transparent to-brand-main/10 dark:from-purple/5 dark:to-brand-dark/5 border-t border-border dark:border-border-dark text-center">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 ">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Built By Riders. For Riders.', 'נבנה על ידי רוכבים. עבור רוכבים.')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
             {tr('Spreading the joy of skateparks across Israel.', 'מפיצים את השמחה על גלגלים ברחבי הארץ.')}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
