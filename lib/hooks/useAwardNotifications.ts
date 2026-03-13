'use client';

import { useEffect, useState, useCallback } from 'react';

import { featureFlags } from '@/lib/config/feature-flags';

export type AwardNotificationType =
  | 'xp'
  | 'badge'
  | 'level_up'
  | 'streak'
  | 'king_crowned'
  | 'king_dethroned';

export interface LocalizedText {
  en: string;
  he: string;
}

export interface AwardNotificationItem {
  id: string;
  type: AwardNotificationType;
  xpAmount?: number | null;
  badgeId?: string | null;
  badgeName?: LocalizedText | null;
  badgeIcon?: string | null;
  levelId?: number | null;
  levelTitle?: LocalizedText | null;
  message: LocalizedText;
  sourceType: string;
  createdAt: string | Date;
}

export interface UseAwardNotificationsResult {
  currentNotification: AwardNotificationItem | null;
  dismissCurrent: () => Promise<void>;
  queueLength: number;
}

const POLL_INTERVAL_MS = 30_000;

export function useAwardNotifications(enabled: boolean = true): UseAwardNotificationsResult {
  const [queue, setQueue] = useState<AwardNotificationItem[]>([]);

  const effectiveEnabled = enabled && featureFlags.awardPopups;

  const fetchUnread = useCallback(async () => {
    if (!effectiveEnabled) {
      return;
    }

    try {
      const res = await fetch('/api/notifications/unread', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        // 401/403 or server error - do not throw, just stop updating the queue
        return;
      }

      const data = await res.json();
      const notifications = Array.isArray(data.notifications)
        ? (data.notifications as AwardNotificationItem[])
        : [];

      setQueue((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const merged = [...prev];

        for (const n of notifications) {
          if (!existingIds.has(n.id)) {
            merged.push(n);
          }
        }

        return merged;
      });
    } catch {
      // Swallow network errors; will retry on next poll.
    }
  }, [effectiveEnabled]);

  useEffect(() => {
    if (!effectiveEnabled) {
      setQueue([]);
      return;
    }

    let intervalId: number | undefined;
    let isMounted = true;

    const startPolling = async () => {
      await fetchUnread();

      intervalId = window.setInterval(() => {
        if (!isMounted) return;
        void fetchUnread();
      }, POLL_INTERVAL_MS);
    };

    void startPolling();

    return () => {
      isMounted = false;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [effectiveEnabled, fetchUnread]);

  const dismissCurrent = useCallback(async () => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [, ...rest] = prev;
      return rest;
    });

    const current = queue[0];
    if (!current) {
      return;
    }

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids: [current.id] }),
      });
    } catch {
      // If marking as read fails, we still removed it from the UI queue.
    }
  }, [queue]);

  return {
    currentNotification: queue[0] ?? null,
    dismissCurrent,
    queueLength: queue.length,
  };
}

