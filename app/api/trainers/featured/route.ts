import { NextRequest, NextResponse } from 'next/server';
import Trainer from '@/lib/models/Trainer';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const locale = searchParams.get('locale') || 'en';
    
    // Fetch featured trainers
    const trainers = await Trainer.findFeatured()
      .limit(limit)
      .select('slug name profileImage area relatedSports')
      .lean();
    
    // Transform data for client
    const transformedTrainers = trainers.map((trainer: any) => ({
      id: trainer._id.toString(),
      slug: trainer.slug,
      name: trainer.name[locale as 'en' | 'he'] || trainer.name.en,
      image: trainer.profileImage,
      area: trainer.area,
      sports: trainer.relatedSports,
    }));
    
    return NextResponse.json({ trainers: transformedTrainers });
  } catch (error: any) {
    console.error('Error fetching featured trainers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured trainers' },
      { status: 500 }
    );
  }
}














