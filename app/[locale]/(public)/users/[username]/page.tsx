'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Flame, Trophy, MapPin, ChevronRight } from 'lucide-react';

const featureFlags = {
  xpSystem: process.env.NEXT_PUBLIC_ENABLE_XP_SYSTEM === 'true',
  streaks: process.env.NEXT_PUBLIC_ENABLE_STREAKS === 'true',
  personalRanking: process.env.NEXT_PUBLIC_ENABLE_PERSONAL_RANKING === 'true',
};

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
  const router = useRouter();
  const locale = useLocale() as 'en' | 'he';
  const { data: session } = useSession();
  const t = useTranslations('common.account');

  const username = typeof params.username === 'string' ? params.username : '';
  const [user, setUser] = useState<PublicUser | null>(null);
  const [recentXp, setRecentXp] = useState<XPEventItem[]>([]);
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
    if (!user || !session?.user || !featureFlags.xpSystem) return;
    const userId = (session.user as { id?: string }).id;
    if (!userId || user._id !== userId) return;
    fetch(`/api/account/xp-history?page=1&limit=5`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setRecentXp(data?.items ?? []))
      .catch(() => {});
  }, [user?._id, session?.user]);

  const levelTitle = user?.levelTitle ? (user.levelTitle[locale] ?? user.levelTitle.en) : '';
  const tEventType = (key: string) => t(`xpEventTypes.${key}` as any);

  if (loading) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto p-4 lg:p-8 pt-24">
        <Skeleton className="h-32 w-full rounded-xl mb-6" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto p-4 lg:p-8 pt-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('profile')} not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This user does not exist or the username is incorrect.
        </p>
        <Link href={`/${locale}`} className="text-brand-main dark:text-brand-dark hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  const stats = user.stats ?? {};
  const hasStreak = featureFlags.streaks && user.streak && (user.streak.currentWeeklyStreak ?? 0) > 0;

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
                  @{user.username}
                </h1>
                {featureFlags.xpSystem && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: user.levelColor }}
                  >
                    {levelTitle}
                  </span>
                )}
                {isOwnProfile && featureFlags.personalRanking && user.currentRank > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    Your rank: #{user.currentRank}
                  </span>
                )}
              </div>
              {user.fullName && (
                <p className="text-gray-700 dark:text-gray-300 mb-1">{user.fullName}</p>
              )}
              {user.city && (
                <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  {user.city}
                </p>
              )}
              {user.relatedSports && user.relatedSports.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {user.relatedSports.map((sport) => (
                    <span
                      key={sport}
                      className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      {t(`sports.${sport}`)}
                    </span>
                  ))}
                </div>
              )}
              {user.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
              )}
              {isOwnProfile && (
                <Link
                  href={`/${locale}/account/profile`}
                  className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                >
                  Edit profile
                  <ChevronRight className="w-4 h-4" />
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
              <Flame className="w-5 h-5 text-orange-500" />
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

      {/* Stats grid */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.skateparksVisited ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Parks Visited</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.guidesCompleted ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Guides Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.eventsAttended ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Events Attended</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.reviewsWritten ?? 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reviews Written</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {user.badgesWithDetails.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center"
                  >
                    <div className="text-2xl mb-2">{b.icon || '🏅'}</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {b.name[locale] ?? b.name.en}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {b.rarity}
                    </span>
                  </div>
                ))}
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
      {featureFlags.xpSystem && isOwnProfile && recentXp.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Recent XP</CardTitle>
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
                  <span className={ev.xpAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {ev.xpAmount >= 0 ? '+' : ''}{ev.xpAmount}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
