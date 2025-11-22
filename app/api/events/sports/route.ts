import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';

/**
 * Events Sports API Route
 * 
 * GET /api/events/sports?locale=en
 * 
 * Returns unique list of sports from all published events
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';

    // Build query for published, public events
    const query: any = {
      status: 'published',
      isPublic: true,
    };

    // Fetch only relatedSports field from published events
    const events = await Event.find(query)
      .select('relatedSports')
      .lean();

    // Extract all unique sports
    const allSports = new Set<string>();
    events.forEach((event: any) => {
      if (event.relatedSports && Array.isArray(event.relatedSports)) {
        event.relatedSports.forEach((sport: string) => {
          if (sport && sport.trim()) {
            allSports.add(sport.trim());
          }
        });
      }
    });

    // Convert Set to sorted array
    const sports = Array.from(allSports).sort();

    return NextResponse.json({
      sports,
    });
  } catch (error: any) {
    console.error('Events Sports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports' },
      { status: 500 }
    );
  }
}








