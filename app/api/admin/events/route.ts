import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';

export async function GET(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const sport = searchParams.get('sport') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const upcomingOnly = searchParams.get('upcomingOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'startDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.he': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Sport filter
    if (sport) {
      filter.relatedSports = { $in: [sport] };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) {
        filter.startDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.startDate.$lte = new Date(dateTo);
      }
    }

    // Upcoming/Past filter
    const now = new Date();
    if (upcomingOnly) {
      filter.startDate = { ...filter.startDate, $gte: now };
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Event.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch events
    const events = await Event.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format events data
    const formattedEvents = events.map((event: any) => ({
      id: event._id.toString(),
      slug: event.slug,
      title: {
        en: event.title?.en || 'Untitled',
        he: event.title?.he || 'ללא כותרת',
      },
      startDate: event.startDate,
      endDate: event.endDate,
      location: {
        name: event.location?.name || { en: '', he: '' },
        address: event.location?.address || { en: '', he: '' },
      },
      relatedSports: event.relatedSports || [],
      category: event.category || '',
      viewsCount: event.viewsCount || 0,
      interestedCount: event.interestedCount || 0,
      attendedCount: event.attendedCount || 0,
      status: event.status || 'draft',
      featuredImage: event.featuredImage || event.images?.[0]?.url || '/placeholder-event.jpg',
      capacity: event.capacity,
      attendedCount: event.attendedCount || 0,
      isFree: event.isFree,
      price: event.price,
    }));

    return NextResponse.json({
      events: formattedEvents,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Create new event (implementation would go here)
    // For now, return a success message
    const newEvent = new Event(body);
    await newEvent.save();

    return NextResponse.json(
      { message: 'Event created successfully', event: newEvent },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}



