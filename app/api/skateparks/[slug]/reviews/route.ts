import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Review from '@/lib/db/models/Review';

// GET reviews for a skatepark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const ratingFilter = parseInt(searchParams.get('rating') || '0', 10); // 1-5 or 0 for all
    const sort = searchParams.get('sort') || 'newest'; // newest|oldest|highest|lowest

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

    const skip = (page - 1) * limit;

    const [reviews, total, aggregates] = await Promise.all([
      Review.find(query).sort(sortMap[sort] || sortMap.newest).skip(skip).limit(limit).lean(),
      Review.countDocuments(query),
      Review.aggregate([
        { $match: { slug: slug.toLowerCase(), entityType: 'skatepark', status: 'approved' } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),
    ]);

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

    return NextResponse.json({
      reviews,
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { slug } = await params;
    const body = await request.json();
    const { rating, comment } = body as { rating: number; comment: string };

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }
    // Comment is optional, no minimum length requirement

    const park = await Skatepark.findOne({ slug: slug.toLowerCase(), status: 'active' });
    if (!park) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Optional: prevent duplicate pending/approved by same user
    const existing = await Review.findOne({ slug: slug.toLowerCase(), userId: session.user.id });
    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a review' }, { status: 400 });
    }

    const reviewData: any = {
      entityType: 'skatepark',
      entityId: park._id,
      slug: slug.toLowerCase(),
      userId: session.user.id,
      userName: session.user.name || session.user.email || 'User',
      rating,
      status: 'pending',
    };

    // Only include comment if it's not empty
    if (comment && comment.trim()) {
      reviewData.comment = comment.trim();
    }

    await Review.create(reviewData);

    return NextResponse.json({ success: true, message: 'Review submitted for moderation' }, { status: 201 });
  } catch (err) {
    console.error('POST review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



