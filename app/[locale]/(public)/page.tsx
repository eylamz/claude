'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SkeletonSection } from '@/components/home/skeleton-section';
import { ArrowRight } from '@/components/home/arrow-right';
import { Button } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Locale } from '@/i18n';
import { isEcommerceEnabled } from '@/lib/utils/ecommerce';
import { parseSkateparksVersion, isSkateparksCacheFresh } from '@/lib/search-from-cache';
import { optimizeCloudinaryUrl, COMMUNITY_TILE_WIDTH, CTA_BG_WIDTH } from '@/lib/cloudinary-utils';

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

// Minimal placeholder to avoid loading full HeroCarousel on initial parse
function HeroCarouselPlaceholder() {
  return (
    <div className="pt-[15px] bg-background dark:bg-background-dark w-full flex flex-col items-center" aria-hidden>
      <div className="relative w-full h-screen max-h-[500px] min-h-[500px] md:min-h-[370px] md:max-h-[370px] overflow-hidden bg-background dark:bg-background-dark pt-10">
        <div className="relative max-w-[2000px] mx-auto w-full h-full px-2 sm:px-4 md:px-6 flex items-end justify-center gap-5">
          <div className="flex-none w-[275px] sm:w-[220px] md:w-[690px] h-[97%] min-h-[485px] md:min-h-[358px] bg-card dark:bg-card-dark opacity-90 animate-pulse" />
          <div className="flex-none w-[275px] sm:w-[220px] md:w-[690px] h-[97%] min-h-[500px] md:min-h-[373px] bg-card dark:bg-card-dark animate-pulse" />
          <div className="flex-none w-[275px] sm:w-[220px] md:w-[690px] h-[97%] min-h-[485px] md:min-h-[358px] bg-card dark:bg-card-dark opacity-90 animate-pulse" />
        </div>
      </div>
      <div className="w-full flex gap-2 sm:gap-2.5 md:gap-3 items-center justify-center py-1 sm:py-2 md:py-3">
        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-200 dark:bg-white/30 rounded-full" />
        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-200 dark:bg-white/30 rounded-full" />
        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-200 dark:bg-white/30 rounded-full" />
      </div>
    </div>
  );
}

const HeroCarouselSection = dynamic<{ images: HeroCarouselImage[] }>(
  () =>
    import('@/components/home/hero-carousel').then((m) => {
      function Section(props: { images: HeroCarouselImage[] }) {
        return props.images?.length ? <m.default images={props.images} /> : <m.HeroCarouselSkeleton />;
      }
      return { default: Section };
    }),
  { loading: () => <HeroCarouselPlaceholder />, ssr: true }
);

const ProductSection = dynamic(
  () => import('@/components/home').then((m) => m.ProductSection),
  { loading: () => <SkeletonSection />, ssr: true }
);

const ParkSection = dynamic(
  () => import('@/components/home').then((m) => m.ParkSection),
  { loading: () => <SkeletonSection />, ssr: true }
);

const GuideSection = dynamic(
  () => import('@/components/home').then((m) => m.GuideSection),
  { loading: () => <SkeletonSection />, ssr: true }
);

const FixedBanner = dynamic(
  () => import('@/components/home').then((m) => m.FixedBanner),
  {
    loading: () => (
      <div className="w-full h-[200px] sm:h-[220px] xl:rounded-2xl bg-card dark:bg-card-dark animate-pulse" aria-hidden />
    ),
    ssr: true,
  }
);

/** Inline SVGs for feature cards to avoid loading the full Icon module (100+ SVGs) on the homepage. */
const FeatureIconMap = ({
  className = '',
  name,
}: {
  className?: string;
  name: 'mapBold' | 'bookBold' | 'calendarBold' | 'reviewBold' | 'heartBold';
}) => {
  const viewBox = name === 'reviewBold' ? '0 0 150 157' : '0 0 24 24';
  const path =
    name === 'mapBold'
      ? <>
          <path d="M7.62906 3.56969C7.80845 3.47184 7.99906 3.62237 7.99906 3.8267V17.3825C7.99906 17.6058 7.84665 17.7946 7.64926 17.8988C7.64249 17.9024 7.63576 17.906 7.62906 17.9097L5.27906 19.2497C3.63906 20.1897 2.28906 19.4097 2.28906 17.5097V7.77969C2.28906 7.14969 2.73906 6.36969 3.29906 6.04969L7.62906 3.56969Z" fill="currentColor" />
          <path d="M14.7219 6.1029C14.8922 6.18725 15 6.36089 15 6.55096V19.7041C15 20.0726 14.615 20.3145 14.283 20.1546L10.033 18.107C9.85998 18.0236 9.75 17.8485 9.75 17.6565V4.4462C9.75 4.07534 10.1396 3.83355 10.4719 3.99814L14.7219 6.1029Z" fill="currentColor" />
          <path d="M22 6.49006V16.2201C22 16.8501 21.55 17.6301 20.99 17.9501L17.4986 19.951C17.1653 20.1421 16.75 19.9014 16.75 19.5172V6.33038C16.75 6.15087 16.8462 5.98513 17.0021 5.89615L19.01 4.75006C20.65 3.81006 22 4.59006 22 6.49006Z" fill="currentColor" />
        </>
      : name === 'bookBold'
        ? <>
            <path d="M20.5 16V18.5C20.5 20.43 18.93 22 17 22H7C5.07 22 3.5 20.43 3.5 18.5V17.85C3.5 16.28 4.78 15 6.35 15H19.5C20.05 15 20.5 15.45 20.5 16Z" fill="currentColor" />
            <path d="M15.5 2H8.5C4.5 2 3.5 3 3.5 7V14.58C4.26 13.91 5.26 13.5 6.35 13.5H19.5C20.05 13.5 20.5 13.05 20.5 12.5V7C20.5 3 19.5 2 15.5 2ZM13 10.75H8C7.59 10.75 7.25 10.41 7.25 10C7.25 9.59 7.59 9.25 8 9.25H13C13.41 9.25 13.75 9.59 13.75 10C13.75 10.41 13.41 10.75 13 10.75ZM16 7.25H8C7.59 7.25 7.25 6.91 7.25 6.5C7.25 6.09 7.59 5.75 8 5.75H16C16.41 5.75 16.75 6.09 16.75 6.5C16.75 6.91 16.41 7.25 16 7.25Z" fill="currentColor" />
          </>
        : name === 'calendarBold'
          ? <>
              <path d="M16.7502 3.56V2C16.7502 1.59 16.4102 1.25 16.0002 1.25C15.5902 1.25 15.2502 1.59 15.2502 2V3.5H8.75023V2C8.75023 1.59 8.41023 1.25 8.00023 1.25C7.59023 1.25 7.25023 1.59 7.25023 2V3.56C4.55023 3.81 3.24023 5.42 3.04023 7.81C3.02023 8.1 3.26023 8.34 3.54023 8.34H20.4602C20.7502 8.34 20.9902 8.09 20.9602 7.81C20.7602 5.42 19.4502 3.81 16.7502 3.56Z" fill="CurrentColor"></path> <path d="M20 9.83984H4C3.45 9.83984 3 10.2898 3 10.8398V16.9998C3 19.9998 4.5 21.9998 8 21.9998H16C19.5 21.9998 21 19.9998 21 16.9998V10.8398C21 10.2898 20.55 9.83984 20 9.83984ZM9.21 18.2098C9.16 18.2498 9.11 18.2998 9.06 18.3298C9 18.3698 8.94 18.3998 8.88 18.4198C8.82 18.4498 8.76 18.4698 8.7 18.4798C8.63 18.4898 8.57 18.4998 8.5 18.4998C8.37 18.4998 8.24 18.4698 8.12 18.4198C7.99 18.3698 7.89 18.2998 7.79 18.2098C7.61 18.0198 7.5 17.7598 7.5 17.4998C7.5 17.2398 7.61 16.9798 7.79 16.7898C7.89 16.6998 7.99 16.6298 8.12 16.5798C8.3 16.4998 8.5 16.4798 8.7 16.5198C8.76 16.5298 8.82 16.5498 8.88 16.5798C8.94 16.5998 9 16.6298 9.06 16.6698C9.11 16.7098 9.16 16.7498 9.21 16.7898C9.39 16.9798 9.5 17.2398 9.5 17.4998C9.5 17.7598 9.39 18.0198 9.21 18.2098ZM9.21 14.7098C9.02 14.8898 8.76 14.9998 8.5 14.9998C8.24 14.9998 7.98 14.8898 7.79 14.7098C7.61 14.5198 7.5 14.2598 7.5 13.9998C7.5 13.7398 7.61 13.4798 7.79 13.2898C8.07 13.0098 8.51 12.9198 8.88 13.0798C9.01 13.1298 9.12 13.1998 9.21 13.2898C9.39 13.4798 9.5 13.7398 9.5 13.9998C9.5 14.2598 9.39 14.5198 9.21 14.7098ZM12.71 18.2098C12.52 18.3898 12.26 18.4998 12 18.4998C11.74 18.4998 11.48 18.3898 11.29 18.2098C11.11 18.0198 11 17.7598 11 17.4998C11 17.2398 11.11 16.9798 11.29 16.7898C11.66 16.4198 12.34 16.4198 12.71 16.7898C12.89 16.9798 13 17.2398 13 17.4998C13 17.7598 12.89 18.0198 12.71 18.2098ZM12.71 14.7098C12.66 14.7498 12.61 14.7898 12.56 14.8298C12.5 14.8698 12.44 14.8998 12.38 14.9198C12.32 14.9498 12.26 14.9698 12.2 14.9798C12.13 14.9898 12.07 14.9998 12 14.9998C11.74 14.9998 11.48 14.8898 11.29 14.7098C11.11 14.5198 11 14.2598 11 13.9998C11 13.7398 11.11 13.4798 11.29 13.2898C11.38 13.1998 11.49 13.1298 11.62 13.0798C11.99 12.9198 12.43 13.0098 12.71 13.2898C12.89 13.4798 13 13.7398 13 13.9998C13 14.2598 12.89 14.5198 12.71 14.7098ZM16.21 18.2098C16.02 18.3898 15.76 18.4998 15.5 18.4998C15.24 18.4998 14.98 18.3898 14.79 18.2098C14.61 18.0198 14.5 17.7598 14.5 17.4998C14.5 17.2398 14.61 16.9798 14.79 16.7898C15.16 16.4198 15.84 16.4198 16.21 16.7898C16.39 16.9798 16.5 17.2398 16.5 17.4998C16.5 17.7598 16.39 18.0198 16.21 18.2098ZM16.21 14.7098C16.16 14.7498 16.11 14.7898 16.06 14.8298C16 14.8698 15.94 14.8998 15.88 14.9198C15.82 14.9498 15.76 14.9698 15.7 14.9798C15.63 14.9898 15.56 14.9998 15.5 14.9998C15.24 14.9998 14.98 14.8898 14.79 14.7098C14.61 14.5198 14.5 14.2598 14.5 13.9998C14.5 13.7398 14.61 13.4798 14.79 13.2898C14.89 13.1998 14.99 13.1298 15.12 13.0798C15.3 12.9998 15.5 12.9798 15.7 13.0198C15.76 13.0298 15.82 13.0498 15.88 13.0798C15.94 13.0998 16 13.1298 16.06 13.1698C16.11 13.2098 16.16 13.2498 16.21 13.2898C16.39 13.4798 16.5 13.7398 16.5 13.9998C16.5 14.2598 16.39 14.5198 16.21 14.7098Z" fill="CurrentColor"></path>
            </>
          : name === 'reviewBold'
            ? <path d="M71.32,15.2c50.4-5.53,84.36,47.54,56.05,89.85-18.01,26.92-54.46,33.04-81.21,15.2l-16.84,3.96-1.12-2.07c.55-4.12,4.08-12.6,3.59-16.25-.29-2.15-5.49-9.82-6.73-13.21C12.66,58.75,34.91,19.19,71.32,15.2ZM104.05,60.87c-2.07-1.95-9.32-.8-13.18-3.21-4.78-2.98-4.76-12.54-10.97-12.93-7.17-.45-6.88,10.4-12.42,13.32-4.68,2.46-15.99-.24-14.67,8.8.56,3.84,7.73,7.47,8.58,10.36,1.57,5.31-2.33,11.68.14,15.77,4.56,7.55,12.13-1.41,17.47-1.63,5.95-.25,10.73,7.2,16.3,3.51,6.17-4.09.45-10.84,2.5-17.4,1.44-4.61,13.46-9.8,6.26-16.58Z" fill="currentColor" />
            : (
              <path d="M16.44 3.10156C14.63 3.10156 13.01 3.98156 12 5.33156C10.99 3.98156 9.37 3.10156 7.56 3.10156C4.49 3.10156 2 5.60156 2 8.69156C2 9.88156 2.19 10.9816 2.52 12.0016C4.1 17.0016 8.97 19.9916 11.38 20.8116C11.72 20.9316 12.28 20.9316 12.62 20.8116C15.03 19.9916 19.9 17.0016 21.48 12.0016C21.81 10.9816 22 9.88156 22 8.69156C22 5.60156 19.51 3.10156 16.44 3.10156Z" fill="currentColor" />
            );
  return (
    <svg className={className} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {path}
    </svg>
  );
};

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
  const tr = useCallback(
    (enText: string, heText: string) => (locale === 'he' ? heText : enText),
    [locale]
  );
  const ecommerceEnabled = isEcommerceEnabled();

  const [loading, setLoading] = useState(true);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [skateparks, setSkateparks] = useState<HomeSkatepark[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [communityClickedIndex, setCommunityClickedIndex] = useState<number | null>(null);
  const [heroCtaLoading, setHeroCtaLoading] = useState(false);
  const [finalCtaLoading, setFinalCtaLoading] = useState(false);
  const router = useRouter();

  // Final CTA background: low-quality first, then full-quality by width after page load (like hero carousel)
  const CTA_BG_BASE =
    'https://res.cloudinary.com/dr0rvohz9/image/upload/v1771769672/wcjoumbnl57r6aqe9nae.webp';
  const ctaLowUrl = optimizeCloudinaryUrl(CTA_BG_BASE, { width: 500, quality: 40 });
  const [ctaBgUrl, setCtaBgUrl] = useState(ctaLowUrl);
  const ctaSectionRef = useRef<HTMLElement>(null);
  const [ctaContainerWidth, setCtaContainerWidth] = useState(0);

  useEffect(() => {
    fetchHomepageData();
  }, [locale]);

  // Measure CTA section width for responsive full-quality background
  useEffect(() => {
    const el = ctaSectionRef.current;
    if (!el) return;
    let rafId: number | null = null;
    let lastWidth = 0;
    const onResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!ctaSectionRef.current) return;
        const w = ctaSectionRef.current.clientWidth;
        if (w === lastWidth) return;
        lastWidth = w;
        setCtaContainerWidth(w);
      });
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    setCtaContainerWidth(el.clientWidth);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  // After page is done loading, preload full-quality CTA background and swap
  const ctaHighWidth = useMemo(() => {
    const w = ctaContainerWidth || (typeof window !== 'undefined' ? window.innerWidth : 0) || CTA_BG_WIDTH;
    // Ensure a minimum of 1200px width for better perceived sharpness
    return Math.min(2000, Math.max(1200, w));
  }, [ctaContainerWidth]);
  const ctaHighUrl = useMemo(
    () => optimizeCloudinaryUrl(CTA_BG_BASE, { width: ctaHighWidth, quality: 100 }),
    [ctaHighWidth]
  );
  useEffect(() => {
    if (loading || !ctaHighUrl) return;
    let cancelled = false;
    const img = new Image();
    img.src = ctaHighUrl;
    img.onload = () => {
      if (!cancelled) setCtaBgUrl(ctaHighUrl);
    };
    return () => {
      cancelled = true;
      img.src = '';
    };
  }, [loading, ctaHighUrl]);

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
      <section className="relative min-h-[500px] h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple/10 via-transparent to-brand-main/10 dark:from-purple/5 dark:to-brand-dark/5">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 hero-gradient z-[1] bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]"></div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 sm:px-5 max-w-[1000px] w-full">
          {/* Main title - scales with viewport, stays readable at 150% zoom */}
          <h1
            className={`hero-title-gradient mb-4 sm:mb-6 leading-[1.1] tracking-[-0.02em] ${locale === 'he' ? 'font-bold' : 'font-extrabold'}`}
            style={{
              fontSize: 'clamp(2rem, 5.5vw + 1rem, 4rem)',
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
            className="font-normal mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed text-[#5C5C5C] dark:text-[#A0A0A0]"
            style={{
              fontSize: 'clamp(0.9375rem, 1.5vw + 0.75rem, 1.25rem)',
              lineHeight: '1.6',
              animation: 'fadeInUp 0.7s ease-out 0.2s backwards',
            }}
          >
            {t('heroSubtitle')}
          </p>

          {/* Tagline */}
          <div
            className="font-bold mb-8 sm:mb-12 text-brand-text dark:text-brand-dark"
            style={{
              fontSize: 'clamp(1.0625rem, 2vw + 0.75rem, 1.5rem)',
              letterSpacing: '-0.01em',
              animation: 'fadeInUp 0.7s ease-out 0.25s backwards',
            }}
          >
            {t('heroTagline')}
          </div>

          {/* CTA Button - responsive size for zoom and viewport */}
          <Button
            variant="primaryReverse"
            className="opacity-0 inline-block dark:text-black font-semibold !h-auto rounded-full transition-all duration-300 dark:bg-brand-dark hover:bg-brand-text/95 dark:hover:bg-brand-dark/95"
            style={{
              padding: 'clamp(0.625rem, 1.5vw + 0.25rem, 1rem) clamp(1.5rem, 3.5vw + 0.5rem, 2.75rem)',
              fontSize: 'clamp(0.9375rem, 1.25vw + 0.625rem, 1.0625rem)',
              boxShadow: '0 10px 40px rgba(13, 119, 19, 0.3)',
              animation: 'popFadeIn 0.3s ease-out 0.6s  forwards',
            }}
            onMouseEnter={(e) => {
              if (heroCtaLoading) return;
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 15px 50px rgba(13, 119, 19, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(13, 119, 19, 0.3)';
            }}
            disabled={heroCtaLoading}
            onClick={() => {
              setHeroCtaLoading(true);
              router.push(`/${locale}/skateparks`);
            }}
          >
            {heroCtaLoading ? (
              <span className="h-[1.25rem] md:h-[1rem] w-[6.25rem] flex items-center justify-center gap-2">
                <LoadingSpinner size={16} variant="brandText" />
              </span>
            ) : (
              t('discoverSkateparks')
            )}
          </Button>
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
      <HeroCarouselSection images={homepageSettings?.heroCarouselImages ?? []} />

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
      <section className="py-16 sm:px-6 lg:px-8 overflow-hidden">
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
      <section className="py-16 sm:px-6 lg:px-8 overflow-hidden">
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
          <h2 className={`flex items-center justify-center gap-1.5 md:gap-3 text-3xl sm:text-4xl md:text-5xl ${locale === 'he' ? 'font-bold' : 'font-extrabold'} text-center mb-4 text-text dark:text-text-dark`}>
            {locale === 'he' ? (
              <>למה <Icon name="logo" className="w-[3.8em] mb-[-2px] text-brand-main stroke-[7px] dark:stroke-transparent stroke-brand-stroke" style={{ paintOrder: 'stroke' }} />?</>
            ) : (
              <>why <Icon name="logo" className="w-[4.5em] mt-[-2px] " />?</>
            )}
          </h2>
          <p className="text-lg sm:text-xl text-center text-text-secondary dark:text-text-dark/70 mb-16 max-w-2xl mx-auto">
            {t('whyEnbossSubtitle')}
          </p>

          <div className="flex flex-col justify-center items-center md:grid md:overflow-visible snap-x md:snap-none gap-4 md:gap-8 lg:gap-10 md:grid-cols-6 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            <Link
              href={`/${locale}/skateparks`}
              className="flex-shrink-0 md:flex-shrink md:col-span-2 w-full snap-center h-full group block bg-transparent transition-all duration-300"
            >
              <div className="rounded-[22px] overflow-hidden relative min-h-full bg-green dark:bg-green-dark">
                <div className="absolute inset-0 flex items-center justify-end overflow-visible pointer-events-none z-0" aria-hidden>
                  <FeatureIconMap
                    name="mapBold"
                    className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 text-white/20 dark:text-white/15 translate-y-[8%] translate-x-[8%]"
                  />
                </div>
                <div className="card-content relative z-10 flex flex-row items-center gap-4 md:block p-8 lg:p-10 text-white">
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-white dark:text-green-bg-dark text-xl font-bold mb-3">{t('featureDiscoverTitle')}</h3>
                    <p className="text-white/80 dark:text-green-bg-dark/90 leading-relaxed">{t('featureDiscoverDesc')}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/guides`}
              className="flex-shrink-0 md:flex-shrink md:col-span-2 w-full snap-center h-full group block bg-transparent transition-all duration-300"
            >
              <div className="rounded-[22px] overflow-hidden relative min-h-full bg-blue dark:bg-blue-dark">
                <div className="absolute inset-0 flex items-center justify-start overflow-visible pointer-events-none z-0" aria-hidden>
                  <FeatureIconMap
                    name="bookBold"
                    className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 text-white/20 dark:text-white/25 translate-y-[-10%] md:translate-x-[-33%] md:translate-y-[-10%] translate-x-[-33%]"
                  />
                </div>
                <div className="card-content relative z-10 flex flex-row-reverse items-center gap-4 md:block p-8 lg:p-10 text-white">
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-white dark:text-blue-bg-dark text-xl font-bold mb-3">{t('featureLearnTitle')}</h3>
                    <p className="text-white/80 dark:text-blue-bg-dark/90 leading-relaxed">{t('featureLearnDesc')}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/events`}
              className="flex-shrink-0 md:flex-shrink md:col-span-2 w-full snap-center h-full group block bg-transparent transition-all duration-300"
            >
              <div className="rounded-[22px] overflow-hidden relative min-h-full bg-purple dark:bg-purple-dark">
                <div className="absolute inset-0 flex items-center justify-end overflow-visible pointer-events-none z-0" aria-hidden>
                  <FeatureIconMap
                    name="calendarBold"
                    className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 text-white/20 dark:text-white/25 translate-y-[20%] translate-x-[20%]"
                  />
                </div>
                <div className="card-content relative z-10 flex flex-row items-center gap-4 md:block p-8 lg:p-10 text-white">
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-white dark:text-purple-bg-dark text-xl font-bold mb-3">{t('featureEventsTitle')}</h3>
                    <p className="text-white/80 dark:text-purple-bg-dark leading-relaxed">{t('featureEventsDesc')}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/skateparks`}
              className="flex-shrink-0 md:flex-shrink md:col-span-3 w-full snap-center h-full group block  bg-transparent transition-all duration-300"
            >
              <div className="rounded-[22px] overflow-hidden relative min-h-full bg-lime dark:bg-lime-dark">
                <div className="absolute inset-0 flex items-center justify-start overflow-visible pointer-events-none z-0" aria-hidden>
                  <FeatureIconMap
                    name="reviewBold"
                    className={`w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 text-white/20 dark:text-white/50 md:translate-y-[-16%]  ${locale === 'he' ? 'translate-y-[17%] translate-x-[-119%]' : 'translate-y-[-22%] translate-x-[91%]'}`}
                  />
                </div>
                <div className="card-content relative z-10 flex flex-row-reverse items-center gap-4 md:block p-8 lg:p-10 text-white">
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-white dark:text-background-dark text-xl font-bold mb-3">{t('featureRateTitle')}</h3>
                    <p className="text-white/80 dark:text-background-dark leading-relaxed">{t('featureRateDesc')}</p>
                  </div>
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
              className="flex-shrink-0 md:flex-shrink md:col-span-3 w-full snap-center h-full group block bg-transparent transition-all duration-300 text-left cursor-pointer"
            >
              <div className="rounded-[22px] overflow-hidden relative min-h-full bg-red dark:bg-red-dark">
                <div className="absolute inset-0 flex items-center justify-end overflow-visible pointer-events-none z-0" aria-hidden>
                  <FeatureIconMap
                    name="heartBold"
                    className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 text-white/20 dark:text-white/15 translate-y-[8%] translate-x-[8%]"
                  />
                </div>
                <div className="card-content relative z-10 flex flex-row items-center gap-4 md:block p-8 lg:p-10 text-white text-start">
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-white dark:text-background-dark text-xl font-bold mb-3">{t('featureSpreadTitle')}</h3>
                    <p className="text-white/80 dark:text-black leading-relaxed">{t('featureSpreadDesc')}</p>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        ref={ctaSectionRef}
        className="relative 4xl:rounded-2xl h-[400px] md:h-[500px] lg:h-[900px] max-w-[2000px] mx-auto py-20 sm:py-8 md:py-20 lg:py-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden bg-cover bg-bottom bg-no-repeat 4xl:shadow-lg transition-[background-image] duration-200"
        style={{
          backgroundImage: `url('${ctaBgUrl}')`,
        }}
      >
        <div
          className="absolute inset-0 dark:bg-background-dark/20 md:dark:bg-background-dark/10"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl ${locale === 'he' ? 'font-bold' : 'font-extrabold'} mb-4 md:mb-8  [text-shadow:_0px_0px_25px_rgba(0,0,0,1)] leading-tight text-white dark:text-text-dark sm:translate-x-8 lg:translate-x-0 xl:translate-x-[8rem]`}>
            {t('nextSessionAwaits')
              .split('<br/>')
              .map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
          </h2>
          <div className="flex justify-center">
            <Button
              variant="primary"
              className=" !h-auto px-4 md:px-6 py-2 md:py-2 text-xs md:text-base lg:text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 translate-x-5 sm:translate-x-2.5 lg:translate-x-0 xl:translate-x-20 block"
              disabled={finalCtaLoading}
              onClick={() => {
                setFinalCtaLoading(true);
                router.push(`/${locale}/skateparks`);
              }}
            >
              {finalCtaLoading ? (
                <span className="h-[1rem] w-[4.375rem] md:h-[0.6rem] md:w-[5rem] lg:h-[1.75rem] lg:w-[6.25rem] flex items-center justify-center gap-2">
                  <LoadingSpinner size={16} variant="default" className="!h-auto" />
                </span>
              ) : (
                t('getStarted')
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl md:text-5xl ${locale === 'he' ? 'font-bold' : 'font-extrabold'} text-center mb-4 text-text dark:text-text-dark`}>
            {t('togetherWeRide')}
          </h2>
          <p className="text-lg sm:text-xl text-center text-text-secondary dark:text-text-dark/70 mb-16 max-w-2xl mx-auto">
            {t('togetherWeRideSubtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-5 max-w-6xl mx-auto px-0">
            {[
              {
                label: t('communityProParks'),
                href: `/${locale}/skateparks`,
                gradient: 'from-[#32CD32] to-[#2ECC71]',
                backgroundImage: optimizeCloudinaryUrl(
                  'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772201356/bxxxmy7bnrxdeirj6fed.png',
                  { width: COMMUNITY_TILE_WIDTH }
                ),
              },
              {
                label: t('communityGuides'),
                href: `/${locale}/guides`,
                gradient: 'from-[#14A3A8] to-[#32CD32]',
                backgroundImage: optimizeCloudinaryUrl(
                  'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772210378/nmbijyydjsjmfase5sec.png',
                  { width: COMMUNITY_TILE_WIDTH }
                ),
              },
              {
                label: t('communityEvents'),
                href: `/${locale}/events`,
                gradient: 'from-[#2ECC71] to-[#39FF14]',
                backgroundImage: optimizeCloudinaryUrl(
                  'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772201360/m4njuep6fcpami4oph3v.png',
                  { width: COMMUNITY_TILE_WIDTH }
                ),
              },
            ].map((item, index) => (
              <a
                key={index}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  setCommunityClickedIndex(index);
                  setTimeout(() => router.push(item.href), 300);
                }}
                className={`relative aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} overflow-hidden transition-all duration-300 hover:bg-[length:160%] bg-[length:150%] bg-center saturate-150 block`}
                style={
                  item.backgroundImage
                    ? { backgroundImage: `url(${item.backgroundImage})` }
                    : undefined
                }
              >
                {communityClickedIndex === index && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-2xl">
                    <LoadingSpinner variant="imageOverlay" size={40} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div className="absolute bottom-5 left-5 z-10 font-semibold text-white">
                  {item.label}
                </div>
              </a>
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
              {tr(
                'Spreading the joy of skateparks across Israel.',
                'מפיצים את השמחה על גלגלים ברחבי הארץ.'
              )}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
