'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HeroCarousel, FixedBanner, SkeletonSection, ProductSection, ParkSection, PhotoCollage, GuideSection, ArrowRight } from '@/components/home';
import { Button } from '@/components/ui';
import { Locale } from '@/i18n';

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

interface Skatepark {
  id: string;
  slug: string;
  name: string;
  image: string;
  area: 'north' | 'center' | 'south';
  openingYear?: number;
}

interface Guide {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image: string;
  views?: number;
}

export default function HomePage() {
  const localeFromHook = useLocale();
  const pathname = usePathname();
  // Get locale from pathname as fallback to ensure it matches the URL
  const locale = (pathname?.split('/')?.[1] as Locale) || (localeFromHook as Locale) || 'en';
  const t = useTranslations('common.homepage');
  
  const [loading, setLoading] = useState(true);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [skateparks, setSkateparks] = useState<Skatepark[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetchHomepageData();
  }, [locale]);

  const fetchHomepageData = async () => {
    try {
      const cacheKey = 'skateparks_cache';
      const versionKey = 'skateparks_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersion = localStorage.getItem(versionKey);
      
      let allSkateparks: any[] = [];
      let shouldFetchSkateparks = true;

      // If cache exists, use it immediately without fetching
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          allSkateparks = parsedData || [];
          shouldFetchSkateparks = false; // Don't fetch if we have cache
          // No version checking or fetching when cache exists
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
        
        // Store in cache
        localStorage.setItem(cacheKey, JSON.stringify(allSkateparks));
        localStorage.setItem(versionKey, currentVersion.toString());
      }
      
      // Filter and sort parks from the last 3 years (same logic as skateparks page)
      const currentYear = new Date().getFullYear();
      const recentYearThreshold = currentYear - 2; // Last 3 years (current and previous 2)
      
      // Sort all parks by opening year (newest first)
      const sortedParks = [...allSkateparks].sort((a: any, b: any) => 
          (b.openingYear || 0) - (a.openingYear || 0)
        );
        
        // First try to get parks from the last 3 years
        const recentParks = sortedParks.filter((park: any) => 
          park.openingYear && park.openingYear >= recentYearThreshold
        );
        
        // If we have at least 4 recent parks, use them
        // Otherwise, return recent parks + enough older parks to make at least 4 total
        const filteredParks = recentParks.length >= 4 
          ? recentParks 
          : sortedParks.slice(0, Math.max(4, recentParks.length));
        
        // Transform to match the expected format
        const transformedParks = filteredParks.map((park: any) => {
          const name = typeof park.name === 'string' 
            ? park.name 
            : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;
          
          const image = park.images && park.images.length > 0
            ? park.images.find((img: any) => img.isFeatured)?.url || park.images[0]?.url
            : park.imageUrl || '';
          
          return {
            id: park._id || park.id,
            slug: park.slug,
            name,
            image,
            area: park.area,
            openingYear: park.openingYear,
          };
        });
        
        setSkateparks(transformedParks);
    } catch (error) {
      console.error('Error fetching homepage data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
        </div>
      </div>
    );
  }


  return (
    <main className="w-full bg-background dark:bg-background-dark">

      {/* Hero Carousel Section */}
      {homepageSettings?.heroCarouselImages && homepageSettings.heroCarouselImages.length > 0 && (
        <HeroCarousel images={homepageSettings.heroCarouselImages} />
      )}
      
      {/* Featured Products Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2 px-4 xl:px-0 select-none">
            <h2 className="text-header-text dark:text-text-secondary-dark text-lg font-bold">{t('newArrivals')}</h2>
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

      {/* Skateparks Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
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

      {/* Photo Collage Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 overflow-visible">
        <div className="max-w-7xl mx-auto overflow-visible">
          {loading || !skateparks || skateparks.length === 0 ? (
            <SkeletonSection />
          ) : (
            <PhotoCollage parks={skateparks} />
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
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

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#FAFAFA] dark:bg-[#1A1A1A]">
        {/* Animated gradient overlay */}
        <div 
          className="absolute inset-0 hero-gradient z-[1]"
          style={{
            background: 'radial-gradient(circle at 30% 50%, rgba(13, 115, 119, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(50, 205, 50, 0.1) 0%, transparent 50%)'
          }}
        ></div>
        
        {/* Hero content */}
        <div className="relative z-10 text-center px-5 max-w-[1000px]">
          {/* Main title */}
          <h1 
            className="hero-title-gradient font-extrabold mb-6 leading-[1.1] tracking-[-0.02em]"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 6rem)',
              animation: 'fadeInUp 1s ease-out'
            }}
          >
            {t('heroTitle').split('<br/>').map((line, i, arr) => (
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
              animation: 'fadeInUp 1s ease-out 0.2s backwards'
            }}
          >
            {t('heroSubtitle')}
          </p>
          
          {/* Tagline */}
          <div 
            className="font-bold mb-12 text-[#0D7377] dark:text-[#14A3A8]"
            style={{
              fontSize: 'clamp(1.3rem, 3vw, 2rem)',
              letterSpacing: '-0.01em',
              animation: 'fadeInUp 1s ease-out 0.3s backwards'
            }}
          >
            {t('heroTagline')}
          </div>
          
          {/* CTA Button */}
          <Link href={`/${locale}/skateparks`}>
            <button
              className="inline-block px-12 py-[18px] text-lg font-semibold text-white rounded-full transition-all duration-300"
              style={{
                background: '#0D7377',
                boxShadow: '0 10px 40px rgba(13, 115, 119, 0.3)',
                animation: 'fadeInUp 1s ease-out 0.4s backwards'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(13, 115, 119, 0.5)';
                e.currentTarget.style.background = '#005F60';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(13, 115, 119, 0.3)';
                e.currentTarget.style.background = '#0D7377';
              }}
            >
              {t('discoverSkateparks')}
            </button>
          </Link>
        </div>
        
        {/* Scroll indicator */}
        <div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#5C5C5C] dark:text-[#A0A0A0]"
          style={{
            fontSize: '0.85rem',
            animation: 'bounce 2s infinite'
          }}
        >
          <div className="text-center">
            <div>↓</div>
            <div style={{ marginTop: '4px' }}>{t('scrollToExplore')}</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 text-text dark:text-text-dark">
            {t('whyEnboss')}
          </h2>
          <p className="text-lg sm:text-xl text-center text-text-secondary dark:text-text-secondary-dark mb-16 max-w-2xl mx-auto">
            {t('whyEnbossSubtitle')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {[
              { icon: '🗺️', title: t('featureDiscoverTitle'), description: t('featureDiscoverDesc') },
              { icon: '👥', title: t('featureBuildTitle'), description: t('featureBuildDesc') },
              { icon: '⭐', title: t('featureRateTitle'), description: t('featureRateDesc') },
              { icon: '📈', title: t('featureTrackTitle'), description: t('featureTrackDesc') },
              { icon: '🎯', title: t('featurePlanTitle'), description: t('featurePlanDesc') },
              { icon: '🌍', title: t('featureSpreadTitle'), description: t('featureSpreadDesc') },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-[rgba(13,115,119,0.05)] dark:bg-[rgba(20,163,168,0.08)] border border-[rgba(13,115,119,0.15)] dark:border-[rgba(20,163,168,0.2)] rounded-3xl p-8 lg:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-[#0D7377] dark:hover:border-[#14A3A8]"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#0D7377] to-[#32CD32] rounded-2xl flex items-center justify-center text-3xl mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-text dark:text-text-dark">
                  {feature.title}
                </h3>
                <p className="text-text-secondary dark:text-text-secondary-dark leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 text-text dark:text-text-dark">
            {t('togetherWeRide')}
          </h2>
          <p className="text-lg sm:text-xl text-center text-text-secondary dark:text-text-secondary-dark mb-16 max-w-2xl mx-auto">
            {t('togetherWeRideSubtitle')}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              { label: t('communityStreetSessions'), gradient: 'from-[#0D7377] to-[#14A3A8]' },
              { label: t('communityProParks'), gradient: 'from-[#32CD32] to-[#2ECC71]' },
              { label: t('communityLocalSpots'), gradient: 'from-[#14A3A8] to-[#32CD32]' },
              { label: t('communityEvents'), gradient: 'from-[#2ECC71] to-[#39FF14]' },
            ].map((item, index) => (
              <div
                key={index}
                className={`relative aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} overflow-hidden border border-[rgba(13,115,119,0.15)] dark:border-[rgba(20,163,168,0.2)] transition-transform duration-300 hover:scale-105`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div className="absolute bottom-5 left-5 z-10 font-semibold text-white">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0D7377] to-[#32CD32] text-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            {[
              { number: '10K+', label: t('statsActiveRiders') },
              { number: '500+', label: t('statsParksMapped') },
              { number: '25K+', label: t('statsReviewsShared') },
              { number: '∞', label: t('statsPassionJoy') },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2">
                  {stat.number}
                </div>
                <div className="text-lg sm:text-xl font-medium opacity-90">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 sm:py-40 px-4 sm:px-6 lg:px-8 bg-background dark:bg-background-dark text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight text-text dark:text-text-dark">
            {t('nextSessionAwaits').split('<br/>').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h2>
          <Link href={`/${locale}/skateparks`}>
            <Button size="lg" className="px-12 py-6 text-lg font-semibold bg-[#32CD32] hover:bg-[#2ECC71] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              {t('getStartedFree')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="text-xl font-semibold text-[#0D7377] dark:text-[#14A3A8] mb-5">
            {t('builtByRiders')}
          </div>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            © {new Date().getFullYear()} Enboss. {t('footerTagline')}
          </p>
        </div>
      </footer>
    </main>
  );
}

