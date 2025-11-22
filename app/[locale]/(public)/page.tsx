'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HeroCarousel, FixedBanner, SkeletonSection, ProductSection, ParkSection, GuideSection, TrainerSection, ArrowRight } from '@/components/home';
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

interface Trainer {
  id: string;
  slug: string;
  name: string;
  image: string;
  area: 'north' | 'center' | 'south';
  sports?: string[];
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
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  useEffect(() => {
    fetchHomepageData();
  }, [locale]);

  const fetchHomepageData = async () => {
    try {
      // Fetch homepage data (products, trainers, guides, settings) and skateparks separately
      const [homepageResponse, skateparksResponse] = await Promise.all([
        fetch(`/api/homepage?locale=${locale}`),
        fetch('/api/skateparks')
      ]);

      // Process homepage data
      if (homepageResponse.ok) {
        const data = await homepageResponse.json();
        setHomepageSettings(data.homepage);
        setProducts(data.products || []);
        setTrainers(data.trainers || []);
        setGuides(data.guides || []);
      }

      // Process skateparks data - filter and sort like the skateparks page
      if (skateparksResponse.ok) {
        const skateparksData = await skateparksResponse.json();
        const allSkateparks = skateparksData.skateparks || [];
        
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
      }
    } catch (error) {
      console.error('Error fetching homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterSubmitting(true);
    
    // TODO: Implement newsletter subscription
    console.log('Newsletter subscription:', newsletterEmail);
    
    setTimeout(() => {
      setNewsletterSubmitting(false);
      setNewsletterEmail('');
      // Translation for alert - using a simple approach since alert doesn't support translations well
      alert(locale === 'he' ? 'תודה שנרשמת!' : 'Thank you for subscribing!');
    }, 1000);
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

      {/* Featured Trainers Section */}
      {trainers.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-2 px-4 xl:px-0 select-none">
              <h2
                className="text-text dark:text-text-dark text-lg font-bold opacity-0 animate-fadeIn"
                style={{ animationDelay: '1300ms' }}
              >
                {t('featuredTrainers')}
              </h2>
              <Link href={`/${locale}/trainers`}>
                <Button 
                  variant="secondary" 
                  className="opacity-0 !px-0 animate-popFadeIn group"
                  style={{ animationDelay: '1600ms' }}
                >
                  {t('viewAllTrainers') || t('explore')}
                  <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4 rtl:rotate-180 transition-all duration-300 group-hover:w-[1.25rem] group-hover:h-[1.25rem] group-hover:ltr:translate-x-[10px] group-hover:rtl:translate-x-[-10px]" />
                </Button>
              </Link>
            </div>
            {loading || !trainers || trainers.length === 0 ? (
              <SkeletonSection />
            ) : (
              <TrainerSection trainers={trainers} t={t} />
            )}
          </div>
        </section>
      )}

      {/* Brand Story Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gray-900 dark:bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black opacity-80"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('welcomeToEnboss')}
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
            {t('brandStory')}
          </p>
          <Link href={`/${locale}/about`}>
            <Button size="lg">
              {t('learnMoreAboutUs')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('stayUpdated')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            {t('newsletterDescription')}
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder={t('enterYourEmail')}
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" disabled={newsletterSubmitting} size="lg">
              {newsletterSubmitting ? t('subscribing') : t('subscribe')}
            </Button>
          </form>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t('newsletterPrivacy')}
          </p>
        </div>
      </section>
    </main>
  );
}

