'use client';

import { SessionProvider } from './session-provider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * App-level providers wrapper
 * Includes SessionProvider for NextAuth, ThemeProvider for theme management, TooltipProvider for tooltips, and Toaster for toast notifications
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

