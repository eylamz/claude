import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import AnalyticsEvent from '@/lib/models/AnalyticsEvent';
import Settings from '@/lib/models/Settings';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
const DEFAULT_DAYS = 30;
/** Cap time-on-page in aggregations (30 min) so old/uncapped data doesn't inflate metrics. */
const MAX_TIME_ON_PAGE_MS = 30 * 60 * 1000;

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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') ?? String(DEFAULT_DAYS);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let from: Date;
    let toDate: Date;
    let days: number;
    let groupBy: 'day' | 'hour' = 'day';

    if (daysParam === 'custom' && fromParam && toParam) {
      from = new Date(fromParam);
      toDate = new Date(toParam);
      if (Number.isNaN(from.getTime()) || Number.isNaN(toDate.getTime()) || from > toDate) {
        return NextResponse.json({ error: 'Invalid custom date range' }, { status: 400 });
      }
      from.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      const rangeMs = toDate.getTime() - from.getTime();
      days = Math.ceil(rangeMs / 86400000);
      if (days > 365) {
        return NextResponse.json({ error: 'Custom range must be at most 365 days' }, { status: 400 });
      }
      if (days < 4) groupBy = 'hour';
    } else {
      days = Math.min(365, Math.max(1, parseInt(daysParam, 10) || DEFAULT_DAYS));
      from = new Date();
      from.setDate(from.getDate() - days);
      from.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    }

    const userParam = searchParams.get('user');

    const filterByCurrentUser = userParam === 'me';

    /** Filter by visitor type: all | user | crawler | bot | other. Default all. */
    const visitorTypeParam = searchParams.get('visitorType') ?? 'all';
    const validVisitorTypes = ['all', 'user', 'crawler', 'bot', 'other'] as const;
    const visitorTypeFilter: 'all' | 'user' | 'crawler' | 'bot' | 'other' = validVisitorTypes.includes(visitorTypeParam as (typeof validVisitorTypes)[number])
      ? (visitorTypeParam as (typeof validVisitorTypes)[number])
      : 'all';

    /** MongoDB condition for visitorType: when filtering to 'user', include null/missing (legacy events). */
    const visitorTypeMatch = (): Record<string, unknown> => {
      if (visitorTypeFilter === 'all') return {};
      if (visitorTypeFilter === 'user') {
        return {
          $or: [
            { visitorType: 'user' },
            { visitorType: { $exists: false } },
            { visitorType: null },
          ],
        };
      }
      return { visitorType: visitorTypeFilter };
    };

    // Always exclude admin users from metrics (do not track admin activity)
    let adminUserIds: string[] = [];
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    adminUserIds = admins.map((u) => String(u._id));

    const currentUserId = filterByCurrentUser && session.user?.id ? String(session.user.id) : null;

    const matchPageView: Record<string, unknown> = {
      type: 'page_view',
      timestamp: { $gte: from, $lte: toDate },
      path: { $not: { $regex: '/admin' } },
      ...visitorTypeMatch(),
    };
    if (currentUserId) {
      matchPageView.userId = currentUserId;
    } else if (adminUserIds.length > 0) {
      matchPageView.$or = [
        { userId: { $exists: false } },
        { userId: null },
        { userId: { $nin: adminUserIds } },
      ];
    }
    const matchConsent: Record<string, unknown> = {
      type: 'consent',
      timestamp: { $gte: from, $lte: toDate },
      ...visitorTypeMatch(),
    };
    const matchSearchQuery: Record<string, unknown> = {
      type: 'search_query',
      timestamp: { $gte: from, $lte: toDate },
      ...visitorTypeMatch(),
    };
    const matchSearchClick: Record<string, unknown> = {
      type: 'search_click',
      timestamp: { $gte: from, $lte: toDate },
      ...visitorTypeMatch(),
    };
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
      sessionsByDayRaw,
      pageViewsByDayRaw,
      navigationPatternsRaw,
      visitorTypeBreakdownRaw,
      skateparkVisitsBySessionRaw,
    ] = await Promise.all([
      AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: matchPageView },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { path: '$_id', count: 1, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ _id: string; avgMs: number }>([
        { $match: { ...matchPageView, timeOnPageMs: { $exists: true, $gt: 0 } } },
        { $addFields: { timeOnPageMsCapped: { $min: [{ $ifNull: ['$timeOnPageMs', 0] }, MAX_TIME_ON_PAGE_MS] } } },
        { $group: { _id: '$path', avgMs: { $avg: '$timeOnPageMsCapped' } } },
        { $sort: { avgMs: -1 } },
        { $project: { path: '$_id', avgTimeOnPageMs: { $round: ['$avgMs', 0] }, _id: 0 } },
      ]),
      AnalyticsEvent.aggregate<{ avgSessionDurationMs: number; totalSessions: number }>([
        { $match: matchPageView },
        { $addFields: { timeOnPageMsCapped: { $min: [{ $ifNull: ['$timeOnPageMs', 0] }, MAX_TIME_ON_PAGE_MS] } } },
        { $group: { _id: '$sessionId', totalMs: { $sum: '$timeOnPageMsCapped' } } },
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
      AnalyticsEvent.aggregate<{ country: string; count: number }>([
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
      // Sessions per day/hour (unique sessionIds) for line chart
      AnalyticsEvent.aggregate<{ date: string; count: number }>([
        { $match: matchPageViewWithSession },
        {
          $addFields: {
            day: {
              $dateToString: {
                format: groupBy === 'hour' ? '%Y-%m-%dT%H' : '%Y-%m-%d',
                date: '$timestamp',
              },
            },
          },
        },
        {
          $group: {
            _id: '$day',
            sessionIds: { $addToSet: '$sessionId' },
          },
        },
        {
          $project: {
            date: '$_id',
            count: { $size: '$sessionIds' },
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]),
      // Page views per day/hour for line chart
      AnalyticsEvent.aggregate<{ date: string; count: number }>([
        { $match: matchPageView },
        {
          $addFields: {
            day: {
              $dateToString: {
                format: groupBy === 'hour' ? '%Y-%m-%dT%H' : '%Y-%m-%d',
                date: '$timestamp',
              },
            },
          },
        },
        { $group: { _id: '$day', count: { $sum: 1 } } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
        { $sort: { date: 1 } },
      ]),
      // Navigation patterns: internal referrer → path, from top to low
      AnalyticsEvent.aggregate<{ fromPath: string; toPath: string; count: number }>([
        {
          $match: {
            ...matchPageView,
            referrerCategory: 'internal',
            referrer: { $exists: true, $regex: /^https?:\/\// },
          },
        },
        {
          $addFields: {
            afterProtocol: {
              $substr: [
                '$referrer',
                { $add: [{ $indexOfCP: ['$referrer', '//'] }, 2] },
                2000,
              ],
            },
          },
        },
        {
          $addFields: {
            firstSlashIdx: { $indexOfCP: ['$afterProtocol', '/'] },
          },
        },
        {
          $addFields: {
            fromPath: {
              $cond: [
                { $gte: ['$firstSlashIdx', 0] },
                { $substr: ['$afterProtocol', '$firstSlashIdx', 2000] },
                '/',
              ],
            },
          },
        },
        { $match: { $expr: { $ne: ['$fromPath', '$path'] } } },
        {
          $group: {
            _id: { fromPath: '$fromPath', toPath: '$path' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 100 },
        {
          $project: {
            fromPath: '$_id.fromPath',
            toPath: '$_id.toPath',
            count: 1,
            _id: 0,
          },
        },
      ]),
      // Visitor type breakdown (page views only, same date range; treat null/missing as 'user')
      AnalyticsEvent.aggregate<{ visitorType: string; count: number }>([
        {
          $match: {
            type: 'page_view',
            timestamp: { $gte: from, $lte: toDate },
            path: { $not: { $regex: '/admin' } },
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$visitorType', 'user'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $project: { visitorType: '$_id', count: 1, _id: 0 } },
      ]),
      // Skatepark visits by session (unique sessionId + slug per skatepark detail page)
      AnalyticsEvent.aggregate<{ slug: string; count: number }>([
        {
          $match: {
            ...matchPageViewWithSession,
            path: { $regex: /\/skateparks\/[^/]+$/ },
          },
        },
        {
          $addFields: {
            slug: { $arrayElemAt: [{ $split: ['$path', '/'] }, -1] },
          },
        },
        { $match: { slug: { $exists: true, $ne: '' } } },
        { $group: { _id: { sessionId: '$sessionId', slug: '$slug' } } },
        { $group: { _id: '$_id.slug', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { slug: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const sessionsSummary = sessionDurations[0]
      ? {
          totalSessions: sessionDurations[0].totalSessions ?? 0,
          avgSessionDurationMs: sessionDurations[0].avgSessionDurationMs ?? 0,
        }
      : { totalSessions: 0, avgSessionDurationMs: 0 };

    const topPages = pageViewsByPath.slice(0, 20);

    // Fill missing days/hours with 0 so the chart is continuous
    const sessionsByDayMap = new Map<string, number>();
    for (const row of sessionsByDayRaw) {
      sessionsByDayMap.set(row.date, row.count);
    }
    const sessionsByDay: Array<{ date: string; count: number }> = [];
    if (groupBy === 'hour') {
      const iter = new Date(from);
      while (iter <= toDate) {
        const dateStr = iter.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        sessionsByDay.push({
          date: dateStr,
          count: sessionsByDayMap.get(dateStr) ?? 0,
        });
        iter.setHours(iter.getHours() + 1);
      }
    } else {
      const iter = new Date(from);
      while (iter <= toDate) {
        const dateStr = iter.toISOString().slice(0, 10);
        sessionsByDay.push({
          date: dateStr,
          count: sessionsByDayMap.get(dateStr) ?? 0,
        });
        iter.setDate(iter.getDate() + 1);
      }
    }

    const pageViewsByDayMap = new Map<string, number>();
    for (const row of pageViewsByDayRaw) {
      pageViewsByDayMap.set(row.date, row.count);
    }
    const pageViewsByDay: Array<{ date: string; count: number }> = [];
    if (groupBy === 'hour') {
      const iterPv = new Date(from);
      while (iterPv <= toDate) {
        const dateStr = iterPv.toISOString().slice(0, 13);
        pageViewsByDay.push({
          date: dateStr,
          count: pageViewsByDayMap.get(dateStr) ?? 0,
        });
        iterPv.setHours(iterPv.getHours() + 1);
      }
    } else {
      const iterPv = new Date(from);
      while (iterPv <= toDate) {
        const dateStr = iterPv.toISOString().slice(0, 10);
        pageViewsByDay.push({
          date: dateStr,
          count: pageViewsByDayMap.get(dateStr) ?? 0,
        });
        iterPv.setDate(iterPv.getDate() + 1);
      }
    }

    const settings = await Settings.findOrCreate();
    const popularSearchHidden = settings.popularSearchHidden || [];

    // Exclude local dev (LOCAL) from country breakdown so it is not shown
    const countryBreakdownFiltered = countryBreakdown.filter((c) => c.country !== 'LOCAL');

    const navigationPatterns = navigationPatternsRaw.map((r) => ({
      fromPath: r.fromPath ?? '/',
      toPath: r.toPath ?? '',
      count: r.count ?? 0,
    }));

    const visitorTypeBreakdown = visitorTypeBreakdownRaw.map((r) => ({
      visitorType: r.visitorType ?? 'user',
      count: r.count ?? 0,
    }));

    const skateparkVisitsBySession = skateparkVisitsBySessionRaw ?? [];

    return NextResponse.json({
      enabled: ENABLE_ANALYTICS,
      ...(ENABLE_ANALYTICS ? {} : { message: 'Analytics is disabled. Set NEXT_PUBLIC_ENABLE_ANALYTICS=true in .env.local.' }),
      from: from.toISOString(),
      to: toDate.toISOString(),
      days,
      groupBy,
      pageViewsByPath,
      avgTimeOnPageByPath: avgTimeByPath,
      sessionsSummary,
      deviceBreakdown: { byCategory: deviceByCategory, byType: deviceByType },
      consentBreakdown,
      referrerBreakdown,
      countryBreakdown: countryBreakdownFiltered,
      topPages,
      searchQueries,
      searchClicks,
      popularSearchHidden,
      sessionsByDay,
      pageViewsByDay,
      navigationPatterns,
      visitorTypeBreakdown,
      visitorTypeFilter: visitorTypeFilter,
      skateparkVisitsBySession,
    });
  } catch (error) {
    console.error('[admin/metrics]', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
