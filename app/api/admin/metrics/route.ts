import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import AnalyticsEvent from '@/lib/models/AnalyticsEvent';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
const DEFAULT_DAYS = 30;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!ENABLE_ANALYTICS) {
      return NextResponse.json({
        enabled: false,
        message: 'Analytics is disabled. Set NEXT_PUBLIC_ENABLE_ANALYTICS=true in .env.local.',
        pageViewsByPath: [],
        avgTimeOnPageByPath: [],
        sessionsSummary: { totalSessions: 0, avgSessionDurationMs: 0 },
        deviceBreakdown: { byCategory: [], byType: [] },
        consentBreakdown: [],
        referrerBreakdown: [],
        topPages: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? String(DEFAULT_DAYS), 10) || DEFAULT_DAYS));
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const matchPageView = { type: 'page_view', timestamp: { $gte: from } };
    const matchConsent = { type: 'consent', timestamp: { $gte: from } };

    const [
      pageViewsByPath,
      avgTimeByPath,
      sessionDurations,
      deviceByCategory,
      deviceByType,
      consentBreakdown,
      referrerBreakdown,
    ] = await Promise.all([
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageView },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { path: '$_id', count: 1, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ _id: string; avgMs: number }>([
        { $match: { ...matchPageView, timeOnPageMs: { $exists: true, $gt: 0 } } },
        { $group: { _id: '$path', avgMs: { $avg: '$timeOnPageMs' } } },
        { $sort: { avgMs: -1 } },
        { $project: { path: '$_id', avgTimeOnPageMs: { $round: ['$avgMs', 0] }, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ avgSessionDurationMs: number; totalSessions: number }>([
        { $match: matchPageView },
        { $group: { _id: '$sessionId', totalMs: { $sum: { $ifNull: ['$timeOnPageMs', 0] } } } },
        { $group: { _id: null, avgSessionMs: { $avg: '$totalMs' }, count: { $sum: 1 } } },
        { $project: { _id: 0, avgSessionDurationMs: { $round: ['$avgSessionMs', 0] }, totalSessions: '$count' } },
      ]),
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageView },
        { $group: { _id: { $ifNull: ['$deviceCategory', 'unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { category: '$_id', count: 1, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageView },
        { $group: { _id: { $ifNull: ['$deviceType', 'unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { deviceType: '$_id', count: 1, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchConsent },
        { $group: { _id: '$choice', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { choice: '$_id', count: 1, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageView },
        { $group: { _id: { $ifNull: ['$referrerCategory', 'direct'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { referrerCategory: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const sessionsSummary = sessionDurations[0]
      ? {
          totalSessions: sessionDurations[0].totalSessions ?? 0,
          avgSessionDurationMs: sessionDurations[0].avgSessionDurationMs ?? 0,
        }
      : { totalSessions: 0, avgSessionDurationMs: 0 };

    const topPages = pageViewsByPath.slice(0, 20);

    return NextResponse.json({
      enabled: true,
      from: from.toISOString(),
      days,
      pageViewsByPath,
      avgTimeOnPageByPath: avgTimeByPath,
      sessionsSummary,
      deviceBreakdown: { byCategory: deviceByCategory, byType: deviceByType },
      consentBreakdown,
      referrerBreakdown,
      topPages,
    });
  } catch (error) {
    console.error('[admin/metrics]', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
