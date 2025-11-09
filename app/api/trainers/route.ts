import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Trainer from '@/lib/models/Trainer';

/**
 * Trainers API Route
 * 
 * GET /api/trainers
 * 
 * Fetches all trainers with filtering (no pagination, no server-side sorting)
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const area = searchParams.get('area'); // 'north' | 'center' | 'south'
    const search = searchParams.get('search')?.trim();
    const sports = searchParams.getAll('sports'); // array of sport names
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null;

    // Build query
    const query: any = {
      status: 'active',
    };

    // Area filter
    if (area && ['north', 'center', 'south'].includes(area)) {
      query.area = area;
    }

    // Search filter (text search on name)
    if (search && search.length > 0) {
      query.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.he': { $regex: search, $options: 'i' } },
      ];
    }

    // Sports filter
    if (sports.length > 0) {
      query.relatedSports = { $in: sports };
    }

    // Minimum rating filter
    if (minRating !== null && !isNaN(minRating)) {
      query.rating = { $gte: minRating };
    }

    // Fetch ALL trainers (no pagination, no sorting)
    const trainers = await Trainer.find(query).lean();

    // Format response with all data
    const formattedTrainers = trainers.map((trainer: any) => ({
      _id: trainer._id.toString(),
      slug: trainer.slug,
      name: trainer.name,
      profileImage: trainer.profileImage || '/placeholder-trainer.jpg',
      area: trainer.area,
      relatedSports: trainer.relatedSports || [],
      rating: trainer.rating || 0,
      totalReviews: trainer.totalReviews || 0,
      contactDetails: trainer.contactDetails || {},
      isFeatured: trainer.isFeatured || false,
      createdAt: trainer.createdAt || null,
    }));

    return NextResponse.json({
      trainers: formattedTrainers,
    });
  } catch (error) {
    console.error('Error fetching trainers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




