import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Trainer from '@/lib/models/Trainer';
import { MAX_ADMIN_PAGE_SIZE } from '@/lib/config/api';
import { validateCsrf } from '@/lib/security/csrf';

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
    const rawPage = parseInt(searchParams.get('page') || '1');
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(
      Math.max(Number.isNaN(requestedLimit) ? 20 : requestedLimit, 1),
      MAX_ADMIN_PAGE_SIZE
    );
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const area = searchParams.get('area') || '';
    const sport = searchParams.get('sport') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.he': { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Area filter
    if (area) {
      filter.area = area;
    }

    // Sport filter
    if (sport) {
      filter.relatedSports = { $in: [sport] };
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Trainer.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch trainers
    const trainers = await Trainer.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .populate('linkedSkateparks', 'name')
      .lean();

    // Format trainers data
    const formattedTrainers = trainers.map((trainer: any) => ({
      id: trainer._id.toString(),
      slug: trainer.slug,
      name: trainer.name || { en: 'Unknown', he: 'לא ידוע' },
      area: trainer.area || '',
      relatedSports: trainer.relatedSports || [],
      contactVisible: trainer.contactDetails?.visible !== false,
      rating: trainer.rating || 0,
      totalReviews: trainer.totalReviews || 0,
      approvedReviews: trainer.approvedReviews || 0,
      status: trainer.status || 'active',
      profileImage: trainer.profileImage || '/placeholder-trainer.jpg',
      isFeatured: trainer.isFeatured || false,
      linkedSkateparks: trainer.linkedSkateparks || [],
    }));

    return NextResponse.json({
      trainers: formattedTrainers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Trainers API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const newTrainer = new Trainer(body);
    await newTrainer.save();

    return NextResponse.json(
      { message: 'Trainer created successfully', trainer: newTrainer },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create trainer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create trainer' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { trainerId, updates } = body;

    const updatedTrainer = await Trainer.findByIdAndUpdate(
      trainerId,
      { $set: updates },
      { new: true }
    );

    if (!updatedTrainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    return NextResponse.json({ trainer: updatedTrainer });
  } catch (error: any) {
    console.error('Update trainer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update trainer' },
      { status: 500 }
    );
  }
}



