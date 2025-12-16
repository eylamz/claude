import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Guide from '@/lib/models/Guide';
import { isBlocked, record404, recordSuccess } from '@/lib/utils/circuitBreaker';

const ENDPOINT = '/api/guides/[slug]';

/**
 * Guide Detail API Route
 * 
 * GET /api/guides/[slug]
 * 
 * Fetches a single guide by slug
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, slug.toLowerCase())) {
      return NextResponse.json(
        { error: 'Guide not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    await connectDB();

    const guide = await Guide.findOne({ 
      slug: slug.toLowerCase(), 
      status: 'published' 
    }).lean();

    if (!guide) {
      // Record 404 error
      record404(ENDPOINT, slug.toLowerCase());
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Record success to reset counter
    recordSuccess(ENDPOINT, slug.toLowerCase());

    // Increment views count (async, don't wait)
    Guide.findByIdAndUpdate(guide._id, { $inc: { viewsCount: 1 } }).exec().catch(console.error);

    // Format response
    // contentBlocks is now stored as { en: ContentBlock[], he: ContentBlock[] }
    // tags is now stored as { en: string[], he: string[] }
    // Return it as-is so the frontend can select the appropriate language blocks
    let tags: { en: string[]; he: string[] } | string[];
    if (Array.isArray(guide.tags)) {
      // Old format: single array - return as-is for backward compatibility
      tags = guide.tags;
    } else if (guide.tags && typeof guide.tags === 'object' && 'en' in guide.tags) {
      // New format: localized object
      tags = guide.tags;
    } else {
      tags = { en: [], he: [] };
    }

    const formattedGuide = {
      _id: guide._id.toString(),
      slug: guide.slug,
      title: guide.title,
      description: guide.description,
      coverImage: guide.coverImage,
      relatedSports: guide.relatedSports || [],
      contentBlocks: guide.contentBlocks || { en: [], he: [] }, // New format: object with en/he arrays
      tags: tags, // Can be array (old) or object (new)
      viewsCount: (guide.viewsCount || 0) + 1, // Show incremented count
      likesCount: guide.likesCount || 0,
      rating: guide.rating || 0,
      ratingCount: guide.ratingCount || 0,
      status: guide.status,
      isFeatured: guide.isFeatured || false,
      authorId: guide.authorId?.toString(),
      authorName: guide.authorName || 'Unknown',
      metaTitle: guide.metaTitle || undefined,
      metaDescription: guide.metaDescription || undefined,
      metaKeywords: guide.metaKeywords || undefined,
      publishedAt: guide.publishedAt,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt,
    };

    return NextResponse.json({
      guide: formattedGuide,
    });
  } catch (error) {
    console.error('Error fetching guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

