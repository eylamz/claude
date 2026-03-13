'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { featureFlags } from '@/lib/config/feature-flags';
import { useAppLocale } from '@/hooks';
import { useAwardNotificationContext } from '@/lib/contexts/AwardNotificationContext';
import { LEVELS } from '@/lib/config/levels';
import type { AwardNotificationType } from '@/lib/hooks/useAwardNotifications';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-200 text-gray-800',
  rare: 'bg-blue-100 text-blue-800',
  epic: 'bg-purple-100 text-purple-800',
  legendary: 'bg-yellow-100 text-yellow-800',
};

function getLevelColor(levelId?: number | null): string {
  if (!levelId) return '#f97316';
  const level = LEVELS.find((l) => l.id === levelId);
  return level?.color ?? '#f97316';
}

function getAutoDismissDuration(type: AwardNotificationType | undefined): number | null {
  switch (type) {
    case 'xp':
      return 3000;
    case 'king_crowned':
      return 5000;
    case 'king_dethroned':
      return 4000;
    case 'streak':
      return 4000;
    default:
      return null;
  }
}

export function AwardPopup() {
  const { status } = useSession();
  const locale = useAppLocale();
  const { currentNotification, dismissCurrent, isEnabled } = useAwardNotificationContext();

  useEffect(() => {
    if (!currentNotification) return;

    const duration = getAutoDismissDuration(currentNotification.type);
    if (!duration) return;

    const timer = window.setTimeout(() => {
      void dismissCurrent();
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentNotification, dismissCurrent]);

  const shouldRender =
    featureFlags.awardPopups && status === 'authenticated' && isEnabled && currentNotification;

  if (!shouldRender) {
    return null;
  }

  const messageText =
    locale === 'he' ? currentNotification.message.he : currentNotification.message.en;

  switch (currentNotification.type) {
    case 'xp':
      return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in-up">
          <div className="rounded-xl bg-slate-900 text-white shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400">
              <span className="text-sm font-semibold text-amber-300">
                +{currentNotification.xpAmount ?? 0}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-amber-300">
                XP Earned
              </span>
              <span className="text-sm">{messageText}</span>
            </div>
          </div>
        </div>
      );

    case 'badge': {
      const badgeName =
        locale === 'he'
          ? currentNotification.badgeName?.he ?? currentNotification.badgeName?.en
          : currentNotification.badgeName?.en ?? currentNotification.badgeName?.he;

      const rarityClass = rarityColors['common'];

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-md rounded-3xl bg-white px-8 py-10 text-center shadow-2xl overflow-hidden">
            <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-400/30 blur-3xl animate-pulse-slow" />

            <div className="relative flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <span>New Badge Unlocked</span>
              </div>

              <div className="relative h-24 w-24 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center shadow-xl animate-celebrate-pop overflow-hidden">
                {currentNotification.badgeIcon ? (
                  <img
                    src={currentNotification.badgeIcon}
                    alt={badgeName ?? 'Badge'}
                    className="h-20 w-20 object-contain p-4"
                  />
                ) : (
                  <span className="text-4xl">🏅</span>
                )}
              </div>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{badgeName}</h2>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${rarityClass}`}
                >
                  Badge
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">{messageText}</p>

              <button
                type="button"
                onClick={() => void dismissCurrent()}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition"
              >
                Nice!
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-amber-300/40 blur-3xl animate-celebrate-burst" />
              <div className="absolute -right-10 top-0 h-24 w-24 rounded-full bg-amber-200/40 blur-3xl animate-celebrate-burst delay-150" />
            </div>
          </div>
        </div>
      );
    }

    case 'level_up': {
      const levelTitle =
        locale === 'he'
          ? currentNotification.levelTitle?.he ?? currentNotification.levelTitle?.en
          : currentNotification.levelTitle?.en ?? currentNotification.levelTitle?.he;

      const levelColor = getLevelColor(currentNotification.levelId ?? undefined);

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-950 px-8 py-10 text-center shadow-2xl overflow-hidden text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-purple-500/10 to-sky-500/20" />
            <div className="relative flex flex-col items-center gap-4">
              <h2 className="text-3xl font-black tracking-tight">Level Up! 🎉</h2>
              <p
                className="text-xl font-semibold mt-1"
                style={{ color: levelColor }}
              >
                {levelTitle}
              </p>

              <p className="mt-2 text-sm text-slate-200 max-w-sm">{messageText}</p>

              <div className="mt-5 w-full max-w-sm rounded-full bg-slate-800/80 p-1.5">
                <div className="h-3 w-full rounded-full bg-slate-900/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 animate-level-bar"
                    style={{ width: '80%' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void dismissCurrent()}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-2 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-300 transition"
              >
                Keep Riding!
              </button>
            </div>
          </div>
        </div>
      );
    }

    case 'king_crowned':
      return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in-up">
          <div className="rounded-xl bg-slate-900 text-white shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm">
            <span className="text-xl">👑</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-amber-300">
                New King
              </span>
              <span className="text-sm">{messageText}</span>
            </div>
          </div>
        </div>
      );

    case 'king_dethroned':
      return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in-up">
          <div className="rounded-xl bg-slate-900 text-white shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm">
            <span className="text-xl">👑</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-rose-300">
                Dethroned
              </span>
              <span className="text-sm">{messageText}</span>
            </div>
          </div>
        </div>
      );

    case 'streak':
      return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in-up">
          <div className="rounded-xl bg-slate-900 text-white shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm">
            <span className="text-xl">🔥</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-orange-300">
                Streak On Fire
              </span>
              <span className="text-sm">{messageText}</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

