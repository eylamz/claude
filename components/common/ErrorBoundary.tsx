'use client';

import React from 'react';
import { logError } from '@/lib/logging/errorLogger';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  async componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
    await logError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600">Please try again later.</p>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}


