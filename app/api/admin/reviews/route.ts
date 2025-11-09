import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Review from '@/lib/db/models/Review';
import Skatepark from '@/lib/models/Skatepark';

// List reviews with filtering (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || 'pending'; // Filter by status, default to pending
    const search = searchParams.get('search') || '';

    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('entityId', 'name slug')
        .lean(),
      Review.countDocuments(query),
    ]);

    return NextResponse.json({
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin GET reviews error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update review: approve/reject or update content (admin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    const { id, action, comment, rating } = body as { 
      id: string; 
      action?: 'approve' | 'reject';
      comment?: string;
      rating?: number;
    };

    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Handle approve/reject action
    if (action === 'approve') {
      const wasApproved = review.status === 'approved';
      review.status = 'approved';
      await review.save();

      // Update skatepark aggregates only if it wasn't already approved
      if (!wasApproved) {
        const park = await Skatepark.findById(review.entityId);
        if (park) {
          const newTotal = (park.totalReviews || 0) + 1;
          const newAvg = ((park.rating || 0) * (park.totalReviews || 0) + review.rating) / newTotal;
          park.rating = newAvg;
          park.totalReviews = newTotal;
          await park.save();
        }
      }
    } else if (action === 'reject') {
      const wasApproved = review.status === 'approved';
      review.status = 'rejected';
      await review.save();

      // If it was approved before, remove from skatepark aggregates
      if (wasApproved) {
        const park = await Skatepark.findById(review.entityId);
        if (park && park.totalReviews > 0) {
          const newTotal = park.totalReviews - 1;
          if (newTotal > 0) {
            // Recalculate average
            const allApprovedReviews = await Review.find({ 
              entityId: review.entityId, 
              status: 'approved',
              _id: { $ne: review._id }
            });
            const totalRating = allApprovedReviews.reduce((sum, r) => sum + r.rating, 0);
            park.rating = totalRating / newTotal;
          } else {
            park.rating = 0;
          }
          park.totalReviews = newTotal;
          await park.save();
        }
      }
    }

    // Handle content updates (comment and/or rating)
    if (comment !== undefined || rating !== undefined) {
      if (comment !== undefined) {
        review.comment = comment.trim();
      }
      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }
        review.rating = rating;
      }
      await review.save();
    }

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error('Admin PATCH review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



