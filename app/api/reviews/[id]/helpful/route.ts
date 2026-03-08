import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import Review from '@/lib/db/models/Review';
import { validateCsrf } from '@/lib/security/csrf';
import { RateLimiter } from '@/lib/redis';

// PATCH: add helpful vote. DELETE: remove helpful vote. Limit: 10 actions per minute per user.
const helpfulRateLimiter = new RateLimiter(60000, 10);
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await helpfulRateLimiter.isAllowed(
      `review-helpful:${session.user.id}`
    );
    if (!rate.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rate.resetTime - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'You are voting helpful too frequently. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    await connectDB();
    const { id } = await params;
    const userId = session.user.id;

    const review = await Review.findById(id).lean();
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const helpfulByUserIds = (review as any).helpfulByUserIds || [];
    const alreadyVoted = helpfulByUserIds.some(
      (oid: unknown) => String(oid) === userId
    );
    if (alreadyVoted) {
      return NextResponse.json({
        success: true,
        helpfulCount: (review as any).helpfulCount ?? 0,
        alreadyMarked: true,
      });
    }

    const updated = await Review.findByIdAndUpdate(
      id,
      {
        $addToSet: { helpfulByUserIds: userId },
        $inc: { helpfulCount: 1 },
      },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      helpfulCount: (updated as any).helpfulCount,
    });
  } catch (err) {
    console.error('PATCH helpful error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: remove helpful vote (user must have voted before)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await helpfulRateLimiter.isAllowed(
      `review-helpful:${session.user.id}`
    );
    if (!rate.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rate.resetTime - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Too many helpful actions. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    await connectDB();
    const { id } = await params;
    const userId = session.user.id;

    const review = await Review.findById(id).lean();
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const helpfulByUserIds = (review as any).helpfulByUserIds || [];
    const hasVoted = helpfulByUserIds.some(
      (oid: unknown) => String(oid) === userId
    );
    if (!hasVoted) {
      return NextResponse.json({
        success: true,
        helpfulCount: (review as any).helpfulCount ?? 0,
        alreadyRemoved: true,
      });
    }

    const currentCount = Math.max(0, (review as any).helpfulCount ?? 0);
    const updated = await Review.findByIdAndUpdate(
      id,
      {
        $pull: { helpfulByUserIds: new mongoose.Types.ObjectId(userId) },
        $set: { helpfulCount: Math.max(0, currentCount - 1) },
      },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      helpfulCount: (updated as any).helpfulCount,
    });
  } catch (err) {
    console.error('DELETE helpful error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



