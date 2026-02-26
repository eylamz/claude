'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { isTrainersEnabled } from '@/lib/utils/ecommerce';
import {
  MapPin,
  Filter,
  X,
  Share2,
  Star,
  Menu,
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { SelectWrapper } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Drawer } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { flipLanguage } from '@/lib/utils/transliterate';
import { highlightMatch } from '@/lib/search-highlight';

interface Trainer {
  _id: string;
  slug: string;
  name: { en: string; he: string } | string;
  profileImage: string;
  area: 'north' | 'center' | 'south';
  relatedSports: string[];
  rating: number;
  totalReviews: number;
  contactDetails: {
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    visible?: boolean;
  };
  isFeatured?: boolean;
  createdAt?: string | null;
}

type SortOption = 'rating' | 'alphabetical' | 'newest';

// Available sports list
const SPORTS = [
  'Skateboard',
  'BMX',
  'Scoot',
  'Longboard',
  'Roller',
  'Ski',
  'Snowboard',
  'Ice Hocky',
  'Roller Hocky',
];

// Utility function to optimize image URLs
const getOptimizedImageUrl = (originalUrl: string): string => {
  if (originalUrl?.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_400,c_fill,q_auto:good,f_auto/${urlParts[1]}`;
    }
  }
  return originalUrl || '';
};

// Memoized trainer card component
const TrainerCard = memo(({ 
  trainer, 
  locale, 
  animationDelay = 0,
  onContact,
  onShare,
  highlightQuery,
}: { 
  trainer: Trainer; 
  locale: string; 
  animationDelay?: number;
  onContact: (trainer: Trainer) => void;
  onShare: (trainer: Trainer) => void;
  highlightQuery?: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const name = typeof trainer.name === 'string' 
    ? trainer.name 
    : (locale === 'he' ? trainer.name.he : trainer.name.en) || trainer.name.en || trainer.name.he;
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  const areaLabels: Record<'north' | 'center' | 'south', { en: string; he: string }> = {
    north: { en: 'North', he: 'צפון' },
    center: { en: 'Center', he: 'מרכז' },
    south: { en: 'South', he: 'דרום' },
  };
  const areaLabel = locale === 'he' ? areaLabels[trainer.area]?.he : areaLabels[trainer.area]?.en || trainer.area;

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare(trainer);
  };

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContact(trainer);
  };

  return (
    <div
      className="h-fit hover:shadow-lg dark:hover:scale-[1.02] bg-white dark:bg-gray-800 rounded-3xl overflow-hidden relative group select-none transform-gpu transition-all duration-200 opacity-0 animate-popFadeIn border border-gray-200 dark:border-gray-700"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Link href={`/${locale}/trainers/${trainer.slug}`}>
        <div className="relative bg-gray-200 dark:bg-gray-700 h-64 overflow-hidden">
          {!isLoaded && (
            <div className="absolute inset-0 bg-background/20 dark:bg-background/20 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          )}
          {trainer.profileImage ? (
            <img
              src={getOptimizedImageUrl(trainer.profileImage)}
              alt={name}
              className={`w-full h-full rounded-t-3xl object-cover transition-all duration-200 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={handleImageLoad}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <div className="w-16 h-16 opacity-50 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
          )}
          
          {/* Share button */}
          <button
            onClick={handleShare}
            className="absolute top-2 right-2 z-10 p-2 bg-black/45 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={tr('Share', 'שתף')}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Featured badge */}
          {trainer.isFeatured && (
            <div className="absolute top-2 left-2 z-10">
              <div className="flex gap-1 justify-center items-center bg-yellow-400 dark:bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-r-full shadow-lg">
                {tr('Featured', 'מומלץ')}
              </div>
            </div>
          )}
        </div>
      </Link>
      
      <div className="px-4 py-3 space-y-2">
        <Link href={`/${locale}/trainers/${trainer.slug}`}>
          <h3 className="text-lg font-semibold truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {highlightQuery ? highlightMatch(name, highlightQuery) : name}
          </h3>
        </Link>
        
        {/* Area */}
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <MapPin className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0 shrink-0" />
          <span className="text-sm">{areaLabel}</span>
        </div>

        {/* Sports Badges */}
        {trainer.relatedSports && trainer.relatedSports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trainer.relatedSports.slice(0, 3).map((sport, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {sport}
              </span>
            ))}
            {trainer.relatedSports.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                +{trainer.relatedSports.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Rating */}
        {trainer.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{trainer.rating.toFixed(1)}</span>
            {trainer.totalReviews > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({trainer.totalReviews})
              </span>
            )}
          </div>
        )}

        {/* Contact Button */}
        <Button
          onClick={handleContact}
          variant="primary"
          size="sm"
          className="w-full"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {tr('Contact', 'יצירת קשר')}
        </Button>
      </div>
    </div>
  );
});
TrainerCard.displayName = 'TrainerCard';

/**
 * Contact Modal Component
 */
function ContactModal({
  trainer,
  isOpen,
  onClose,
  locale,
}: {
  trainer: Trainer | null;
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}) {
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  if (!isOpen || !trainer) return null;

  const name = typeof trainer.name === 'string' 
    ? trainer.name 
    : (locale === 'he' ? trainer.name.he : trainer.name.en) || trainer.name.en || trainer.name.he;

  const contactDetails = trainer.contactDetails || {};
  const hasContact = contactDetails.phone || contactDetails.email || contactDetails.website || 
                     contactDetails.instagram || contactDetails.facebook;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="max-w-md w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {tr('Contact', 'יצירת קשר')} {name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label={tr('Close', 'סגור')}
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {hasContact ? (
              <>
                {contactDetails.phone && (
                  <a
                    href={`tel:${contactDetails.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{contactDetails.phone}</span>
                  </a>
                )}
                {contactDetails.email && (
                  <a
                    href={`mailto:${contactDetails.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{contactDetails.email}</span>
                  </a>
                )}
                {contactDetails.website && (
                  <a
                    href={contactDetails.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{contactDetails.website}</span>
                  </a>
                )}
                {contactDetails.instagram && (
                  <a
                    href={`https://instagram.com/${contactDetails.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">
                      @{contactDetails.instagram.replace('@', '')}
                    </span>
                  </a>
                )}
                {contactDetails.facebook && (
                  <a
                    href={contactDetails.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{tr('Facebook Profile', 'פרופיל פייסבוק')}</span>
                  </a>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  {tr('No contact information available.', 'אין פרטי יצירת קשר זמינים.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Trainers Page
 */
export default function TrainersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'en';
  const trainersEnabled = isTrainersEnabled();

  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  // Show "Page in construction" if trainers is disabled
  if (!trainersEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

  const AREAS = [
    { value: '', label: tr('All Areas', 'כל האזורים') },
    { value: 'north', label: tr('North', 'צפון') },
    { value: 'center', label: tr('Center', 'מרכז') },
    { value: 'south', label: tr('South', 'דרום') },
  ];

  const SORT_OPTIONS = [
    { value: 'rating', label: tr('Highest Rated', 'דירוג גבוה') },
    { value: 'alphabetical', label: tr('Alphabetical', 'סדר אלפביתי') },
    { value: 'newest', label: tr('Newest', 'חדשים תחילה') },
  ];

  const RATING_OPTIONS = [
    { value: '', label: tr('Any Rating', 'כל הדירוגים') },
    { value: '4.5', label: '4.5+ ⭐' },
    { value: '4.0', label: '4.0+ ⭐' },
    { value: '3.5', label: '3.5+ ⭐' },
    { value: '3.0', label: '3.0+ ⭐' },
  ];

  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Fetch all trainers (pass flipped query for wrong-keyboard layout search)
  const fetchTrainers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (areaFilter) params.set('area', areaFilter);
      if (searchQuery) {
        params.set('search', searchQuery);
        const flippedQ = flipLanguage(searchQuery);
        if (flippedQ && flippedQ !== searchQuery) params.set('flippedQ', flippedQ);
      }
      selectedSports.forEach((sport) => params.append('sports', sport));
      if (minRating) params.set('minRating', minRating);

      const response = await fetch(`/api/trainers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch trainers');

      const data = await response.json();
      setAllTrainers(data.trainers || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  }, [areaFilter, searchQuery, selectedSports, minRating]);

  // Client-side sorting function
  const sortTrainers = useCallback((trainersList: Trainer[], sortOption: SortOption): Trainer[] => {
    const sorted = [...trainersList];
    
    switch (sortOption) {
      case 'rating':
        return sorted.sort((a, b) => {
          if (a.rating !== b.rating) return b.rating - a.rating;
          return (b.totalReviews || 0) - (a.totalReviews || 0);
        });
      case 'alphabetical':
        return sorted.sort((a, b) => {
          const nameA = typeof a.name === 'string' ? a.name : a.name.en || '';
          const nameB = typeof b.name === 'string' ? b.name : b.name.en || '';
          return nameA.localeCompare(nameB);
        });
      case 'newest':
      default:
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
    }
  }, []);

  // Update displayed trainers when filters, search, or sort changes
  useEffect(() => {
    const sorted = sortTrainers(allTrainers, sortBy);
    setTrainers(sorted);
  }, [allTrainers, sortBy, sortTrainers]);

  // Fetch trainers when filters change
  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const clearFilters = () => {
    setAreaFilter('');
    setSearchQuery('');
    setSelectedSports([]);
    setMinRating('');
    setSortBy('newest');
  };

  const hasActiveFilters = areaFilter || searchQuery || selectedSports.length > 0 || minRating;

  const handleContact = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setShowContactModal(true);
  };

  const handleShare = async (trainer: Trainer) => {
    const name = typeof trainer.name === 'string' 
      ? trainer.name 
      : (locale === 'he' ? trainer.name.he : trainer.name.en) || trainer.name.en || trainer.name.he;
    const url = `${window.location.origin}/${locale}/trainers/${trainer.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `${name} - ${tr('Trainer Profile', 'פרופיל מאמן')}`,
          url,
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert(tr('Profile link copied to clipboard!', 'קישור הפרופיל הועתק ללוח!'));
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  return (
    <div className="min-h-screen " dir={locale === 'he' ? 'rtl' : 'ltr'}>
      {/* Toggle Button */}
      <div className={`fixed top-4 z-50 ${locale === 'he' ? 'left-4' : 'right-4'}`}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowHeader(!showHeader)}
          className="shadow-lg"
        >
          {showHeader ? (
            <>
              <ChevronUp className={`w-4 h-4 ${locale === 'he' ? 'ml-2' : 'mr-2'}`} />
              {tr('Hide', 'הסתר')}
            </>
          ) : (
            <>
              <Menu className={`w-4 h-4 ${locale === 'he' ? 'ml-2' : 'mr-2'}`} />
              {tr('Show Filters', 'הצג מסננים')}
            </>
          )}
        </Button>
      </div>

      {/* Header */}
      {showHeader && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {tr('Trainers', 'מאמנים')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {tr('Find professional trainers near you', 'מצא מאמנים מקצועיים באזורך')}
                </p>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Area Filter */}
              <SelectWrapper
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                options={AREAS}
              />

              {/* Search */}
              <div className="flex-1 min-w-64">
                <Input
                  type="text"
                  placeholder={tr('Search trainers...', 'חיפוש מאמנים...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Sort */}
              <SelectWrapper
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                options={SORT_OPTIONS}
              />

              {/* Filters Button */}
              <Button variant="outline" onClick={() => setShowFilters(true)}>
                <Filter className="w-4 h-4 mr-2" />
                {tr('Filters', 'מסננים')}
                {hasActiveFilters && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {selectedSports.length + (minRating ? 1 : 0)}
                  </span>
                )}
              </Button>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  {tr('Clear', 'נקה')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-64 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainers.map((trainer, index) => (
                <TrainerCard 
                  key={trainer._id} 
                  trainer={trainer} 
                  locale={locale} 
                  animationDelay={index * 50}
                  onContact={handleContact}
                  onShare={handleShare}
                  highlightQuery={searchQuery || undefined}
                />
              ))}
            </div>

            {trainers.length === 0 && !loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {tr('No trainers found', 'לא נמצאו מאמנים')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {tr('Try adjusting your filters', 'נסה להתאים את המסננים שלך')}
                  </p>
                  <Button variant="primary" onClick={clearFilters}>
                    {tr('Clear Filters', 'נקה מסננים')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Filters Drawer */}
      <Drawer isOpen={showFilters} onClose={() => setShowFilters(false)} title={tr('Filters', 'מסננים')}>
        <div className="space-y-6">
          {/* Sports Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {tr('Related Sports', 'ענפי ספורט')}
            </h3>
            <div className="space-y-2">
              {SPORTS.map((sport) => (
                <label
                  key={sport}
                  className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedSports.includes(sport)}
                    onChange={() => toggleSport(sport)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {sport}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {tr('Minimum Rating', 'דירוג מינימלי')}
            </h3>
            <SelectWrapper
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              options={RATING_OPTIONS}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={() => setShowFilters(false)}>
              {tr('Apply Filters', 'החל מסננים')}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              {tr('Clear', 'נקה')}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Contact Modal */}
      <ContactModal
        trainer={selectedTrainer}
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setSelectedTrainer(null);
        }}
        locale={locale}
      />
    </div>
  );
}








