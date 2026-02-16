'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageLoadingContextType {
  loading: boolean;
  setLoading: (value: boolean) => void;
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined);

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoadingState] = useState(false);
  const setLoading = useCallback((value: boolean) => {
    setLoadingState(value);
  }, []);

  return (
    <PageLoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading(): PageLoadingContextType {
  const ctx = useContext(PageLoadingContext);
  if (ctx === undefined) {
    throw new Error('usePageLoading must be used within a PageLoadingProvider');
  }
  return ctx;
}
