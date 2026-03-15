import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Review from '@/lib/db/models/Review';
import ReviewKudos from '@/lib/models/ReviewKudos';
import { featureFlags, serverFlags } from '@/lib/config/feature-flags';
import { awardXP } from '@/lib/services/xp.service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!featureFlags.kudos) {
      return NextResponse.json({ error: 'Kudos feature disabled' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const giverUserId = session.user.id;

    const review = await Review.findById(id).lean();
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const receiverUserId = (review as any).userId;
    if (!receiverUserId) {
      return NextResponse.json(
        { error: 'Cannot give kudos to this review' },
        { status: 400 }
      );
    }

    if (String(receiverUserId) === String(giverUserId)) {
      return NextResponse.json(
        { error: 'You cannot give kudos to your own review' },
        { status: 400 }
      );
    }

    const existing = await ReviewKudos.findOne({
      giverUserId,
      reviewId: id,
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: 'Already given kudos for this review' },
        { status: 400 }
      );
    }

    const skateparkId = (review as any).entityId;

    await ReviewKudos.create({
      giverUserId,
      receiverUserId,
      reviewId: id,
      skateparkId,
    });

    // Award XP to giver and receiver (non-blocking)
    try {
      await Promise.all([
        awardXP({
          userId: giverUserId,
          type: 'kudos_given',
          xpAmount: serverFlags.xpKudosGiven,
          sourceId: String(review._id),
          sourceType: 'review',
          meta: {
            reviewId: id,
            skateparkId: skateparkId ? String(skateparkId) : undefined,
          },
        }),
        awardXP({
          userId: String(receiverUserId),
          type: 'kudos_received',
          xpAmount: serverFlags.xpKudosReceived,
          sourceId: String(review._id),
          sourceType: 'review',
          meta: {
            reviewId: id,
            skateparkId: skateparkId ? String(skateparkId) : undefined,
          },
        }),
      ]);
    } catch (xpError) {
      console.error('Failed to award XP for review kudos:', xpError);
    }

    const totalKudos = await ReviewKudos.countDocuments({ reviewId: id });

    return NextResponse.json({
      success: true,
      totalKudos,
    });
  } catch (err) {
    console.error('POST review kudos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

