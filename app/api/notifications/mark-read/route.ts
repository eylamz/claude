import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import AwardNotification from '@/lib/models/AwardNotification';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.ids)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const ids = body.ids.filter((id: unknown) => typeof id === 'string');

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    await connectDB();

    await AwardNotification.updateMany(
      {
        _id: { $in: ids },
        userId: session.user.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    ).exec();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking award notifications as read', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

