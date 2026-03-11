import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import AnalyticsEvent from '@/lib/models/AnalyticsEvent';
import type { ConsentChoice, DeviceCategory, ReferrerCategory, SearchEventSource } from '@/lib/models/AnalyticsEvent';
import { getVisitorTypeFromUserAgent } from '@/lib/utils/visitor-type';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

const CONSENT_CHOICES: ConsentChoice[] = [
  'accept_all',
  'reject_non_essential',
  'save_preferences',
  'il_consent_x',
  'il_consent_confirm',
];
const DEVICE_CATEGORIES: DeviceCategory[] = ['mobile', 'tablet', 'desktop'];
const REFERRER_CATEGORIES: ReferrerCategory[] = ['direct', 'internal', 'google', 'social', 'other'];
const SEARCH_SOURCES: SearchEventSource[] = ['header', 'sidebar', 'search_page'];
const SEARCH_RESULT_TYPES = ['skateparks', 'products', 'events', 'guides', 'trainers'];

/** ISO 3166-1 alpha-2 country code from request IP.
 * Set by the edge: Vercel sets x-vercel-ip-country, Cloudflare sets cf-ipcountry.
 * In development we use "LOCAL" (no geo headers on localhost).
 * In production, if the app is not behind Vercel/Cloudflare, no header is set and we return "unknown".
 */
function getCountryFromRequest(request: NextRequest): string {
  const vercel = request.headers.get('x-vercel-ip-country');
  if (vercel && /^[A-Z]{2}$/i.test(vercel.trim())) return vercel.trim().toUpperCase();
  const cf = request.headers.get('cf-ipcountry');
  if (cf && cf !== 'XX' && /^[A-Z]{2}$/i.test(cf.trim())) return cf.trim().toUpperCase();
  if (process.env.NODE_ENV === 'development') return 'LOCAL';
  return 'unknown';
}

function isValidString(v: unknown, maxLen = 2048): v is string {
  return typeof v === 'string' && v.length <= maxLen;
}

function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

export async function POST(request: NextRequest) {
  if (!ENABLE_ANALYTICS) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { type } = body;

    const userAgent = request.headers.get('user-agent');
    const visitorType = getVisitorTypeFromUserAgent(userAgent);

    if (type === 'consent') {
      const choice = body.choice;
      if (!CONSENT_CHOICES.includes(choice)) {
        return NextResponse.json({ error: 'Invalid consent choice' }, { status: 400 });
      }
      const sessionId = body.sessionId != null && isValidString(body.sessionId, 128) ? body.sessionId : undefined;

      await connectDB();
      await AnalyticsEvent.create({
        type: 'consent',
        timestamp: new Date(),
        choice,
        visitorType,
        ...(sessionId && { sessionId }),
      });
      return new NextResponse(null, { status: 204 });
    }

    if (type === 'page_view') {
      const path = body.path;
      if (!isValidString(path, 1024)) {
        return NextResponse.json({ error: 'Invalid or missing path' }, { status: 400 });
      }
      // Do not store analytics for admin pages or admin users (client should also skip; this is a safety net)
      if (path.includes('/admin')) {
        return new NextResponse(null, { status: 204 });
      }
      const sessionId = body.sessionId != null && isValidString(body.sessionId, 128) ? body.sessionId : undefined;
      const locale = body.locale != null && isValidString(body.locale, 16) ? body.locale : undefined;
      const timeOnPageMs = body.timeOnPageMs != null && isValidNumber(body.timeOnPageMs) ? body.timeOnPageMs : undefined;
      const deviceType = body.deviceType != null && isValidString(body.deviceType, 64) ? body.deviceType : undefined;
      const deviceCategory =
        body.deviceCategory != null && DEVICE_CATEGORIES.includes(body.deviceCategory) ? body.deviceCategory : undefined;
      const referrer = body.referrer != null && isValidString(body.referrer, 2048) ? body.referrer : undefined;
      const referrerCategory =
        body.referrerCategory != null && REFERRER_CATEGORIES.includes(body.referrerCategory)
          ? body.referrerCategory
          : undefined;
      const userId = body.userId != null && isValidString(body.userId, 128) ? body.userId : undefined;
      const country = getCountryFromRequest(request);

      await connectDB();
      await AnalyticsEvent.create({
        type: 'page_view',
        timestamp: new Date(),
        path,
        visitorType,
        ...(sessionId && { sessionId }),
        ...(locale && { locale }),
        ...(timeOnPageMs !== undefined && { timeOnPageMs }),
        ...(deviceType && { deviceType }),
        ...(deviceCategory && { deviceCategory }),
        ...(referrer !== undefined && { referrer }),
        ...(referrerCategory && { referrerCategory }),
        ...(userId && { userId }),
        country: country,
      });
      return new NextResponse(null, { status: 204 });
    }

    if (type === 'search_query') {
      const query = body.query;
      if (!isValidString(query, 512)) {
        return NextResponse.json({ error: 'Invalid or missing query' }, { status: 400 });
      }
      const sessionId = body.sessionId != null && isValidString(body.sessionId, 128) ? body.sessionId : undefined;
      const locale = body.locale != null && isValidString(body.locale, 16) ? body.locale : undefined;
      const source =
        body.source != null && SEARCH_SOURCES.includes(body.source as SearchEventSource)
          ? (body.source as SearchEventSource)
          : undefined;
      const deviceCategory =
        body.deviceCategory != null && DEVICE_CATEGORIES.includes(body.deviceCategory) ? body.deviceCategory : undefined;
      const deviceType = body.deviceType != null && isValidString(body.deviceType, 64) ? body.deviceType : undefined;

      await connectDB();
      await AnalyticsEvent.create({
        type: 'search_query',
        timestamp: new Date(),
        query: query.trim(),
        visitorType,
        ...(sessionId && { sessionId }),
        ...(locale && { locale }),
        ...(source && { source }),
        ...(deviceCategory && { deviceCategory }),
        ...(deviceType && { deviceType }),
      });
      return new NextResponse(null, { status: 204 });
    }

    if (type === 'search_click') {
      const resultType = body.resultType;
      if (
        typeof resultType !== 'string' ||
        !SEARCH_RESULT_TYPES.includes(resultType) ||
        !isValidString(body.resultSlug, 256)
      ) {
        return NextResponse.json({ error: 'Invalid resultType or resultSlug' }, { status: 400 });
      }
      const resultSlug = body.resultSlug.trim();
      const query = body.query != null && isValidString(body.query, 512) ? body.query.trim() : undefined;
      const resultId = body.resultId != null && isValidString(body.resultId, 128) ? body.resultId : undefined;
      const href = body.href != null && isValidString(body.href, 1024) ? body.href : undefined;
      const sessionId = body.sessionId != null && isValidString(body.sessionId, 128) ? body.sessionId : undefined;
      const locale = body.locale != null && isValidString(body.locale, 16) ? body.locale : undefined;
      const source =
        body.source != null && SEARCH_SOURCES.includes(body.source as SearchEventSource)
          ? (body.source as SearchEventSource)
          : undefined;
      const deviceCategory =
        body.deviceCategory != null && DEVICE_CATEGORIES.includes(body.deviceCategory) ? body.deviceCategory : undefined;
      const deviceType = body.deviceType != null && isValidString(body.deviceType, 64) ? body.deviceType : undefined;

      await connectDB();
      await AnalyticsEvent.create({
        type: 'search_click',
        timestamp: new Date(),
        resultType,
        resultSlug,
        visitorType,
        ...(query !== undefined && { query }),
        ...(resultId && { resultId }),
        ...(href && { href }),
        ...(sessionId && { sessionId }),
        ...(locale && { locale }),
        ...(source && { source }),
        ...(deviceCategory && { deviceCategory }),
        ...(deviceType && { deviceType }),
      });
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('[analytics/track]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
