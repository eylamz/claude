import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import XPEvent from '@/lib/models/XPEvent';
import mongoose from 'mongoose';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/account/xp-history?page=&limit=
 * Authenticated. Paginated XPEvent query for the logged-in user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10))
    );
    const skip = (page - 1) * limit;

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const [events, total] = await Promise.all([
      XPEvent.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      XPEvent.countDocuments({ userId }),
    ]);

    const items = events.map((e: any) => ({
      _id: e._id?.toString(),
      type: e.type,
      xpAmount: e.xpAmount,
      sourceId: e.sourceId?.toString(),
      sourceType: e.sourceType,
      meta: e.meta,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + items.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching XP history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
