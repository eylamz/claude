import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import AnalyticsEvent from '@/lib/models/AnalyticsEvent';
import type { ConsentChoice, DeviceCategory, ReferrerCategory } from '@/lib/models/AnalyticsEvent';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

const CONSENT_CHOICES: ConsentChoice[] = ['accept_all', 'reject_non_essential', 'save_preferences'];
const DEVICE_CATEGORIES: DeviceCategory[] = ['mobile', 'tablet', 'desktop'];
const REFERRER_CATEGORIES: ReferrerCategory[] = ['direct', 'internal', 'google', 'social', 'other'];

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
        ...(sessionId && { sessionId }),
      });
      return new NextResponse(null, { status: 204 });
    }

    if (type === 'page_view') {
      const path = body.path;
      if (!isValidString(path, 1024)) {
        return NextResponse.json({ error: 'Invalid or missing path' }, { status: 400 });
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

      await connectDB();
      await AnalyticsEvent.create({
        type: 'page_view',
        timestamp: new Date(),
        path,
        ...(sessionId && { sessionId }),
        ...(locale && { locale }),
        ...(timeOnPageMs !== undefined && { timeOnPageMs }),
        ...(deviceType && { deviceType }),
        ...(deviceCategory && { deviceCategory }),
        ...(referrer !== undefined && { referrer }),
        ...(referrerCategory && { referrerCategory }),
        ...(userId && { userId }),
      });
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('[analytics/track]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
