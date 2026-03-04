'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button, Skeleton, Toaster } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchInput } from '@/components/common/SearchInput';
import { useToast } from '@/hooks/use-toast';
import { isGrowthLabEnabled } from '@/lib/utils/ecommerce';
import { flipLanguage } from '@/lib/utils/transliterate';
import { highlightMatch } from '@/lib/search-highlight';
import { Icon } from '@/components/icons/Icon';


interface Form {
  id: string;
  slug: string;
  title: {
    en: string;
    he: string;
  };
  description: {
    en: string;
    he: string;
  };
  fields: any[];
  submissionsCount: number;
  visibleFrom: string | null;
  visibleUntil: string | null;
  createdAt: string | null;
}

// Helper function to get localized text
const getLocalizedText = (field: { en: string; he: string } | undefined, locale: string): string => {
  if (!field) return '';
  return field[locale as 'en' | 'he'] || field.en || '';
};

// Memoized Form Card Component
const FormCard = memo(({ 
  form, 
  locale, 
  animationDelay = 0,
  isSubmitted = false,
  highlightQuery
}: { 
  form: Form; 
  locale: string; 
  animationDelay?: number;
  isSubmitted?: boolean;
  /** When set, highlights matching substring in title/description (e.g. search query). */
  highlightQuery?: string;
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showNameSection, setShowNameSection] = useState(false);
  const [showFormName, setShowFormName] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const router = useRouter();

  // Show name section after delay when card appears
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNameSection(true);
      setTimeout(() => {
        setShowFormName(true);
      }, 0);
    }, 300 + animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsClicked(true);
    setTimeout(() => {
      router.push(`/${locale}/growth-lab/${form.slug}`);
    }, 300);
  }, [form.slug, locale, router]);

  const href = `/${locale}/growth-lab/${form.slug}`;
  const formTitle = getLocalizedText(form.title, locale);
  const formDescription = form.description ? getLocalizedText(form.description, locale) : '';

  // Truncate description
  const truncateDescription = (text: string, maxLength: number = 120): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Link
      ref={cardRef}
      href={href}
      onClick={handleCardClick}
      className={`block h-fit group rounded-xl cursor-pointer relative select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={formTitle}
    >
      <div 
        className={`group-hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden ${
          isSubmitted ? 'ring-2 ring-green-500/50 opacity-90' : ''
        }`}
        style={{
          filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
        }}
      >
        {/* Loading overlay when navigating to form page */}
        {isClicked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-2xl">
            <LoadingSpinner variant="header" size={40} />
          </div>
        )}
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 via-brand-orange/10 to-brand-red/20 dark:from-brand-purple/10 dark:via-orange-dark/10 dark:to-red-dark/10" />
        
        {/* Submissions Badge */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
          {/* <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white">{form.submissionsCount}</span>
          </div> */}
          {/* Submitted Badge */}
          {isSubmitted && (
            <div className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm px-3 py-1.5 rounded-lg animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white">
                {locale === 'he' ? 'הוגש' : 'Submitted'}
              </span>
            </div>
          )}
        </div>

        {/* Form Icon/Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2 p-6">
            <div className="w-16 h-16 mx-auto bg-orange/20 dark:bg-orange-dark/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange dark:text-orange-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray dark:text-gray-dark line-clamp-2 max-w-[200px]">
              {highlightQuery
                ? highlightMatch(truncateDescription(formDescription, 60), highlightQuery)
                : truncateDescription(formDescription, 60)}
            </p>
          </div>
        </div>
      </div>

      {/* Name Section */}
      <div 
        className="space-y-1 overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: showNameSection ? '200px' : '0',
          paddingTop: showNameSection ? '0.5rem' : '0',
          paddingBottom: showNameSection ? '0.5rem' : '0',
        }}
      >
        <h3 
          className={`text-lg font-medium opacity-0 ${showFormName ? 'animate-fadeInDown animation-delay-[1s]' : ''}`}
        >
          {highlightQuery ? highlightMatch(formTitle, highlightQuery) : formTitle}
        </h3>
      </div>
    </Link>
  );
});
FormCard.displayName = 'FormCard';

export default function GrowingTogetherPage() {
  const locale = useLocale();
  const router = useRouter();
  const [allForms, setAllForms] = useState<Form[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  const { toast } = useToast();
  const growthLabEnabled = isGrowthLabEnabled();

  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  // Normalize text for search (handles apostrophes, diacritics, and whitespace) — same as skateparks
  const normalizeSearchText = useCallback((text: string): string => {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/[''']/g, '')
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    );
  }, []);

  // Redirect if Growth Lab is disabled
  useEffect(() => {
    if (!growthLabEnabled) {
      router.push(`/${locale}`);
    }
  }, [growthLabEnabled, locale, router]);

  // Show "Page in construction" if Growth Lab is disabled
  if (!growthLabEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {locale === 'he' ? 'דף בבנייה' : 'Page in Construction'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {locale === 'he' 
              ? 'הדף זמין בקרוב. אנא נסו מאוחר יותר.'
              : 'Page is coming soon. Please check back later.'
            }
          </p>
          <Button
            onClick={() => router.push(`/${locale}`)}
            variant="brand"
            className="px-6 py-3"
          >
            {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Homepage'}
          </Button>
        </div>
      </div>
    );
  }

  // Track scroll position for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;
      
      if (currentScrollY < prevScrollY || currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > prevScrollY) {
        setIsHeaderVisible(false);
      }
      
      prevScrollYRef.current = currentScrollY;
      setIsScrolled(currentScrollY > 240);
    };

    const initialScrollY = window.scrollY;
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);
    setIsScrolled(initialScrollY > 240);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch forms
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/forms');
        if (!response.ok) throw new Error('Failed to fetch forms');

        const data = await response.json();
        const allFetchedForms = data.forms || [];

        // Show all forms (don't filter out submitted ones)
        // We'll mark them as submitted in the UI instead
        setAllForms(allFetchedForms);
        setForms(allFetchedForms);
      } catch (error) {
        console.error('Error fetching forms:', error);
        toast({
          title: 'Error',
          description: 'Failed to load forms',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [toast]);

  // Filter and sort forms (search supports Hebrew/English transliteration like skateparks)
  useEffect(() => {
    let filtered = [...allForms];

    if (searchQuery.trim()) {
      const normalizedQuery = normalizeSearchText(searchQuery);
      const flipped = flipLanguage(searchQuery);
      const normalizedFlipped = flipped ? normalizeSearchText(flipped) : '';

      const matchesQuery = (text: string) =>
        text.includes(normalizedQuery) || (normalizedFlipped !== '' && text.includes(normalizedFlipped));

      filtered = filtered.filter((form) => {
        const normTitleEn = normalizeSearchText(form.title?.en ?? '');
        const normTitleHe = normalizeSearchText(form.title?.he ?? '');
        const normDescEn = normalizeSearchText(form.description?.en ?? '');
        const normDescHe = normalizeSearchText(form.description?.he ?? '');

        return (
          matchesQuery(normTitleEn) ||
          matchesQuery(normTitleHe) ||
          matchesQuery(normDescEn) ||
          matchesQuery(normDescHe)
        );
      });
    }

    // Apply sorting (newest first)
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    setForms(filtered);
  }, [allForms, searchQuery, locale, normalizeSearchText]);

  const filteredCount = forms.length;

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <Toaster />
      
      {/* Hero Section */}
      <div className="relative pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('🪴Growth Lab🧪', 'מרחב גדילה')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Your feedback matters. Small surveys, big changes!',
                'סקרים קטנים, שינויים גדולים. בואו נשפר ביחד!'
              )}
            </p>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                  <Icon name="clipboardBold" className="w-3.5 h-3.5 text-orange dark:text-orange-dark" />
                <span className="text-gray-600 dark:text-gray-400">
                {tr('Rotating surveys', 'סקרים משתנים')}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-sm">
              <Icon name="plantBold" className="w-3.5 h-3.5 text-orange dark:text-orange-dark" />
              <span className="text-gray-600 dark:text-gray-400">
                  {tr('Major upgrades', 'שדרוגים גדולים')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div 
        className={`sticky z-40 transition-all duration-300 border-b-2 border-transparent ${
          isHeaderVisible ? 'top-16 md:top-16' : 'top-0'
        } ${
          isScrolled 
            ? 'shadow-xl bg-header dark:bg-header-dark border-header-border dark:border-header-border-dark py-3' 
            : 'py-4'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col xxs:flex-row items-stretch md:items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 min-w-0">
                <SearchInput
                  placeholder={tr('Search forms...', 'חפש טפסים...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  className="w-full"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-[12rem] md:h-[16rem] w-full rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-text dark:text-text-dark mb-2">
              {searchQuery 
                ? tr('No forms found', 'לא נמצאו טפסים')
                : tr('No forms available', 'אין טפסים זמינים')
              }
            </h3>
            <p className="text-text-secondary dark:text-text-secondary-dark max-w-md mx-auto">
              {searchQuery
                ? tr('Try adjusting your search or filters', 'נסה להתאים את החיפוש או המסננים שלך')
                : tr('Check back later for new forms!', 'בדקו שוב מאוחר יותר לטפסים חדשים!')
              }
            </p>
            {searchQuery && (
              <Button
                variant="gray"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                {tr('Clear Search', 'נקה חיפוש')}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Results Count */}
            {searchQuery && (
              <div className="mb-6 text-sm text-text-secondary dark:text-text-secondary-dark">
                {tr(
                  `Showing ${filteredCount} ${filteredCount === 1 ? 'form' : 'forms'}`,
                  `מציג ${filteredCount} ${filteredCount === 1 ? 'טופס' : 'טפסים'}`
                )}
              </div>
            )}

            {/* Forms Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {forms.map((form, index) => {
                // Check if form has been submitted
                const submittedKey = `form_submission_${form.slug}`;
                const isSubmitted = typeof window !== 'undefined' && localStorage.getItem(submittedKey) !== null;
                
                return (
                  <FormCard
                    key={form.id}
                    form={form}
                    locale={locale}
                    animationDelay={index * 50}
                    isSubmitted={isSubmitted}
                    highlightQuery={searchQuery || undefined}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
