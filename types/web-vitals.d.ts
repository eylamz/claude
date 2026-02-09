declare module 'web-vitals' {
  type MetricCallback = (metric: { value: number; delta?: number; id?: string; name?: string }) => void;
  export function onFCP(cb: MetricCallback): void;
  export function onLCP(cb: MetricCallback): void;
  export function onCLS(cb: MetricCallback): void;
  export function onFID(cb: MetricCallback): void;
  export function onINP(cb: MetricCallback): void;
  export function onTTFB(cb: MetricCallback): void;
}
