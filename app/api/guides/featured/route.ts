import { NextRequest, NextResponse } from 'next/server';
import Guide from '@/lib/models/Guide';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const locale = searchParams.get('locale') || 'en';
    
    // Fetch featured guides
    const guides = await Guide.findFeatured()
      .limit(limit)
      .select('slug title description coverImage relatedSports viewsCount')
      .lean();
    
    // Transform data for client
    const transformedGuides = guides.map((guide: any) => ({
      id: guide._id.toString(),
      slug: guide.slug,
      title: guide.title[locale as 'en' | 'he'] || guide.title.en,
      description: guide.description[locale as 'en' | 'he'] || guide.description.en,
      image: guide.coverImage,
      sports: guide.relatedSports,
      views: guide.viewsCount,
    }));
    
    return NextResponse.json({ guides: transformedGuides });
  } catch (error: any) {
    console.error('Error fetching featured guides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured guides' },
      { status: 500 }
    );
  }
}
