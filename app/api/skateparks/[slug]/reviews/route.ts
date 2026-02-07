import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Review from '@/lib/db/models/Review';
import Settings from '@/lib/models/Settings';
import type { ReviewContentByLocale } from '@/lib/db/models/Review';

const LOCALES = ['en', 'he'] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(s: string): s is Locale {
  return LOCALES.includes(s as Locale);
}

/** Locale-specific API error messages for review POST (used when returning JSON error to client). */
const REVIEW_ERROR_MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    alreadySubmitted: 'You have already submitted a review for this park',
  },
  he: {
    alreadySubmitted: 'כבר הגשת ביקורת על פארק זה',
  },
};

function getReviewError(key: string, locale: Locale): string {
  return REVIEW_ERROR_MESSAGES[locale]?.[key] ?? REVIEW_ERROR_MESSAGES.en[key] ?? key;
}

/** Resolve locale-keyed content to a single string for a given locale. Supports legacy plain strings. */
function resolveContent(
  value: string | ReviewContentByLocale | undefined | null,
  locale: Locale
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.he ?? '';
}

/** True if the review has any content (userName or comment) for the given locale. Legacy string = en only. */
function hasContentForLocale(r: any, locale: Locale): boolean {
  const hasValue = (v: string | ReviewContentByLocale | undefined | null): boolean => {
    if (v == null) return false;
    if (typeof v === 'string') return locale === 'en' && v.trim().length > 0;
    return ((v[locale] ?? '').trim()).length > 0;
  };
  return hasValue(r.userName) || hasValue(r.comment);
}

// GET reviews for a skatepark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const ratingFilter = parseInt(searchParams.get('rating') || '0', 10); // 1-5 or 0 for all
    const sort = searchParams.get('sort') || 'newest'; // newest|oldest|highest|lowest
    const localeParam = searchParams.get('locale') || 'en';
    const locale: Locale = isLocale(localeParam) ? localeParam : 'en';
    const filterByLocale = searchParams.get('filterByLocale') === 'true' || searchParams.get('filterByLocale') === '1';

    const park = await Skatepark.findOne({ slug: slug.toLowerCase(), status: 'active' }).lean();
    if (!park) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const query: any = { slug: slug.toLowerCase(), entityType: 'skatepark', status: 'approved' };
    if (ratingFilter >= 1 && ratingFilter <= 5) {
      query.rating = ratingFilter;
    }

    const sortMap: any = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      highest: { rating: -1, createdAt: -1 },
      lowest: { rating: 1, createdAt: -1 },
    };

    const sortOpt = sortMap[sort] || sortMap.newest;
    const skip = (page - 1) * limit;

    let reviewsRaw: any[];
    let total: number;
    let aggregates: any[];

    if (filterByLocale) {
      // Fetch all approved reviews for this slug, filter by locale, then paginate in memory
      const allRaw = await Review.find(query).sort(sortOpt).lean();
      const filtered = (allRaw as any[]).filter((r) => hasContentForLocale(r, locale));
      total = filtered.length;
      reviewsRaw = filtered.slice(skip, skip + limit);
      // Aggregate breakdown from filtered set
      const breakdownByRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      filtered.forEach((r: any) => {
        const rating = Number(r.rating);
        if (rating >= 1 && rating <= 5) breakdownByRating[rating] = (breakdownByRating[rating] || 0) + 1;
      });
      aggregates = Object.entries(breakdownByRating).map(([k, count]) => ({ _id: Number(k), count }));
    } else {
      [reviewsRaw, total, aggregates] = await Promise.all([
        Review.find(query).sort(sortOpt).skip(skip).limit(limit).lean(),
        Review.countDocuments(query),
        Review.aggregate([
          { $match: { slug: slug.toLowerCase(), entityType: 'skatepark', status: 'approved' } },
          { $group: { _id: '$rating', count: { $sum: 1 } } },
        ]),
      ]);
    }

    // Resolve locale-keyed userName and comment for each review (supports legacy string values)
    const reviews = (reviewsRaw as any[]).map((r) => ({
      ...r,
      userName: resolveContent(r.userName, locale),
      comment: resolveContent(r.comment, locale),
    }));

    // Build breakdown 1..5
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as any;
    aggregates.forEach((a: any) => { breakdown[a._id as number] = a.count; });
    const totalApproved = Object.values(breakdown).reduce((a, b) => a + (b as number), 0);
    const average = totalApproved > 0
      ? (
          (5 * breakdown[5] + 4 * breakdown[4] + 3 * breakdown[3] + 2 * breakdown[2] + 1 * breakdown[1]) /
          totalApproved
        )
      : 0;

    // When multiple reviews are disabled, tell the client if the current user has already reviewed (for UX)
    let userHasReviewed: boolean | undefined;
    if (session?.user?.id && process.env.NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS !== 'true') {
      const existing = await Review.exists({
        slug: slug.toLowerCase(),
        userId: session.user.id,
        status: { $in: ['pending', 'approved'] },
      });
      userHasReviewed = !!existing;
    }

    return NextResponse.json({
      reviews,
      ...(userHasReviewed !== undefined && { userHasReviewed }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        average,
        breakdown,
        total: totalApproved,
      },
    });
  } catch (err) {
    console.error('GET reviews error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST a new review (creates pending review)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check environment variables for review permissions
    const userReviewsEnv = process.env.NEXT_PUBLIC_ENABLE_USERREVIEWS;
    const everyoneReviewsEnv = process.env.NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS;
    const userReviewsEnabled = userReviewsEnv === 'true' || userReviewsEnv === true;
    const everyoneReviewsEnabled = everyoneReviewsEnv === 'true' || everyoneReviewsEnv === true;
    
    // Priority: If both are true, treat as userReviews only
    const allowUserReviews = userReviewsEnabled;
    const allowAnonymousReviews = !userReviewsEnabled && everyoneReviewsEnabled;
    
    // If both are false, reject
    if (!allowUserReviews && !allowAnonymousReviews) {
      return NextResponse.json({ error: 'Reviews are currently disabled' }, { status: 403 });
    }
    
    // If user reviews are enabled, require authentication
    if (allowUserReviews && !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // If only anonymous reviews are enabled, allow without authentication
    const isAnonymous = !session?.user?.id;

    await connectDB();
    const { slug } = await params;
    const body = await request.json();
    const { rating, comment, userName, locale: bodyLocale } = body as {
      rating: number;
      comment: string;
      userName?: string;
      locale?: string;
    };

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }
    
    const locale: Locale = isLocale(bodyLocale) ? bodyLocale : 'en';
    // Authenticated: use session name; anonymous: require name from body
    let displayName: string;
    if (isAnonymous) {
      if (!userName || !userName.trim()) {
        return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
      }
      displayName = userName.trim();
    } else {
      displayName = (session?.user?.name ?? session?.user?.email ?? 'User').trim() || 'User';
    }

    const park = await Skatepark.findOne({ slug: slug.toLowerCase(), status: 'active' });
    if (!park) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Prevent duplicate reviews only when multiple reviews per user are disabled
    const allowMultipleReviews = process.env.NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS === 'true';
    if (!allowMultipleReviews) {
      if (isAnonymous) {
        // Match anonymous reviews by slug and by name in any locale (or legacy string userName)
        const existing = await Review.findOne({
          slug: slug.toLowerCase(),
          userId: { $exists: false },
          status: { $in: ['pending', 'approved'] },
          $or: [
            { 'userName.en': displayName },
            { 'userName.he': displayName },
            { userName: displayName } as any, // legacy string
          ],
        });
        if (existing) {
          return NextResponse.json(
            { error: getReviewError('alreadySubmitted', locale) },
            { status: 400 }
          );
        }
      } else {
        const existing = await Review.findOne({ slug: slug.toLowerCase(), userId: session.user.id });
        if (existing) {
          return NextResponse.json(
            { error: getReviewError('alreadySubmitted', locale) },
            { status: 400 }
          );
        }
      }
    }

    const reviewData: any = {
      entityType: 'skatepark',
      entityId: park._id,
      slug: slug.toLowerCase(),
      rating,
      status: 'pending',
    };

    if (isAnonymous) {
      // userId not set for anonymous
      reviewData.userName = { [locale]: displayName };
    } else {
      reviewData.userId = session.user.id;
      reviewData.userName = { [locale]: displayName };
    }

    if (comment && comment.trim()) {
      reviewData.comment = { [locale]: comment.trim() };
    }

    await Review.create(reviewData);

    // Increment skateparks version to invalidate client caches
    try {
      const settings = await Settings.findOrCreate();
      const currentVersion = settings.skateparksVersion || 1;
      settings.skateparksVersion = currentVersion + 0.00001;
      await settings.save();
    } catch (versionError) {
      // Log error but don't fail the review submission
      console.error('Failed to increment skateparks version:', versionError);
    }

    return NextResponse.json({ success: true, message: 'Review submitted for moderation' }, { status: 201 });
  } catch (err) {
    console.error('POST review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



