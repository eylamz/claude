'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Separator,
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
import { ChevronLeft, Upload, Flame, Trophy, Loader2, X } from 'lucide-react';

const RELATED_SPORTS_CONFIG = [
  { value: 'rollerblading' as const, iconName: 'Roller' as const, variant: 'teal' as const },
  { value: 'skateboarding' as const, iconName: 'Skate' as const, variant: 'teal' as const },
  { value: 'scootering' as const, iconName: 'scooter' as const, variant: 'teal' as const },
  { value: 'bmx' as const, iconName: 'bmx-icon' as const, variant: 'teal' as const },
] as const;
const XP_PAGE_SIZE = 20;

const featureFlags = {
  xpSystem: process.env.NEXT_PUBLIC_ENABLE_XP_SYSTEM === 'true',
  streaks: process.env.NEXT_PUBLIC_ENABLE_STREAKS === 'true',
  personalRanking: process.env.NEXT_PUBLIC_ENABLE_PERSONAL_RANKING === 'true',
};

/** Rarity-based styles for badge cards so design differs by tier */
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

interface ProfileUser {
  _id: string;
  username: string;
  fullName: string;
  bio: string;
  profilePhoto?: string | null;
  city: string;
  email?: string;
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
  const router = useRouter();
  const t = useTranslations('common.account');
  const tEventType = (key: string) => t(`xpEventTypes.${key}` as any);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const savedSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    return () => {
      if (savedSuccessTimeoutRef.current) clearTimeout(savedSuccessTimeoutRef.current);
    };
  }, []);

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
      window.dispatchEvent(new CustomEvent('account-profile-updated'));
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
      window.dispatchEvent(new CustomEvent('account-profile-updated'));
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
      setSavedSuccess(true);
      if (savedSuccessTimeoutRef.current) clearTimeout(savedSuccessTimeoutRef.current);
      savedSuccessTimeoutRef.current = setTimeout(() => setSavedSuccess(false), 3000);
      window.dispatchEvent(new CustomEvent('account-profile-updated'));
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
        {/* Back link */}
        <Skeleton className="h-5 w-32 mb-6" />
        {/* Page title */}
        <Skeleton className="h-8 w-48 mb-6" />

        {/* Avatar card */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          </CardContent>
        </Card>

        {/* Identity card */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="max-w-[400px] w-full flex flex-col gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full max-w-[400px] rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full max-w-[400px] rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-20 w-full max-w-[400px] rounded-xl" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <div className="flex gap-2 flex-wrap">
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <Skeleton className="h-10 w-20 rounded-xl" />
          </CardContent>
        </Card>

        {/* Progress card */}
        <Card className="max-w-[400px] mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Badges / XP History card */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-3/4 rounded-lg" />
            </div>
          </CardContent>
        </Card>
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
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t('avatar')}</h2>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <label htmlFor="profile-avatar-upload" className="sr-only">
            {t('avatar')}
          </label>
          <input
            id="profile-avatar-upload"
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
                  className="group relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-text dark:focus:ring-brand-text dark:focus:ring-offset-gray-900 cursor-pointer"
                  aria-label={t('avatar')}
                >
                  {photoUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <LoadingSpinner size={40} variant="imageOverlay" className="w-10 h-10" />
                    </div>
                  ) : null}
                  <Image
                    src={user.profilePhoto}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="288px"
                    quality={95}
                  />
                  <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 flex items-center justify-center" aria-hidden>
                    <Icon name="edit" className="w-8 h-8 text-white drop-shadow-sm" />
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                className={`w-fit p-2 ${locale === 'he' ? '!left-0 !right-auto' : '!right-0 !left-auto'}`}
              >
                <div className="flex flex-col gap-2 justify-center items-center">
                  <Button
                    variant="none"
                    size="sm"
                    type="button"
                    className={`!px-2 group w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                    onClick={() => {
                      setAvatarPopoverOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Icon
                      name="edit"
                      className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200"
                    />
                    <span className="text-text dark:text-text-dark/90">
                      {t('changeProfilePicture')}
                    </span>
                  </Button>
                  <Button
                    variant="none"
                    size="sm"
                    type="button"
                    className={`!px-2 group w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                    onClick={() => {
                      setAvatarPopoverOpen(false);
                      setPhotoModalUrl(user.profilePhoto ?? null);
                    }}
                  >
                    <Icon
                      name="image"
                      className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200"
                    />
                    <span className="text-text dark:text-text-dark/90">
                      {t('seeProfilePicture')}
                    </span>
                  </Button>
                  <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                  <Button
                    variant="none"
                    size="sm"
                    type="button"
                    className={`!px-2 w-full flex gap-2 font-medium justify-start border border-transparent hover:border-red-border dark:hover:border-red-border-dark hover:bg-red-bg dark:hover:bg-red-bg-dark text-red dark:text-red-dark hover:text-red dark:hover:text-red-dark transition-all duration-300 ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                    onClick={handleRemovePhoto}
                  >
                    <Icon name="trash" className="w-4 h-4" />
                    <span>{t('removeProfilePicture')}</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-text dark:focus:ring-brand-main dark:focus:ring-offset-gray-900 cursor-pointer flex items-center justify-center group"
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
        <CardContent className="flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row gap-8">
          <div className="max-w-[400px] w-full flex flex-col gap-4">
            <div>
              <label htmlFor="profile-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('username')}
              </label>
              <Input
                id="profile-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                className={'max-w-[400px] ' + (usernameError ? 'border-red-500' : '')}
              />
              {usernameError && (
                <p className="text-sm text-red dark:text-red-dark mt-1">{usernameError}</p>
              )}
            </div>
            <div>
              <label htmlFor="profile-fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('fullName')}
              </label>
              <Input
                id="profile-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                className="max-w-[400px]"
              />
            </div>
            <div>
              <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('bio')}
              </label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                rows={3}
                className="resize-none max-w-[400px]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{bio.length}/300</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
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
              <div className="flex items-center gap-2 flex-wrap">
                {RELATED_SPORTS_CONFIG.map((sport) => {
                  const isSelected = relatedSports.includes(sport.value);
                  return (
                    <Tooltip key={sport.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isSelected ? sport.variant : 'gray'}
                          size="sm"
                          onClick={() =>
                            setRelatedSports((prev) =>
                              isSelected
                                ? prev.filter((s) => s !== sport.value)
                                : [...prev, sport.value]
                            )
                          }
                          aria-label={t('sports.' + sport.value)}
                        >
                          <Icon name={sport.iconName as any} className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="text-center"
                        variant={isSelected ? sport.variant : 'gray'}
                      >
                        {t('sports.' + sport.value)}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
            </div>
          </div>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="w-20 flex gap-2 items-center text-sm"
          >
            {saving ? (
              <>
                <LoadingSpinner variant="brandText" size={20} className="animate-fadeIn shrink-0" />
             
              </>
            ) : savedSuccess ? (
              <>
                <Icon name="checkmark" className="w-10 h-10 opacity-0 animate-popFadeIn" />
              </> 
            ) : (
              <span className="animate-fadeIn">{t('save')}</span>
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
              {featureFlags.personalRanking && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="dark:hidden" style={user.levelTextColorLight ? { color: user.levelTextColorLight } : undefined}>
                    {t('currentRank')}: {user.currentRank > 0 ? `#${user.currentRank}` : '—'}
                  </span>
                  <span className="hidden dark:inline" style={user.levelTextColorDark ? { color: user.levelTextColorDark } : undefined}>
                    {t('currentRank')}: {user.currentRank > 0 ? `#${user.currentRank}` : '—'}
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
              <Flame className="w-5 h-5 fill-brand-main text-brand-color" />
              {t('streak')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.streak.currentWeeklyStreak ?? 0}
                </p>
                <h3 className="text-sm font-normal text-gray-600 dark:text-gray-400">{t('weeklyStreak')}</h3>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.streak.currentMonthlyStreak ?? 0}
                </p>
                <h3 className="text-sm font-normal text-gray-600 dark:text-gray-400">{t('monthlyStreak')}</h3>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.streak.weeklyHoursThisWeek ?? 0}h
                </p>
                <h3 className="text-sm font-normal text-gray-600 dark:text-gray-400">{t('weeklyHours')}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Badges (only if xpSystem) */}
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
                      {user.badgeEarnedAt[b.id] && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2">
                          {new Date(user.badgeEarnedAt[b.id]).toLocaleDateString(locale)}
                        </p>
                      )}
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

      {/* 6. XP History (only if xpSystem) */}
      {featureFlags.xpSystem && (
        <Card className="mb-6">
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
                          <span className={ev.xpAmount >= 0 ? 'text-brand-text dark:text-brand-dark' : 'text-red dark:text-red-dark'}>
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
