import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import NewsletterSubscriber from '@/lib/models/NewsletterSubscriber';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim();
    const localeFilter = searchParams.get('locale') || '';

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.email = { $regex: search, $options: 'i' };
    }
    if (localeFilter === 'he' || localeFilter === 'en') {
      filter.locale = localeFilter;
    }

    const totalCount = await NewsletterSubscriber.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const skip = (page - 1) * limit;

    const subscribers = await NewsletterSubscriber.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const list = subscribers.map((s) => ({
      id: String((s as any)._id),
      email: (s as any).email,
      locale: (s as any).locale || 'en',
      createdAt: (s as any).createdAt,
    }));

    return NextResponse.json({
      subscribers: list,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('Admin newsletter GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
