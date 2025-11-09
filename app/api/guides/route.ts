import { NextRequest, NextResponse } from 'next/server';
import { fetchGuidesData } from '@/lib/api/guides';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    const sports = searchParams.get('sports')?.split(',').filter(Boolean) || [];
    const difficulty = searchParams.get('difficulty') || '';
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const includeFilters = searchParams.get('includeFilters') === 'true' || page === 1;

    const data = await fetchGuidesData({
      locale,
      page,
      search,
      sports,
      difficulty,
      minRating,
      sort,
      includeFilters,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching guides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guides' },
      { status: 500 }
    );
  }
}

