'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { IsraelCitiesAutocomplete } from '@/components/ui/israel-cities-autocomplete';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Icon } from '@/components/icons';
import { ChevronLeft, Upload, Flame, Trophy, Loader2, X, ImageIcon, Trash2 } from 'lucide-react';

const RELATED_SPORTS = ['skateboarding', 'rollerblading', 'bmx', 'scootering'] as const;

const RELATED_SPORTS_CONFIG = [
  { value: 'rollerblading' as const, iconName: 'Roller' as const, variant: 'teal' as const },
  { value: 'skateboarding' as const, iconName: 'skate' as const, variant: 'teal' as const },
  { value: 'scootering' as const, iconName: 'scooter' as const, variant: 'teal' as const },
  { value: 'bmx' as const, iconName: 'bmx-icon' as const, variant: 'teal' as const },
] as const;
const XP_PAGE_SIZE = 20;

const featureFlags = {
  xpSystem: process.env.NEXT_PUBLIC_ENABLE_XP_SYSTEM === 'true',
  streaks: process.env.NEXT_PUBLIC_ENABLE_STREAKS === 'true',
  personalRanking: process.env.NEXT_PUBLIC_ENABLE_PERSONAL_RANKING === 'true',
};

interface ProfileUser {
  _id: string;
  username: string;
  fullName: string;
  bio: string;
  profilePhoto?: string | null;
  city: string;
  relatedSports: string[];
  totalXP: number;
  levelId: number;
  levelTitle: { en: string; he: string };
  levelColor: string;
  levelColorDark?: string;
  levelTextColorLight?: string;
  levelTextColorDark?: string;
  currentLevelMinXP: number;
  nextLevelMinXP: number | null;
  nextLevelTitle: { en: string; he: string } | null;
  currentRank: number;
  stats: Record<string, number>;
  streak: Record<string, number>;
  badges: string[];
  badgesWithDetails: Array<{ id: string; name: { en: string; he: string }; icon: string; rarity: string }>;
  badgeEarnedAt: Record<string, string>;
}

interface XPEventItem {
  _id: string;
  type: string;
  xpAmount: number;
  sourceType?: string;
  createdAt: string;
}

export default function AccountProfilePage() {
  const locale = useLocale() as 'en' | 'he';
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common.account');
  const tEventType = (key: string) => t(`xpEventTypes.${key}` as any);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [relatedSports, setRelatedSports] = useState<string[]>([]);

  const [xpHistory, setXpHistory] = useState<XPEventItem[]>([]);
  const [xpPage, setXpPage] = useState(1);
  const [xpHasMore, setXpHasMore] = useState(false);
  const [xpLoading, setXpLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const [avatarPopoverOpen, setAvatarPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    return '?';
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/account/profile');
      if (res.status === 401) {
        router.push(`/${locale}/login`);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      const u = data.user;
      setUser(u);
      setUsername(u.username ?? '');
      setFullName(u.fullName ?? '');
      setBio(u.bio ?? '');
      setCity(u.city ?? '');
      setRelatedSports(u.relatedSports ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [locale, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!featureFlags.xpSystem || !user) return;
    const load = async () => {
      setXpLoading(true);
      try {
        const res = await fetch(`/api/account/xp-history?page=1&limit=${XP_PAGE_SIZE}`);
        if (!res.ok) return;
        const data = await res.json();
        setXpHistory(data.items ?? []);
        setXpHasMore(data.pagination?.hasMore ?? false);
        setXpPage(1);
      } finally {
        setXpLoading(false);
      }
    };
    load();
  }, [user?._id]);

  const loadMoreXp = async () => {
    if (!featureFlags.xpSystem || xpLoading) return;
    const nextPage = xpPage + 1;
    setXpLoading(true);
    try {
      const res = await fetch(`/api/account/xp-history?page=${nextPage}&limit=${XP_PAGE_SIZE}`);
      if (!res.ok) return;
      const data = await res.json();
      setXpHistory((prev) => [...prev, ...(data.items ?? [])]);
      setXpHasMore(data.pagination?.hasMore ?? false);
      setXpPage(nextPage);
    } finally {
      setXpLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    setPhotoUploading(true);
    try {
      const res = await fetch('/api/account/profile/photo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Upload failed');
        return;
      }
      const data = await res.json();
      setUser((prev) => (prev ? { ...prev, profilePhoto: data.profilePhoto } : null));
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setPhotoUploading(false);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    setAvatarPopoverOpen(false);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhoto: null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to remove photo');
        return;
      }
      const data = await res.json();
      if (data.user) setUser((prev) => (prev ? { ...prev, profilePhoto: data.user.profilePhoto ?? null } : null));
      else setUser((prev) => (prev ? { ...prev, profilePhoto: null } : null));
    } catch (err) {
      console.error(err);
      alert('Failed to remove photo');
    }
  };

  const handleSave = async () => {
    setUsernameError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          bio: bio.trim(),
          city: city.trim(),
          relatedSports,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field === 'username' && data.error) {
          setUsernameError(data.error);
          return;
        }
        alert(data.error || 'Save failed');
        return;
      }
      setUser((prev) => (prev ? { ...prev, ...data.user } : null));
    } catch (err) {
      console.error(err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const levelTitle = user?.levelTitle ? (user.levelTitle[locale] ?? user.levelTitle.en) : '';
  const nextLevelTitle = user?.nextLevelTitle
    ? (user.nextLevelTitle[locale] ?? user.nextLevelTitle.en)
    : '';

  if (loading) {
    return (
      <div className="min-h-screen pb-16 lg:pb-0 max-w-4xl mx-auto p-4 lg:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pb-16 lg:pb-0 max-w-4xl mx-auto p-4 lg:p-8">
        <p className="text-gray-600 dark:text-gray-400">Failed to load profile.</p>
        <Link href={`/${locale}/account`} className="text-brand-main dark:text-brand-dark mt-4 inline-block">
          ← {t('dashboard')}
        </Link>
      </div>
    );
  }

  const currentXP = user.totalXP ?? 0;
  const currentLevelMin = user.currentLevelMinXP ?? 0;
  const nextMin = user.nextLevelMinXP ?? currentLevelMin + 1;
  const xpInLevel = nextMin - currentLevelMin;
  const xpProgress = xpInLevel > 0 ? Math.min(1, (currentXP - currentLevelMin) / xpInLevel) : 1;

  return (
    <div className="min-h-screen pb-16 lg:pb-0 max-w-4xl mx-auto p-4 lg:p-8">
      <Link
        href={`/${locale}/account`}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('dashboard')}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('editProfile')}
      </h1>

      {/* 1. Avatar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('avatar')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handlePhotoChange}
          />
          {user.profilePhoto ? (
            <Popover open={avatarPopoverOpen} onOpenChange={setAvatarPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="group relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 cursor-pointer"
                  aria-label={t('avatar')}
                >
                  {photoUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200/90 dark:bg-gray-700/90 z-10">
                      <LoadingSpinner size={40} variant="imageOverlay" className="w-10 h-10" />
                    </div>
                  ) : null}
                  <Image
                    src={user.profilePhoto}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                  <span className="absolute inset-0 rounded-full bg-black/10 dark:bg-white/10 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" className="w-56 p-1">
                <div className="grid gap-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    onClick={() => {
                      setAvatarPopoverOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    {t('changeProfilePicture')}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    onClick={() => {
                      setAvatarPopoverOpen(false);
                      setPhotoModalUrl(user.profilePhoto ?? null);
                    }}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    {t('seeProfilePicture')}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-left"
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    {t('removeProfilePicture')}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 cursor-pointer flex items-center justify-center group"
              aria-label={t('uploadPhoto')}
            >
              {photoUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200/90 dark:bg-gray-700/90 z-10">
                  <LoadingSpinner size={40} variant="imageOverlay" className="w-10 h-10" />
                </div>
              ) : (
                <>
                  <span className="text-3xl text-gray-500 dark:text-gray-400 group-hover:opacity-0 transition-opacity">
                    {getInitials(user.fullName || username)}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                  </span>
                  <span className="absolute inset-0 rounded-full bg-white/10 dark:bg-black/10 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100" aria-hidden />
                </>
              )}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Profile picture modal (see full size) */}
      {photoModalUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('seeProfilePicture')}
          onClick={() => setPhotoModalUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setPhotoModalUrl(null)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photoModalUrl}
              alt=""
              width={400}
              height={400}
              className="object-contain max-w-full max-h-[90vh] w-auto h-auto rounded-lg"
              unoptimized
            />
          </div>
        </div>
      ) : null}

      {/* 2. Identity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('identity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('username')}
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className={'max-w-[400px] ' + (usernameError ? 'border-red-500' : '')}
            />
            {usernameError && (
              <p className="text-sm text-red-500 mt-1">{usernameError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fullName')}
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="max-w-[400px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bio')} (max 300)
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              className="resize-none max-w-[400px]"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{bio.length}/300</p>
          </div>
          <div>
            <IsraelCitiesAutocomplete
              value={city}
              onChange={setCity}
              label={t('city')}
              locale={locale}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('relatedSports')}
            </span>
            <TooltipProvider delayDuration={50}>
              <div className="flex flex-wrap gap-2">
                {RELATED_SPORTS_CONFIG.map((sport) => {
                  const isSelected = relatedSports.includes(sport.value);
                  return (
                    <Tooltip key={sport.value}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={isSelected ? sport.variant : 'gray'}
                          size="sm"
                          onClick={() =>
                            setRelatedSports((prev) =>
                              isSelected
                                ? prev.filter((s) => s !== sport.value)
                                : [...prev, sport.value]
                            )
                          }
                          aria-label={t(`sports.${sport.value}`)}
                          className="inline-flex items-center gap-2"
                        >
                          <Icon name={sport.iconName} className="w-5 h-5" />
                          <span>{t(`sports.${sport.value}`)}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="text-center"
                        variant={isSelected ? sport.variant : 'gray'}
                      >
                        {t(`sports.${sport.value}`)}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
          <Button 
            variant="primary"
            onClick={handleSave} 
            disabled={saving}
            >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 3. Progress (read-only, only if xpSystem) */}
      {featureFlags.xpSystem && (
        <Card className="max-w-[400px]  mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('progress')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: user.levelColor }}
              >
                {levelTitle}
              </span>
              {featureFlags.personalRanking && user.currentRank > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="dark:hidden" style={user.levelTextColorLight ? { color: user.levelTextColorLight } : undefined}>
                    {t('currentRank')}: #{user.currentRank}
                  </span>
                  <span className="hidden dark:inline" style={user.levelTextColorDark ? { color: user.levelTextColorDark } : undefined}>
                    {t('currentRank')}: #{user.currentRank}
                  </span>
                </span>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{t('totalXP')}: {currentXP} XP</span>
                {user.nextLevelMinXP != null && (
                  <span>
                    {currentXP} / {user.nextLevelMinXP} {nextLevelTitle && `(${nextLevelTitle})`}
                  </span>
                )}
              </div>
              {user.nextLevelMinXP != null && (
                <div className="relative h-2 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 dark:hidden"
                    style={{ backgroundColor: user.levelTextColorLight ?? '#e5e7eb' }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0 hidden dark:block"
                    style={{ backgroundColor: user.levelTextColorDark ?? '#374151' }}
                    aria-hidden
                  />
                  <div
                    className="relative h-full rounded-full transition-all"
                    style={{
                      width: `${xpProgress * 100}%`,
                      backgroundColor: user.levelColor,
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Streak (read-only, only if streaks) */}
      {featureFlags.streaks && user.streak && (
        <Card className="max-w-[400px] mb-6">
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
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.streak.weeklyHoursThisWeek ?? 0}h
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('weeklyHours')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Badges (only if xpSystem) */}
      {featureFlags.xpSystem && (
        <Card className="max-w-[400px] mb-6">
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
                    {user.badgeEarnedAt[b.id] && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(user.badgeEarnedAt[b.id]).toLocaleDateString(locale)}
                      </p>
                    )}
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

      {/* 6. XP History (only if xpSystem) */}
      {featureFlags.xpSystem && (
        <Card className="max-w-[400px] mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('xpHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {xpLoading && xpHistory.length === 0 ? (
              <Skeleton className="h-32 w-full" />
            ) : xpHistory.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">No XP activity yet.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead className="text-right">{t('xpAmount')}</TableHead>
                      <TableHead>{t('source')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {xpHistory.map((ev) => (
                      <TableRow key={ev._id}>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {new Date(ev.createdAt).toLocaleDateString(locale)}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-white">
                          {tEventType(ev.type) || ev.type}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={ev.xpAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {ev.xpAmount >= 0 ? '+' : ''}{ev.xpAmount}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">{ev.sourceType || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {xpHasMore && (
                  <Button
                    variant="gray"
                    size="sm"
                    className="mt-4"
                    onClick={loadMoreXp}
                    disabled={xpLoading}
                  >
                    {xpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('loadMore')}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
