import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Guide from '@/lib/models/Guide';

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
    const sport = searchParams.get('sport') || '';
    const sortBy = searchParams.get('sortBy') || 'viewsCount';
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

    // Sport filter
    if (sport) {
      filter.relatedSports = { $in: [sport] };
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Guide.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch guides
    const guides = await Guide.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format guides data
    const formattedGuides = guides.map((guide: any) => ({
      id: guide._id.toString(),
      slug: guide.slug,
      title: {
        en: guide.title?.en || 'Untitled',
        he: guide.title?.he || 'ללא כותרת',
      },
      description: {
        en: guide.description?.en || '',
        he: guide.description?.he || '',
      },
      coverImage: guide.coverImage || '/placeholder-guide.jpg',
      relatedSports: guide.relatedSports || [],
      tags: guide.tags || [],
      viewsCount: guide.viewsCount || 0,
      likesCount: guide.likesCount || 0,
      rating: guide.rating || 0,
      ratingCount: guide.ratingCount || 0,
      status: guide.status || 'draft',
      isFeatured: guide.isFeatured || false,
    }));

    return NextResponse.json({
      guides: formattedGuides,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Guides API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guides' },
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

    // Prepare guide data
    const guideData = {
      ...body,
      authorId: session.user.id,
      authorName: user.name || user.email,
      viewsCount: 0,
      likesCount: 0,
      rating: 0,
      ratingCount: 0,
    };

    // Create new guide
    const newGuide = new Guide(guideData);
    await newGuide.save();

    return NextResponse.json(
      { message: 'Guide created successfully', guide: newGuide },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create guide error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create guide' },
      { status: 500 }
    );
  }
}



