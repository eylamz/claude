import { NextRequest, NextResponse } from 'next/server';
import { fetchGuidesData } from '@/lib/api/guides';
import Settings from '@/lib/models/Settings';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const versionOnly = searchParams.get('versionOnly') === 'true';
    
    // If only version is requested, return it without fetching guides
    if (versionOnly) {
      const settings = await Settings.findOrCreate();
      const version = settings.guidesVersion || 1;
      return NextResponse.json({ version });
    }

    const locale = searchParams.get('locale') || 'en';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    const sports = searchParams.get('sports')?.split(',').filter(Boolean) || [];
    const difficulty = searchParams.get('difficulty') || '';
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const includeFilters = searchParams.get('includeFilters') === 'true' || page === 1;
    
    // Extract limit parameter and cap it at 100
    const requestedLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const limit = requestedLimit ? Math.min(requestedLimit, 100) : undefined;

    const data = await fetchGuidesData({
      locale,
      page,
      limit,
      search,
      sports,
      difficulty,
      minRating,
      sort,
      includeFilters,
    });

    // Get version from settings
    const settings = await Settings.findOrCreate();
    const version = settings.guidesVersion || 1;

    return NextResponse.json({
      ...data,
      version,
    });
  } catch (error: any) {
    console.error('Error fetching guides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guides' },
      { status: 500 }
    );
  }
}

