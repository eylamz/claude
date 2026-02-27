import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Review from '@/lib/db/models/Review';
import { validateCsrf } from '@/lib/security/csrf';
import { RateLimiter } from '@/lib/redis';

// PATCH: increment helpful count

const helpfulRateLimiter = new RateLimiter(60000, 20);
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

    const updated = await Review.findByIdAndUpdate(
      id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, helpfulCount: updated.helpfulCount });
  } catch (err) {
    console.error('PATCH helpful error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



