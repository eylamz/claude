import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Review from '@/lib/db/models/Review';
import type { ReviewContentByLocale } from '@/lib/db/models/Review';
import Skatepark from '@/lib/models/Skatepark';
import Settings from '@/lib/models/Settings';
import { validateCsrf } from '@/lib/security/csrf';

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
    const entityType = searchParams.get('entityType') || ''; // Filter by entity type

    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (entityType) {
      query.entityType = entityType.toLowerCase();
    }
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { 'comment.en': { $regex: search, $options: 'i' } },
        { 'comment.he': { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { 'userName.en': { $regex: search, $options: 'i' } },
        { 'userName.he': { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch reviews and populate entityId with area field for skateparks
    let reviews;
    try {
      reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'entityId',
          select: 'name slug area',
        })
        .lean();
    } catch (populateError) {
      // If populate fails (e.g., area field doesn't exist for some models), try without area
      console.warn('Populate with area failed, trying without area:', populateError);
      reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'entityId',
          select: 'name slug',
        })
        .lean();
    }

    const total = await Review.countDocuments(query);

    // Return raw reviews (locale-keyed userName/comment) so admin can show and edit en/he separately
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
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    const { id, action, comment, rating, userName, userNameEn, userNameHe, commentEn, commentHe, helpfulCount: helpfulCountBody } = body as { 
      id: string; 
      action?: 'approve' | 'reject';
      comment?: string;
      rating?: number;
      userName?: string;
      userNameEn?: string;
      userNameHe?: string;
      commentEn?: string;
      commentHe?: string;
      helpfulCount?: number;
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
          
          // Increment skateparks version to invalidate client caches
          try {
            const settings = await Settings.findOrCreate();
            const currentVersion = Math.floor(Number(settings.skateparksVersion) || 1);
            settings.skateparksVersion = currentVersion + 1;
            await settings.save();
          } catch (versionError) {
            console.error('Failed to increment skateparks version:', versionError);
          }
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
          
          // Increment skateparks version to invalidate client caches
          try {
            const settings = await Settings.findOrCreate();
            const currentVersion = Math.floor(Number(settings.skateparksVersion) || 1);
            settings.skateparksVersion = currentVersion + 1;
            await settings.save();
          } catch (versionError) {
            console.error('Failed to increment skateparks version:', versionError);
          }
        }
      }
    }

    // Handle content updates: per-locale (userNameEn/He, commentEn/He) or legacy (comment, userName)
    const hasLocaleUpdates = userNameEn !== undefined || userNameHe !== undefined || commentEn !== undefined || commentHe !== undefined;
    if (helpfulCountBody !== undefined) {
      const num = Math.max(0, Math.floor(Number(helpfulCountBody)));
      review.helpfulCount = num;
      await review.save();
    }
    if (comment !== undefined || rating !== undefined || userName !== undefined || hasLocaleUpdates) {
      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }
        review.rating = rating;
      }
      // Per-locale updates
      if (userNameEn !== undefined || userNameHe !== undefined) {
        const current = review.userName as any;
        const prev = typeof current === 'string' ? { en: current } : { ...(current || {}) };
        review.userName = {
          en: userNameEn !== undefined ? userNameEn.trim() : prev.en,
          he: userNameHe !== undefined ? userNameHe.trim() : prev.he,
        } as ReviewContentByLocale;
      }
      if (commentEn !== undefined || commentHe !== undefined) {
        const current = review.comment as any;
        const prev = typeof current === 'string' ? { en: current } : { ...(current || {}) };
        review.comment = {
          en: commentEn !== undefined ? commentEn.trim() : prev.en,
          he: commentHe !== undefined ? commentHe.trim() : prev.he,
        } as ReviewContentByLocale;
      }
      // Legacy single-value updates (set both locales)
      if (comment !== undefined && !hasLocaleUpdates) {
        const trimmed = comment.trim();
        review.comment = { en: trimmed, he: trimmed } as ReviewContentByLocale;
      }
      if (userName !== undefined && !hasLocaleUpdates) {
        if (!userName.trim()) {
          return NextResponse.json({ error: 'User name cannot be empty' }, { status: 400 });
        }
        review.userName = { en: userName.trim(), he: userName.trim() } as ReviewContentByLocale;
      }
      await review.save();
    }

    const reviewPojo = review.toObject ? review.toObject() : (review as any);
    return NextResponse.json({ success: true, review: reviewPojo });
  } catch (err) {
    console.error('Admin PATCH review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}








