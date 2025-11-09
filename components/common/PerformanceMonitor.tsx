'use client';

import { useEffect, useRef, useState } from 'react';
import { initCoreWebVitals, onMetric, getPageLoadMetrics } from '@/lib/utils/performance';

type NetLog = { method: string; url: string; status: number; ms: number; cached?: boolean };

export default function PerformanceMonitor() {
  if (process.env.NODE_ENV === 'production') return null as any;

  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [bundleWarn, setBundleWarn] = useState<string | null>(null);
  const [net, setNet] = useState<NetLog[]>([]);
  const originalFetch = useRef<typeof fetch | null>(null);

  useEffect(() => {
    initCoreWebVitals();
    const page = getPageLoadMetrics();
    if (page) setMetrics((m) => ({ ...m, FCP: page.firstContentfulPaint, TTFB: page.ttfb, Load: page.loadTime }));
    const off = onMetric((m) => setMetrics((prev) => ({ ...prev, [m.name]: Number(m.value.toFixed(2)) })));

    // Monkey-patch fetch to log timings in dev only
    if (typeof window !== 'undefined') {
      originalFetch.current = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const start = performance.now();
        const res = await originalFetch.current!(input, init);
        const ms = performance.now() - start;
        try {
          const url = typeof input === 'string' ? input : (input as URL).toString();
          setNet((prev) => [{ method: (init?.method || 'GET').toUpperCase(), url, status: res.status, ms: Math.round(ms) }, ...prev].slice(0, 25));
        } catch {}
        return res;
      };
    }

    // Bundle size warning via Performance API (approximate transferred size if available)
    try {
      const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = perfEntries[0];
      const transfer = (nav as any)?.transferSize as number | undefined;
      if (transfer && transfer > 1_000_000) {
        setBundleWarn(`Large transfer: ${(transfer / 1024 / 1024).toFixed(2)} MB`);
      }
    } catch {}

    return () => {
      off();
      if (originalFetch.current) window.fetch = originalFetch.current;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[1000]">
      <div className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/90 backdrop-blur p-3 w-72 text-xs text-gray-800 dark:text-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Performance</span>
          {bundleWarn && <span className="text-amber-600 font-medium">{bundleWarn}</span>}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
          {['FCP','LCP','CLS','FID','INP','TTFB','Load'].map((k) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-gray-500">{k}</span>
              <span className="font-mono">{metrics[k] ?? '—'}</span>
            </div>
          ))}
        </div>
        <div className="max-h-40 overflow-auto space-y-1">
          {net.length === 0 ? (
            <div className="text-gray-500">No requests yet</div>
          ) : (
            net.map((n, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="shrink-0 font-medium">{n.method}</span>
                <span className="truncate text-gray-600 dark:text-gray-400" title={n.url}>{n.url}</span>
                <span className={`shrink-0 ${n.status >= 400 ? 'text-red-600' : 'text-green-600'}`}>{n.status}</span>
                <span className="shrink-0 font-mono">{n.ms}ms</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



