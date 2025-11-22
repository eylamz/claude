import { NextRequest, NextResponse } from 'next/server';
import Skatepark from '@/lib/models/Skatepark';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const locale = searchParams.get('locale') || 'en';
    
    // Fetch featured skateparks, sorted by opening year (newest first)
    const skateparks = await Skatepark.findFeatured()
      .limit(limit)
      .sort({ openingYear: -1 })
      .select('slug name images area openingYear')
      .lean();
    
    // Transform data for client
    const transformedSkateparks = skateparks.map((skatepark: any) => ({
      id: skatepark._id.toString(),
      slug: skatepark.slug,
      name: skatepark.name[locale as 'en' | 'he'] || skatepark.name.en,
      image: skatepark.images && skatepark.images.length > 0 ? skatepark.images[0].url : '',
      area: skatepark.area,
      openingYear: skatepark.openingYear,
    }));
    
    return NextResponse.json({ skateparks: transformedSkateparks });
  } catch (error: any) {
    console.error('Error fetching featured skateparks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured skateparks' },
      { status: 500 }
    );
  }
}














