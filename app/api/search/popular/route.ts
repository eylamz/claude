/**
 * Public API: top 5 most clicked search results from analytics.
 * Used by the search page "Popular" section. No auth required.
 * Returns [] when NEXT_PUBLIC_ENABLE_ANALYTICS is not true.
 * Accepts ?locale=en|he to return localized display names.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import AnalyticsEvent from '@/lib/models/AnalyticsEvent';
import Skatepark from '@/lib/models/Skatepark';
import Product from '@/lib/models/Product';
import Event from '@/lib/models/Event';
import Guide from '@/lib/models/Guide';
import Trainer from '@/lib/models/Trainer';
import { getLocalizedText } from '@/lib/seo/utils';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
const DEFAULT_DAYS = 30;
const LIMIT = 5;

async function getDisplayName(
  resultType: string,
  resultSlug: string,
  locale: string
): Promise<string> {
  const slug = resultSlug.toLowerCase();
  try {
    if (resultType === 'skateparks') {
      const doc = await Skatepark.findOne({ slug }).select('name').lean();
      return doc?.name ? getLocalizedText(doc.name as { en: string; he: string }, locale) : '';
    }
    if (resultType === 'products') {
      const doc = await Product.findOne({ slug }).select('name').lean();
      return doc?.name ? getLocalizedText(doc.name as { en: string; he: string }, locale) : '';
    }
    if (resultType === 'events') {
      const doc = await Event.findOne({ slug }).select('title').lean();
      return doc?.title ? getLocalizedText(doc.title as { en: string; he: string }, locale) : '';
    }
    if (resultType === 'guides') {
      const doc = await Guide.findOne({ slug }).select('title').lean();
      return doc?.title ? getLocalizedText(doc.title as { en: string; he: string }, locale) : '';
    }
    if (resultType === 'trainers') {
      const doc = await Trainer.findOne({ slug }).select('name').lean();
      return doc?.name ? getLocalizedText(doc.name as { en: string; he: string }, locale) : '';
    }
  } catch {
    // ignore
  }
  return '';
}

export async function GET(request: NextRequest) {
  if (!ENABLE_ANALYTICS) {
    return NextResponse.json({ results: [] });
  }

  try {
    await connectDB();

    const locale = request.nextUrl.searchParams.get('locale') || 'en';

    const from = new Date();
    from.setDate(from.getDate() - DEFAULT_DAYS);
    from.setHours(0, 0, 0, 0);

    const rawResults = await AnalyticsEvent.aggregate<
      { resultType: string; resultSlug: string; count: number }
    >([
      {
        $match: {
          type: 'search_click',
          timestamp: { $gte: from },
        },
      },
      {
        $group: {
          _id: { resultType: '$resultType', resultSlug: '$resultSlug' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: LIMIT },
      {
        $project: {
          resultType: '$_id.resultType',
          resultSlug: '$_id.resultSlug',
          count: 1,
          _id: 0,
        },
      },
    ]);

    const results = await Promise.all(
      rawResults.map(async (r) => {
        const name = await getDisplayName(r.resultType, r.resultSlug, locale);
        return {
          resultType: r.resultType,
          resultSlug: r.resultSlug,
          count: r.count,
          name: name || r.resultSlug.replace(/-/g, ' '),
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[search/popular]', error);
    return NextResponse.json({ results: [] });
  }
}
