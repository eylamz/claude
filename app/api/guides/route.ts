import { NextRequest, NextResponse } from 'next/server';
import { fetchGuidesData } from '@/lib/api/guides';
import Settings from '@/lib/models/Settings';
import connectDB from '@/lib/db/mongodb';
import { RateLimiter } from '@/lib/redis';
import { MAX_PUBLIC_PAGE_SIZE } from '@/lib/config/api';

const guidesRateLimiter = new RateLimiter(60000, 30);

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return realIp || request.ip || 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rate = await guidesRateLimiter.isAllowed(`guides:${ip}`);
    if (!rate.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rate.resetTime - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Guides rate limit exceeded. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

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
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const search = searchParams.get('search') || '';
    const sports = searchParams.get('sports')?.split(',').filter(Boolean) || [];
    const difficulty = searchParams.get('difficulty') || '';
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const includeFilters = searchParams.get('includeFilters') === 'true' || page === 1;
    
    // Extract limit parameter and cap it at MAX_PUBLIC_PAGE_SIZE
    const requestedLimit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;
    const limit =
      requestedLimit && !Number.isNaN(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), MAX_PUBLIC_PAGE_SIZE)
        : MAX_PUBLIC_PAGE_SIZE;

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

