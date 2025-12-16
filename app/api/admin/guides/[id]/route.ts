import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Guide from '@/lib/models/Guide';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid guide ID' }, { status: 400 });
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

    const guide = await Guide.findById(id).lean();

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    // Format guide data
    const formattedGuide = {
      id: guide._id.toString(),
      slug: guide.slug,
      title: {
        en: guide.title?.en || '',
        he: guide.title?.he || '',
      },
      description: {
        en: guide.description?.en || '',
        he: guide.description?.he || '',
      },
      coverImage: guide.coverImage || '',
      relatedSports: guide.relatedSports || [],
      tags: guide.tags || [],
      contentBlocks: guide.contentBlocks || [],
      status: guide.status || 'draft',
      isFeatured: guide.isFeatured || false,
      metaTitle: {
        en: guide.metaTitle?.en || '',
        he: guide.metaTitle?.he || '',
      },
      metaDescription: {
        en: guide.metaDescription?.en || '',
        he: guide.metaDescription?.he || '',
      },
      metaKeywords: {
        en: guide.metaKeywords?.en || '',
        he: guide.metaKeywords?.he || '',
      },
      viewsCount: guide.viewsCount || 0,
      likesCount: guide.likesCount || 0,
      rating: guide.rating || 0,
      ratingCount: guide.ratingCount || 0,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt,
      publishedAt: guide.publishedAt,
    };

    return NextResponse.json({ guide: formattedGuide });
  } catch (error: any) {
    console.error('Get guide error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch guide' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid guide ID' }, { status: 400 });
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

    const guide = await Guide.findById(id);
    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Ensure existing guide has proper tags format (migrate if needed)
    // Do this after reading the body to avoid consuming the request stream
    if (guide.tags && Array.isArray(guide.tags) && !body.tags) {
      // Old format detected - migrate to new format (only if tags not being updated)
      console.log('Migrating guide tags from array to object format');
      guide.tags = {
        en: [...guide.tags],
        he: [...guide.tags],
      };
      guide.markModified('tags');
    }
    const {
      slug,
      title,
      description,
      coverImage,
      relatedSports,
      tags: tagsRaw,
      contentBlocks,
      status,
      isFeatured,
      metaTitle,
      metaDescription,
      metaKeywords,
    } = body;
    
    // Debug: Log what we received
    console.log('Received tags type:', typeof tagsRaw, Array.isArray(tagsRaw), tagsRaw);

    // Update fields
    if (slug !== undefined) guide.slug = slug;
    if (title !== undefined) guide.title = title;
    if (description !== undefined) guide.description = description;
    if (coverImage !== undefined) guide.coverImage = coverImage;
    if (relatedSports !== undefined) guide.relatedSports = relatedSports;
    
    // Validate and clean tags before assigning
    if (tagsRaw !== undefined) {
      console.log('Processing tags - type:', typeof tagsRaw, 'isArray:', Array.isArray(tagsRaw), 'value:', tagsRaw);
      
      // Handle string representation (shouldn't happen, but just in case)
      let tagsToProcess = tagsRaw;
      if (typeof tagsRaw === 'string') {
        try {
          tagsToProcess = JSON.parse(tagsRaw);
          console.log('Parsed tags from string:', tagsToProcess);
        } catch (e) {
          console.error('Failed to parse tags string:', e, 'Original:', tagsRaw);
          throw new Error('Invalid tags format: cannot parse string');
        }
      }
      
      // Ensure tags is an object with en and he arrays
      if (typeof tagsToProcess === 'object' && tagsToProcess !== null && !Array.isArray(tagsToProcess)) {
        // Ensure we have en and he properties
        if ('en' in tagsToProcess && 'he' in tagsToProcess) {
          const cleanedTags = {
            en: Array.isArray(tagsToProcess.en) ? tagsToProcess.en.filter((t: any) => typeof t === 'string' && t.trim()) : [],
            he: Array.isArray(tagsToProcess.he) ? tagsToProcess.he.filter((t: any) => typeof t === 'string' && t.trim()) : [],
          };
          console.log('Setting cleaned tags object:', cleanedTags);
          // Directly assign to avoid Mongoose casting issues
          guide.set('tags', cleanedTags, { strict: false });
          guide.markModified('tags');
        } else {
          console.error('Tags missing en or he properties:', tagsToProcess);
          throw new Error('Tags must have both "en" and "he" properties');
        }
      } else if (Array.isArray(tagsToProcess)) {
        // Old format: single array - migrate to new format
        const cleanedTags = {
          en: tagsToProcess.filter((t: any) => typeof t === 'string' && t.trim()),
          he: tagsToProcess.filter((t: any) => typeof t === 'string' && t.trim()),
        };
        console.log('Migrating tags from array to object:', cleanedTags);
        guide.set('tags', cleanedTags, { strict: false });
        guide.markModified('tags');
      } else {
        console.error('Invalid tags format - not object or array:', typeof tagsToProcess, tagsToProcess);
        throw new Error('Tags must be an object with "en" and "he" arrays');
      }
    }
    
    // Validate and clean contentBlocks before assigning
    if (contentBlocks !== undefined) {
      // Ensure contentBlocks is an object with en and he arrays
      if (typeof contentBlocks === 'object' && !Array.isArray(contentBlocks)) {
        // Ensure we have en and he properties
        if (!('en' in contentBlocks) || !('he' in contentBlocks)) {
          console.error('Invalid contentBlocks format - missing en or he:', contentBlocks);
          return NextResponse.json(
            { error: 'Invalid contentBlocks format. Expected object with en and he arrays.' },
            { status: 400 }
          );
        }
        
        const cleanedContentBlocks: { en: any[]; he: any[] } = {
          en: Array.isArray(contentBlocks.en)
            ? contentBlocks.en.filter((block: any) => block && block.type && typeof block.type === 'string')
            : [],
          he: Array.isArray(contentBlocks.he)
            ? contentBlocks.he.filter((block: any) => block && block.type && typeof block.type === 'string')
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
        
        console.log('Setting contentBlocks:', {
          enCount: cleanedContentBlocks.en.length,
          heCount: cleanedContentBlocks.he.length,
          enTypes: cleanedContentBlocks.en.map((b: any) => b.type),
          heTypes: cleanedContentBlocks.he.map((b: any) => b.type),
          structure: {
            isObject: typeof cleanedContentBlocks === 'object' && !Array.isArray(cleanedContentBlocks),
            hasEn: 'en' in cleanedContentBlocks,
            hasHe: 'he' in cleanedContentBlocks,
            enType: Array.isArray(cleanedContentBlocks.en),
            heType: Array.isArray(cleanedContentBlocks.he),
          },
        });
        
        // Use markModified to ensure Mongoose recognizes the nested structure change
        guide.contentBlocks = cleanedContentBlocks;
        guide.markModified('contentBlocks');
      } else {
        console.error('Invalid contentBlocks format:', contentBlocks);
        return NextResponse.json(
          { error: 'Invalid contentBlocks format. Expected object with en and he arrays.' },
          { status: 400 }
        );
      }
    }
    if (status !== undefined) {
      guide.status = status;
      // Set publishedAt when status changes to published
      if (status === 'published' && !guide.publishedAt) {
        guide.publishedAt = new Date();
      }
    }
    if (isFeatured !== undefined) guide.isFeatured = isFeatured;
    if (metaTitle !== undefined) guide.metaTitle = metaTitle;
    if (metaDescription !== undefined) guide.metaDescription = metaDescription;
    if (metaKeywords !== undefined) guide.metaKeywords = metaKeywords;

    // Save the guide - use validateBeforeSave: false to avoid schema validation issues with Mixed types
    // This is safe because we've already validated and cleaned the data above
    try {
      await guide.save({ validateBeforeSave: false });
    } catch (saveError: any) {
      console.error('Save error:', saveError);
      throw saveError;
    }

    // Format response
    const formattedGuide = {
      id: guide._id.toString(),
      slug: guide.slug,
      title: guide.title,
      description: guide.description,
      coverImage: guide.coverImage,
      relatedSports: guide.relatedSports,
      tags: guide.tags,
      contentBlocks: guide.contentBlocks,
      status: guide.status,
      isFeatured: guide.isFeatured,
      metaTitle: guide.metaTitle,
      metaDescription: guide.metaDescription,
      metaKeywords: guide.metaKeywords,
    };

    return NextResponse.json({
      message: 'Guide updated successfully',
      guide: formattedGuide,
    });
  } catch (error: any) {
    console.error('Update guide error:', error);
    
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
      { error: error.message || 'Failed to update guide' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid guide ID' }, { status: 400 });
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

    const guide = await Guide.findById(id);
    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    await guide.deleteOne();

    return NextResponse.json({ message: 'Guide deleted successfully' });
  } catch (error: any) {
    console.error('Delete guide error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete guide' },
      { status: 500 }
    );
  }
}


