import { NextRequest, NextResponse } from 'next/server';
import Guide from '@/lib/models/Guide';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';

    // Only fetch from published guides
    const publishedGuides = await Guide.find({ status: 'published' })
      .select('relatedSports tags')
      .lean();

    // Extract unique sports
    const sportsSet = new Set<string>();
    publishedGuides.forEach((guide: any) => {
      if (guide.relatedSports && Array.isArray(guide.relatedSports)) {
        guide.relatedSports.forEach((sport: string) => {
          if (sport) sportsSet.add(sport);
        });
      }
    });

    // Extract unique difficulties from tags
    // Common difficulty tags: beginner, intermediate, advanced, expert
    const difficultiesSet = new Set<string>();
    const difficultyKeywords = ['beginner', 'intermediate', 'advanced', 'expert'];
    
    publishedGuides.forEach((guide: any) => {
      if (guide.tags && Array.isArray(guide.tags)) {
        guide.tags.forEach((tag: string) => {
          const lowerTag = tag.toLowerCase();
          if (difficultyKeywords.includes(lowerTag)) {
            // Capitalize first letter
            difficultiesSet.add(lowerTag.charAt(0).toUpperCase() + lowerTag.slice(1));
          }
        });
      }
    });

    // Convert sets to sorted arrays
    const sports = Array.from(sportsSet).sort();
    const difficulties = Array.from(difficultiesSet).sort((a, b) => {
      // Custom sort: beginner -> intermediate -> advanced -> expert
      const order = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
      return order.indexOf(a) - order.indexOf(b);
    });

    return NextResponse.json({
      sports,
      difficulties,
    });
  } catch (error: any) {
    console.error('Error fetching guide filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters', sports: [], difficulties: [] },
      { status: 500 }
    );
  }
}




