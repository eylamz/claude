import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import AwardNotification from '@/lib/models/AwardNotification';
import { featureFlags } from '@/lib/config/feature-flags';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!featureFlags.awardPopups) {
      return NextResponse.json({ error: 'Award popups are disabled' }, { status: 403 });
    }

    await connectDB();

    const notifications = await AwardNotification.find({
      userId: session.user.id,
      isRead: false,
    })
      .sort({ createdAt: 1 })
      .select('type xpAmount badgeId badgeName badgeIcon levelId levelTitle message sourceType createdAt')
      .lean()
      .exec();

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({
        id: String(n._id),
        type: n.type,
        xpAmount: n.xpAmount ?? null,
        badgeId: n.badgeId ?? null,
        badgeName: n.badgeName ?? null,
        badgeIcon: n.badgeIcon ?? null,
        levelId: n.levelId ?? null,
        levelTitle: n.levelTitle ?? null,
        message: n.message,
        sourceType: n.sourceType,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching unread award notifications', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

