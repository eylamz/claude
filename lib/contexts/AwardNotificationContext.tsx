'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

import { featureFlags } from '@/lib/config/feature-flags';
import {
  AwardNotificationItem,
  useAwardNotifications,
} from '@/lib/hooks/useAwardNotifications';

interface AwardNotificationContextValue {
  currentNotification: AwardNotificationItem | null;
  dismissCurrent: () => Promise<void>;
  queueLength: number;
  isEnabled: boolean;
}

const AwardNotificationContext = createContext<AwardNotificationContextValue | undefined>(
  undefined
);

interface AwardNotificationProviderProps {
  children: ReactNode;
}

export function AwardNotificationProvider({ children }: AwardNotificationProviderProps) {
  const { data: session, status } = useSession();

  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const isEnabled = featureFlags.awardPopups && isLoggedIn;

  const { currentNotification, dismissCurrent, queueLength } = useAwardNotifications(isEnabled);

  const value: AwardNotificationContextValue = {
    currentNotification: isEnabled ? currentNotification : null,
    dismissCurrent: isEnabled ? dismissCurrent : async () => {},
    queueLength: isEnabled ? queueLength : 0,
    isEnabled,
  };

  return (
    <AwardNotificationContext.Provider value={value}>
      {children}
    </AwardNotificationContext.Provider>
  );
}

export function useAwardNotificationContext(): AwardNotificationContextValue {
  const ctx = useContext(AwardNotificationContext);
  if (!ctx) {
    throw new Error(
      'useAwardNotificationContext must be used within an AwardNotificationProvider'
    );
  }
  return ctx;
}

