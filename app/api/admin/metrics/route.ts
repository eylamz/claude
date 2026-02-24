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
        countryBreakdown: [],
        topPages: [],
        searchQueries: [],
        searchClicks: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? String(DEFAULT_DAYS), 10) || DEFAULT_DAYS));
    const userParam = searchParams.get('user');
    const excludeAdmins = searchParams.get('excludeAdmins') === 'true';

    const filterByCurrentUser = userParam === 'me';
    const filterByAdminsOnly = userParam === 'admins';

    let adminUserIds: string[] = [];
    if (excludeAdmins || filterByAdminsOnly) {
      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      adminUserIds = admins.map((u) => String(u._id));
    }

    const currentUserId = filterByCurrentUser && session.user?.id ? String(session.user.id) : null;

    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const matchPageView: Record<string, unknown> = { type: 'page_view', timestamp: { $gte: from } };
    if (currentUserId) {
      matchPageView.userId = currentUserId;
    } else if (filterByAdminsOnly && adminUserIds.length > 0) {
      matchPageView.userId = { $in: adminUserIds };
    } else if (filterByAdminsOnly) {
      matchPageView.userId = { $in: [] };
    } else if (excludeAdmins && adminUserIds.length > 0) {
      matchPageView.$or = [
        { userId: { $exists: false } },
        { userId: null },
        { userId: { $nin: adminUserIds } },
      ];
    }
    const matchConsent: Record<string, unknown> = { type: 'consent', timestamp: { $gte: from } };
    const matchSearchQuery: Record<string, unknown> = { type: 'search_query', timestamp: { $gte: from } };
    const matchSearchClick: Record<string, unknown> = { type: 'search_click', timestamp: { $gte: from } };
    // Only count sessions that have an id (so we can dedupe by session, not by page view)
    const matchPageViewWithSession = {
      ...matchPageView,
      sessionId: { $exists: true, $nin: [null, ''] },
    };

    const [
      pageViewsByPath,
      avgTimeByPath,
      sessionDurations,
      deviceByCategory,
      deviceByType,
      consentBreakdown,
      referrerBreakdown,
      countryBreakdown,
      searchQueries,
      searchClicks,
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
      // Device category: one count per session (first page view of session determines device)
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageViewWithSession },
        { $sort: { sessionId: 1, timestamp: 1 } },
        { $group: { _id: '$sessionId', deviceCategory: { $first: '$deviceCategory' } } },
        { $group: { _id: { $ifNull: ['$deviceCategory', 'unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { category: '$_id', count: 1, _id: 0 } },
      ]),
      // Device type (OS): one count per session
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageViewWithSession },
        { $sort: { sessionId: 1, timestamp: 1 } },
        { $group: { _id: '$sessionId', deviceType: { $first: '$deviceType' } } },
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
      // Traffic source: one count per session (first page view determines referrer)
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageViewWithSession },
        { $sort: { sessionId: 1, timestamp: 1 } },
        { $group: { _id: '$sessionId', referrerCategory: { $first: '$referrerCategory' } } },
        { $group: { _id: { $ifNull: ['$referrerCategory', 'direct'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { referrerCategory: '$_id', count: 1, _id: 0 } },
      ]),
      // Country (from IP): one count per session (first page view determines country)
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageViewWithSession },
        { $sort: { sessionId: 1, timestamp: 1 } },
        { $group: { _id: '$sessionId', country: { $first: '$country' } } },
        { $group: { _id: { $ifNull: ['$country', 'unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { country: '$_id', count: 1, _id: 0 } },
      ]),
      // Search queries: group by query (trimmed) + deviceCategory, count, top 50
      AnalyticsEvent.aggregate<{ _id: { query: string; deviceCategory: string }; count: number }>([
        { $match: matchSearchQuery },
        { $addFields: { queryTrimmed: { $trim: { input: { $ifNull: ['$query', ''] } } } } },
        { $match: { queryTrimmed: { $ne: '' } } },
        { $group: { _id: { query: '$queryTrimmed', deviceCategory: { $ifNull: ['$deviceCategory', 'unknown'] } }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { query: '$_id.query', deviceCategory: '$_id.deviceCategory', count: 1, _id: 0 } },
      ]),
      // Search clicks: group by resultType + resultSlug + deviceCategory, count, top 50
      AnalyticsEvent.aggregate<{ _id: { resultType: string; resultSlug: string; deviceCategory: string }; count: number }>([
        { $match: matchSearchClick },
        { $group: { _id: { resultType: '$resultType', resultSlug: '$resultSlug', deviceCategory: { $ifNull: ['$deviceCategory', 'unknown'] } }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        {
          $project: {
            resultType: '$_id.resultType',
            resultSlug: '$_id.resultSlug',
            deviceCategory: '$_id.deviceCategory',
            count: 1,
            _id: 0,
          },
        },
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
      countryBreakdown,
      topPages,
      searchQueries,
      searchClicks,
    });
  } catch (error) {
    console.error('[admin/metrics]', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
