import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Guide from '@/lib/models/Guide';
import { MAX_ADMIN_PAGE_SIZE } from '@/lib/config/api';
import { validateCsrf } from '@/lib/security/csrf';

export async function GET(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') || '1');
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(
      Math.max(Number.isNaN(requestedLimit) ? 20 : requestedLimit, 1),
      MAX_ADMIN_PAGE_SIZE
    );
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sport = searchParams.get('sport') || '';
    const sortBy = searchParams.get('sortBy') || 'viewsCount';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.he': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Sport filter
    if (sport) {
      filter.relatedSports = { $in: [sport] };
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Guide.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch guides
    const guides = await Guide.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format guides data
    const formattedGuides = guides.map((guide: any) => ({
      id: guide._id.toString(),
      slug: guide.slug,
      title: {
        en: guide.title?.en || 'Untitled',
        he: guide.title?.he || 'ללא כותרת',
      },
      description: {
        en: guide.description?.en || '',
        he: guide.description?.he || '',
      },
      coverImage: guide.coverImage || '/placeholder-guide.jpg',
      relatedSports: guide.relatedSports || [],
      tags: guide.tags || [],
      viewsCount: guide.viewsCount || 0,
      likesCount: guide.likesCount || 0,
      rating: guide.rating || 0,
      ratingCount: guide.ratingCount || 0,
      status: guide.status || 'draft',
      isFeatured: guide.isFeatured || false,
    }));

    return NextResponse.json({
      guides: formattedGuides,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Guides API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guides' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Validate and clean contentBlocks before creating
    let cleanedContentBlocks: { en: any[]; he: any[] } = { en: [], he: [] };
    if (body.contentBlocks) {
      if (typeof body.contentBlocks === 'object' && !Array.isArray(body.contentBlocks)) {
        // Ensure we have en and he properties
        if (!('en' in body.contentBlocks) || !('he' in body.contentBlocks)) {
          console.error('Invalid contentBlocks format - missing en or he:', body.contentBlocks);
          return NextResponse.json(
            { error: 'Invalid contentBlocks format. Expected object with en and he arrays.' },
            { status: 400 }
          );
        }
        
        cleanedContentBlocks = {
          en: Array.isArray(body.contentBlocks.en) 
            ? body.contentBlocks.en.filter((block: any) => block && block.type && typeof block.type === 'string')
            : [],
          he: Array.isArray(body.contentBlocks.he)
            ? body.contentBlocks.he.filter((block: any) => block && block.type && typeof block.type === 'string')
            : [],
        };
        
        // Ensure each block has required fields (type and order)
        cleanedContentBlocks.en = cleanedContentBlocks.en.map((block: any, index: number) => {
          if (!block.type) {
            console.warn('Block missing type, skipping:', block);
            return null;
          }
          return {
            ...block,
            type: String(block.type), // Ensure type is a string
            order: typeof block.order === 'number' ? block.order : index,
          };
        }).filter(Boolean);
        
        cleanedContentBlocks.he = cleanedContentBlocks.he.map((block: any, index: number) => {
          if (!block.type) {
            console.warn('Block missing type, skipping:', block);
            return null;
          }
          return {
            ...block,
            type: String(block.type), // Ensure type is a string
            order: typeof block.order === 'number' ? block.order : index,
          };
        }).filter(Boolean);
      } else {
        console.error('Invalid contentBlocks format - not an object:', typeof body.contentBlocks, body.contentBlocks);
        return NextResponse.json(
          { error: 'Invalid contentBlocks format. Expected object with en and he arrays.' },
          { status: 400 }
        );
      }
    }

    // Validate and clean tags
    let cleanedTags: { en: string[]; he: string[] } = { en: [], he: [] };
    if (body.tags) {
      if (typeof body.tags === 'object' && !Array.isArray(body.tags)) {
        // Ensure we have en and he properties
        if ('en' in body.tags && 'he' in body.tags) {
          cleanedTags = {
            en: Array.isArray(body.tags.en) ? body.tags.en.filter((t: any) => typeof t === 'string' && t.trim()) : [],
            he: Array.isArray(body.tags.he) ? body.tags.he.filter((t: any) => typeof t === 'string' && t.trim()) : [],
          };
        } else {
          console.error('Invalid tags format - missing en or he:', body.tags);
          return NextResponse.json(
            { error: 'Invalid tags format. Expected object with en and he arrays.' },
            { status: 400 }
          );
        }
      } else if (Array.isArray(body.tags)) {
        // Old format: single array - migrate to new format
        cleanedTags = {
          en: body.tags.filter((t: any) => typeof t === 'string' && t.trim()),
          he: body.tags.filter((t: any) => typeof t === 'string' && t.trim()),
        };
      } else {
        console.error('Invalid tags format - not an object or array:', typeof body.tags, body.tags);
        return NextResponse.json(
          { error: 'Invalid tags format. Expected object with en and he arrays.' },
          { status: 400 }
        );
      }
    }

    // Prepare guide data - explicitly set contentBlocks and tags to ensure correct structure
    // Don't spread body.contentBlocks or body.tags to avoid conflicts
    const { contentBlocks: _, tags: __, ...bodyWithoutContentBlocksAndTags } = body;
    
    const guideData: any = {
      ...bodyWithoutContentBlocksAndTags,
      contentBlocks: {
        en: cleanedContentBlocks.en,
        he: cleanedContentBlocks.he,
      },
      tags: cleanedTags,
      authorId: session.user.id,
      authorName: user.fullName || user.email,
      viewsCount: 0,
      likesCount: 0,
      rating: 0,
      ratingCount: 0,
    };

    console.log('Creating guide with contentBlocks:', {
      enCount: cleanedContentBlocks.en.length,
      heCount: cleanedContentBlocks.he.length,
      structure: {
        isObject: typeof guideData.contentBlocks === 'object' && !Array.isArray(guideData.contentBlocks),
        hasEn: 'en' in guideData.contentBlocks,
        hasHe: 'he' in guideData.contentBlocks,
        enType: Array.isArray(guideData.contentBlocks.en),
        heType: Array.isArray(guideData.contentBlocks.he),
        firstEnBlock: cleanedContentBlocks.en[0],
        firstHeBlock: cleanedContentBlocks.he[0],
      },
    });

    // Create new guide
    const newGuide = new Guide(guideData);
    
    // Mark contentBlocks as modified to ensure Mongoose recognizes the nested structure
    if (newGuide.isNew) {
      newGuide.markModified('contentBlocks');
    }
    
    // Validate before saving
    try {
      const validationError = newGuide.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        console.error('Validation error details:', JSON.stringify(validationError, null, 2));
        return NextResponse.json(
          { error: validationError.message || 'Validation failed' },
          { status: 400 }
        );
      }
    } catch (validationErr: any) {
      console.error('Validation exception:', validationErr);
      return NextResponse.json(
        { error: validationErr.message || 'Validation failed' },
        { status: 400 }
      );
    }
    
    await newGuide.save();

    return NextResponse.json(
      { message: 'Guide created successfully', guide: newGuide },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create guide error:', error);
    
    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
      const duplicateValue = error.keyValue ? Object.values(error.keyValue)[0] : 'value';
      
      if (duplicateField === 'slug') {
        return NextResponse.json(
          { error: `A guide with the slug "${duplicateValue}" already exists. Please choose a different slug.` },
          { status: 409 } // Conflict status code
        );
      }
      
      return NextResponse.json(
        { error: `A guide with this ${duplicateField} already exists.` },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message || 'Validation failed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create guide' },
      { status: 500 }
    );
  }
}



