import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Trainer from '@/lib/models/Trainer';

// GET reviews for a trainer
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

    const trainer = await Trainer.findOne({ slug: slug.toLowerCase(), status: 'active' }).lean();
    if (!trainer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get approved reviews from trainer
    let reviews = ((trainer.reviews as any[]) || [])
      .filter((r: any) => r.isApproved)
      .map((r: any) => ({
        _id: r._id?.toString() || Math.random().toString(),
        userId: r.userId?.toString() || r.userId,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt || new Date().toISOString(),
      }));

    // Filter by rating if specified
    if (ratingFilter >= 1 && ratingFilter <= 5) {
      reviews = reviews.filter((r) => r.rating === ratingFilter);
    }

    // Sort reviews
    const sortMap: Record<string, (a: any, b: any) => number> = {
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      highest: (a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      },
      lowest: (a, b) => {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      },
    };

    reviews.sort(sortMap[sort] || sortMap.newest);

    // Paginate
    const total = reviews.length;
    const skip = (page - 1) * limit;
    const paginatedReviews = reviews.slice(skip, skip + limit);

    // Build breakdown 1..5
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const allApproved = ((trainer.reviews as any[]) || []).filter((r: any) => r.isApproved);
    allApproved.forEach((r: any) => {
      const rating = r.rating;
      if (rating >= 1 && rating <= 5) {
        breakdown[rating] = (breakdown[rating] || 0) + 1;
      }
    });

    const totalApproved = allApproved.length;
    const average = totalApproved > 0
      ? (
          (5 * breakdown[5] + 4 * breakdown[4] + 3 * breakdown[3] + 2 * breakdown[2] + 1 * breakdown[1]) /
          totalApproved
        )
      : 0;

    return NextResponse.json({
      reviews: paginatedReviews,
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

    const trainer = await Trainer.findOne({ slug: slug.toLowerCase(), status: 'active' });
    if (!trainer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check if user already has a review
    const existingReview = (trainer.reviews as any[]).find(
      (r: any) => r.userId?.toString() === session.user.id
    );
    if (existingReview) {
      return NextResponse.json({ error: 'You have already submitted a review' }, { status: 400 });
    }

    // Add review (will be pending)
    trainer.reviews = trainer.reviews || [];
    trainer.reviews.push({
      userId: new mongoose.Types.ObjectId(session.user.id),
      userName: session.user.name || session.user.email || 'User',
      rating,
      comment: comment?.trim() || '',
      isApproved: false,
      createdAt: new Date(),
    });

    trainer.totalReviews = (trainer.totalReviews || 0) + 1;
    await trainer.save();

    return NextResponse.json({ success: true, message: 'Review submitted for moderation' }, { status: 201 });
  } catch (err) {
    console.error('POST review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}








