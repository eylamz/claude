'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { NotFoundContent } from '@/components/not-found/NotFoundContent';
import { Icon } from '@/components/icons';
import { ISRAEL_CITIES } from '@/components/ui/israel-cities-autocomplete';
import { Flame, Trophy, ChevronRight } from 'lucide-react';

const featureFlags = {
  xpSystem: process.env.NEXT_PUBLIC_ENABLE_XP_SYSTEM === 'true',
  streaks: process.env.NEXT_PUBLIC_ENABLE_STREAKS === 'true',
  personalRanking: process.env.NEXT_PUBLIC_ENABLE_PERSONAL_RANKING === 'true',
};

/** Config for related sports under location – same look as search page selected filters (teal pill + icon). labelKey = common.account.sportLabels.* */
const RELATED_SPORTS_CONFIG = [
  { value: 'skateboarding' as const, iconName: 'Skate' as const, labelKey: 'skater' as const },
  { value: 'rollerblading' as const, iconName: 'Roller' as const, labelKey: 'blader' as const },
  { value: 'scootering' as const, iconName: 'scooter' as const, labelKey: 'scooter' as const },
  { value: 'bmx' as const, iconName: 'bmx-icon' as const, labelKey: 'biker' as const },
] as const;

/** Rarity-based styles for badge cards to match account profile page */
function getBadgeRarityStyles(rarity: string): { card: string; pill: string } {
  switch (rarity) {
    case 'legendary':
      return {
        card: 'border-amber-400/60 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm',
        pill: 'bg-amber-200/80 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100',
      };
    case 'epic':
      return {
        card: 'border-purple-400/60 dark:border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm',
        pill: 'bg-purple-200/80 dark:bg-purple-800/50 text-purple-900 dark:text-purple-100',
      };
    case 'rare':
      return {
        card: 'border-blue-400/50 dark:border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm',
        pill: 'bg-blue-200/80 dark:bg-blue-800/50 text-blue-900 dark:text-blue-100',
      };
    case 'common':
    default:
      return {
        card: 'border-gray-200 dark:border-gray-700',
        pill: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      };
  }
}

interface PublicUser {
  _id: string;
  username: string;
  fullName: string;
  bio?: string | null;
  profilePhoto?: string | null;
  city?: string | null;
  relatedSports: string[];
  totalXP: number;
  levelId: number;
  levelTitle: { en: string; he: string };
  levelColor: string;
  currentRank: number;
  stats: {
    skateparksVisited?: number;
    guidesCompleted?: number;
    eventsAttended?: number;
    reviewsWritten?: number;
  };
  streak: {
    currentWeeklyStreak?: number;
    longestWeeklyStreak?: number;
    currentMonthlyStreak?: number;
    weeklyHoursThisWeek?: number;
  } | null;
  badges: string[];
  badgesWithDetails: Array<{ id: string; name: { en: string; he: string }; icon: string; rarity: string }>;
  createdAt: string;
}

interface XPEventItem {
  _id: string;
  type: string;
  xpAmount: number;
  sourceType?: string;
  createdAt: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'he';
  const { data: session } = useSession();
  const t = useTranslations('common.account');
  const tCommon = useTranslations('common');

  const username = typeof params.username === 'string' ? params.username : '';
  const [user, setUser] = useState<PublicUser | null>(null);
  const [recentXp, setRecentXp] = useState<XPEventItem[]>([]);
  const [recentXpLoading, setRecentXpLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = !!session?.user && !!user && (session.user as { id?: string }).id === user._id;

  const fetchUser = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (res.status === 404) {
        setNotFound(true);
        setUser(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error(e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user || !session?.user || !featureFlags.xpSystem) {
      setRecentXpLoading(false);
      return;
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId || user._id !== userId) {
      setRecentXpLoading(false);
      return;
    }
    setRecentXpLoading(true);
    fetch(`/api/account/xp-history?page=1&limit=5`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setRecentXp(data?.items ?? []))
      .catch(() => {})
      .finally(() => setRecentXpLoading(false));
  }, [user?._id, session?.user]);

  const levelTitle = user?.levelTitle ? (user.levelTitle[locale] ?? user.levelTitle.en) : '';
  const tEventType = (key: string) => t(`xpEventTypes.${key}` as any);

  // Resolve stored city (en or he) to display name in current locale (same as account profile / IsraelCitiesAutocomplete)
  const cityDisplayName = useMemo(() => {
    if (!user?.city?.trim()) return null;
    const v = user.city.trim();
    const lower = v.toLowerCase();
    const resolved = ISRAEL_CITIES.find(
      (c) => c.en.toLowerCase() === lower || c.he === v || c.he.trim() === v
    );
    return resolved ? (locale === 'he' ? resolved.he : resolved.en) : user.city;
  }, [user?.city, locale]);

  if (loading) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto p-4 lg:p-8 pt-16">
        {/* Header card: avatar + username, level, city, sports pills, bio */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Skeleton className="h-24 w-24 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-7 w-32" />
                  {featureFlags.xpSystem && <Skeleton className="h-6 w-20 rounded-full" />}
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28 flex items-center gap-1" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-sm" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak card (when feature enabled) */}
        {featureFlags.streaks && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-16" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats card */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-16" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-8 w-10 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Badges card */}
        {featureFlags.xpSystem && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-16" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="min-h-[160px] w-full max-w-[120px] rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent XP card (own profile) */}
        {featureFlags.xpSystem && (
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex justify-between py-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-10" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <NotFoundContent
        locale={locale}
        title={tCommon('userNotFound.title')}
        description={tCommon('userNotFound.description')}
        backHomeLabel={tCommon('userNotFound.backHome')}
        homeHref={`/${locale}`}
      />
    );
  }

  const stats = user.stats ?? {};
  const hasStreak = featureFlags.streaks && user.streak && (user.streak.currentWeeklyStreak ?? 0) > 0;
  const hasAnyStats =
    (stats.skateparksVisited ?? 0) > 0 ||
    (stats.guidesCompleted ?? 0) > 0 ||
    (stats.eventsAttended ?? 0) > 0 ||
    (stats.reviewsWritten ?? 0) > 0;

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4 lg:p-8 pt-24">
      {/* Header: photo, username, level, city, sports, bio */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
              {user.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500 dark:text-gray-400">
                  {user.username.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {user.username}
                </h1>
                {featureFlags.xpSystem && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: user.levelColor }}
                  >
                    {levelTitle}
                  </span>
                )}
                {isOwnProfile && featureFlags.personalRanking && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    Your rank: {user.currentRank > 0 ? `#${user.currentRank}` : '—'}
                  </span>
                )}
              </div>
              {user.fullName && (
                <p className="text-gray-700 dark:text-gray-300 mb-1">{user.fullName}</p>
              )}
              {cityDisplayName && (
                <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Icon name="location" className="w-4 h-4 shrink-0" aria-hidden />
                  <span>{cityDisplayName}</span>
                </p>
              )}
              {user.relatedSports && user.relatedSports.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {user.relatedSports.map((sport) => {
                    const config = RELATED_SPORTS_CONFIG.find((c) => c.value === sport);
                    const label = config ? t(`sportLabels.${config.labelKey}`) : t(`sports.${sport}`);
                    return (
                      <span
                        key={sport}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-bg dark:bg-teal-bg-dark rounded-full border border-teal-border dark:border-teal-border-dark"
                      >
                        {config ? (
                          <Icon
                            name={config.iconName as any}
                            className="w-3.5 h-3.5 text-teal dark:text-teal-dark"
                          />
                        ) : null}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              {user.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
              )}
              {isOwnProfile && (
                <Link
                  href={`/${locale}/account/profile`}
                  className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-brand-text dark:text-brand-dark hover:underline"
                >
                  {t('editProfile')}
                  <ChevronRight className={`w-4 h-4 ${locale === 'he' ? 'rotate-180' : ''}`} />
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak (if streaks and user has streak > 0) */}
      {hasStreak && user.streak && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="w-5 h-5 fill-brand-main text-[#31c438]" />
              {t('streak')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.streak.currentWeeklyStreak ?? 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('weeklyStreak')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.streak.currentMonthlyStreak ?? 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('monthlyStreak')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid - only show if at least one stat has data */}
      {hasAnyStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('stats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(stats.skateparksVisited ?? 0) > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.skateparksVisited}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('parksVisited')}</p>
                </div>
              )}
              {(stats.guidesCompleted ?? 0) > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.guidesCompleted}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('guidesCompleted')}</p>
                </div>
              )}
              {(stats.eventsAttended ?? 0) > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.eventsAttended}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('eventsAttended')}</p>
                </div>
              )}
              {(stats.reviewsWritten ?? 0) > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.reviewsWritten}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('reviewsWritten')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {featureFlags.xpSystem && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {t('badges')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.badgesWithDetails && user.badgesWithDetails.length > 0 ? (
              <div className="flex gap-4">
                {user.badgesWithDetails.map((b) => {
                  const styles = getBadgeRarityStyles(b.rarity);
                  return (
                    <div
                      key={b.id}
                      className={`flex flex-col min-h-[160px] w-full max-w-[120px] p-4 rounded-lg border text-center ${styles.card}`}
                    >
                      <div className="text-2xl mb-2">{b.icon || '🏅'}</div>
                      <div className="min-h-[2.5rem] flex items-center justify-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight text-center w-full">
                          {b.name[locale] ?? b.name.en}
                        </p>
                      </div>
                      <span className={`uppercase inline-block mt-2 px-2 py-0.5 text-xs rounded-full font-medium shrink-0 w-fit self-center ${styles.pill}`}>
                        {b.rarity}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">
                {t('noBadgesYet')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent XP (last 5, only for own profile when logged in) */}
      {featureFlags.xpSystem && isOwnProfile && (
        <>
          {recentXpLoading ? (
            <Card className="mb-6">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex justify-between py-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-10" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : recentXp.length > 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('recentXp')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recentXp.map((ev) => (
                    <li
                      key={ev._id}
                      className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {tEventType(ev.type) || ev.type}
                      </span>
                      <span className={ev.xpAmount >= 0 ? 'text-brand-text dark:text-brand-dark' : 'text-red dark:text-red-dark'}>
                        {ev.xpAmount >= 0 ? '+' : ''}{ev.xpAmount}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
