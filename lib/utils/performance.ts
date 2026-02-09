type WebVitalMetric = {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'INP' | 'TTFB';
  value: number;
  delta?: number;
};

type MetricListener = (metric: WebVitalMetric) => void;

const listeners = new Set<MetricListener>();

export function onMetric(listener: MetricListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(metric: WebVitalMetric) {
  listeners.forEach((l) => l(metric));
}

// Core Web Vitals (lazy import web-vitals to avoid hard dependency)
export async function initCoreWebVitals() {
  if (typeof window === 'undefined') return;
  try {
    const webVitals = await import(/* webpackIgnore: true */ 'web-vitals') as {
      onFCP: (cb: (m: { value: number }) => void) => void;
      onLCP: (cb: (m: { value: number }) => void) => void;
      onCLS: (cb: (m: { value: number }) => void) => void;
      onFID: (cb: (m: { value: number }) => void) => void;
      onINP?: (cb: (m: { value: number }) => void) => void;
      onTTFB: (cb: (m: { value: number }) => void) => void;
    };
    webVitals.onFCP((m) => emit({ name: 'FCP', value: m.value }));
    webVitals.onLCP((m) => emit({ name: 'LCP', value: m.value }));
    webVitals.onCLS((m) => emit({ name: 'CLS', value: m.value }));
    webVitals.onFID((m) => emit({ name: 'FID', value: m.value }));
    if (webVitals.onINP) webVitals.onINP((m) => emit({ name: 'INP', value: m.value }));
    webVitals.onTTFB((m) => emit({ name: 'TTFB', value: m.value }));
  } catch (e) {
    // web-vitals not installed; silently skip
  }
}

// Page load metrics via Performance API
export function getPageLoadMetrics() {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return null;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;
  return {
    domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
    firstPaint: getPaint('first-paint'),
    firstContentfulPaint: getPaint('first-contentful-paint'),
    loadTime: nav.loadEventEnd - nav.startTime,
    responseTime: nav.responseEnd - nav.requestStart,
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    ttfb: nav.responseStart - nav.requestStart,
  };
}

function getPaint(name: 'first-paint' | 'first-contentful-paint') {
  const paints = performance.getEntriesByType('paint') as PerformanceEntry[];
  const entry = paints.find((p) => p.name === name);
  return entry ? entry.startTime : 0;
}

// API timing and client-side caching
type CacheEntry<T> = { data: T; expiry: number };
const responseCache = new Map<string, CacheEntry<any>>();

export async function fetchWithTiming<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit & { cacheTtlMs?: number; fields?: string; signal?: AbortSignal }
): Promise<{ data: T; durationMs: number; fromCache: boolean }> {
  const url = typeof input === 'string' ? input : (input as URL).toString();
  const key = `${url}::${JSON.stringify({ ...init, signal: undefined })}`;
  const now = Date.now();

  const ttl = init?.cacheTtlMs ?? 0;
  if (ttl > 0) {
    const cached = responseCache.get(key);
    if (cached && cached.expiry > now) {
      return { data: cached.data as T, durationMs: 0, fromCache: true };
    }
  }

  const start = performance.now();
  const res = await fetch(input, init);
  const durationMs = performance.now() - start;
  const data = (await res.json()) as T;

  if (ttl > 0 && res.ok) {
    responseCache.set(key, { data, expiry: now + ttl });
  }

  return { data, durationMs, fromCache: false };
}

// Image load timing
export function trackImageLoad(img: HTMLImageElement, cb: (ms: number) => void) {
  const start = performance.now();
  if (img.complete && img.naturalWidth) {
    cb(0);
    return;
  }
  const onLoad = () => {
    cb(performance.now() - start);
    img.removeEventListener('load', onLoad);
    img.removeEventListener('error', onError);
  };
  const onError = () => {
    img.removeEventListener('load', onLoad);
    img.removeEventListener('error', onError);
  };
  img.addEventListener('load', onLoad);
  img.addEventListener('error', onError);
}

// Prefetch utilities (Next.js app router)
export async function prefetchRoutes(paths: string[], prefetch: (href: string) => Promise<void> | void) {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => paths.forEach((p) => prefetch(p)));
  } else {
    setTimeout(() => paths.forEach((p) => prefetch(p)), 200);
  }
}

// Dynamic import helper with suspense
export function dynamicImport<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  _options?: { ssr?: boolean }
) {
  // Consumer should use React.lazy with Suspense in app router
  return loader;
}

// Query helpers for API pagination/fields
export function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  return q.toString();
}

export function selectFields<T extends object>(obj: T, fields?: string): Partial<T> {
  if (!fields) return obj;
  const set = new Set(fields.split(',').map((s) => s.trim()));
  const out: Partial<T> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (set.has(k)) (out as any)[k] = v;
  });
  return out;
}



