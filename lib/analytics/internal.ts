/**
 * Internal analytics (MongoDB-backed). Only active when NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'.
 */

import type { ConsentChoice, DeviceCategory, ReferrerCategory } from '@/lib/models/AnalyticsEvent';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
const SESSION_STORAGE_KEY = 'analytics_session_id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return generateId();
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export function getDeviceInfo(): { deviceType: string; deviceCategory: DeviceCategory } {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'unknown', deviceCategory: 'desktop' };
  }
  const ua = navigator.userAgent.toLowerCase();
  let deviceType = 'unknown';
  let deviceCategory: DeviceCategory = 'desktop';

  // Tablets (check before mobile so iPad with mobile UA is classified as tablet where possible)
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(ua)) {
    deviceCategory = 'tablet';
    if (/ipad/.test(ua)) deviceType = 'ios';
    else if (/android/.test(ua)) deviceType = 'android';
    else deviceType = 'tablet';
  }
  // Mobile
  else if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|windows phone/.test(ua)) {
    deviceCategory = 'mobile';
    if (/android/.test(ua)) deviceType = 'android';
    else if (/iphone|ipod/.test(ua)) deviceType = 'ios';
    else if (/windows phone/.test(ua)) deviceType = 'windows';
    else deviceType = 'mobile';
  }
  // Desktop
  else {
    deviceCategory = 'desktop';
    if (/windows/.test(ua)) deviceType = 'windows';
    else if (/mac/.test(ua)) deviceType = 'macos';
    else if (/linux/.test(ua)) deviceType = 'linux';
    else deviceType = 'desktop';
  }

  return { deviceType, deviceCategory };
}

export function getReferrerCategory(referrer: string, currentHost: string): ReferrerCategory {
  if (!referrer || referrer.trim() === '') return 'direct';
  try {
    const refUrl = new URL(referrer);
    const refHost = refUrl.hostname.toLowerCase();
    if (refHost === currentHost) return 'internal';
    if (refHost.includes('google')) return 'google';
    const socialHosts = [
      'facebook.com',
      'fb.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'linkedin.com',
      'tiktok.com',
      'youtube.com',
      'pinterest.com',
      'reddit.com',
      'snapchat.com',
      'whatsapp.com',
      't.co',
    ];
    if (socialHosts.some((h) => refHost.includes(h))) return 'social';
  } catch {
    // invalid URL
  }
  return 'other';
}

export interface PageViewPayload {
  path: string;
  locale?: string;
  timeOnPageMs?: number;
  referrer?: string;
  referrerCategory?: ReferrerCategory;
  deviceType?: string;
  deviceCategory?: DeviceCategory;
  sessionId?: string;
}

function sendToTrack(body: object): void {
  if (!ENABLE_ANALYTICS) return;
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // fire-and-forget
  });
}

export function trackConsent(choice: ConsentChoice): void {
  if (!ENABLE_ANALYTICS) return;
  const sessionId = typeof sessionStorage !== 'undefined' ? getSessionId() : undefined;
  sendToTrack({
    type: 'consent',
    choice,
    ...(sessionId && { sessionId }),
  });
}

export function trackPageView(payload: PageViewPayload): void {
  if (!ENABLE_ANALYTICS) return;
  const sessionId = payload.sessionId ?? getSessionId();
  const { deviceType, deviceCategory } = getDeviceInfo();
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const referrer = payload.referrer ?? (typeof document !== 'undefined' ? document.referrer : '');
  const referrerCategory = payload.referrerCategory ?? getReferrerCategory(referrer, currentHost);

  sendToTrack({
    type: 'page_view',
    path: payload.path,
    sessionId,
    timestamp: new Date().toISOString(),
    ...(payload.locale && { locale: payload.locale }),
    ...(payload.timeOnPageMs !== undefined && { timeOnPageMs: payload.timeOnPageMs }),
    deviceType: payload.deviceType ?? deviceType,
    deviceCategory: payload.deviceCategory ?? deviceCategory,
    referrer: referrer || undefined,
    referrerCategory,
  });
}

export function isAnalyticsEnabled(): boolean {
  return ENABLE_ANALYTICS;
}
