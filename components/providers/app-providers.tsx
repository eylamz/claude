'use client';

import { SessionProvider } from './session-provider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * App-level providers wrapper
 * Includes SessionProvider for NextAuth, ThemeProvider for theme management, and TooltipProvider for tooltips
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

