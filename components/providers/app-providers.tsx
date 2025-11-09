'use client';

import { SessionProvider } from './session-provider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * App-level providers wrapper
 * Includes SessionProvider for NextAuth and ThemeProvider for theme management
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}

