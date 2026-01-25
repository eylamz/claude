'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { hasConsent } from '@/lib/utils/cookie-consent';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme - the blocking script in layout.tsx will have already set the class
  // So we read from localStorage or system preference to sync React state
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) return storedTheme;
    
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  const updateMetaThemeColor = useCallback((newTheme: Theme) => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const color = newTheme === 'dark' ? '#181c21' : '#f6f7f9';
    
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = color;
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, []);

  const applyTheme = useCallback((newTheme: Theme, skipStorage = false) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Only save to localStorage if user has consented to functional cookies
    if (!skipStorage && hasConsent('functional')) {
      localStorage.setItem('theme', newTheme);
    }
    updateMetaThemeColor(newTheme);
  }, [updateMetaThemeColor]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      // Only save to localStorage if user has consented to functional cookies
      const skipStorage = !hasConsent('functional');
      applyTheme(newTheme, skipStorage);
      return newTheme;
    });
  }, [applyTheme]);

  useEffect(() => {
    setMounted(true);
    // Sync theme state with what's already applied (from blocking script)
    // This ensures the React state matches the actual DOM state
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Only apply if it's different from what's already set by the blocking script
    const hasDarkClass = document.documentElement.classList.contains('dark');
    const shouldBeDark = currentTheme === 'dark';
    
    if (hasDarkClass !== shouldBeDark) {
      applyTheme(currentTheme);
    }
    
    setTheme(currentTheme);
  }, [applyTheme]);

  // Update meta theme-color when theme changes
  useEffect(() => {
    if (mounted) {
      updateMetaThemeColor(theme);
    }
  }, [theme, mounted, updateMetaThemeColor]);

  // Always provide context, even before mount to prevent errors
  // Use default values during initial render
  const contextValue = mounted 
    ? { theme, toggleTheme }
    : { theme: 'light' as Theme, toggleTheme: () => {} };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}



