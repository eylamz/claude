import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Trainer from '@/lib/models/Trainer';
import Skatepark from '@/lib/models/Skatepark';

/**
 * Trainer Detail API Route
 * 
 * GET /api/trainers/[slug]
 * 
 * Fetches a single trainer by slug with linked skateparks
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;

    const trainer = await Trainer.findOne({ slug: slug.toLowerCase(), status: 'active' }).lean();

    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    // Fetch linked skateparks separately to avoid populate issues with lean()
    const linkedSkateparkIds = (trainer.linkedSkateparks as any[]) || [];
    let linkedSkateparks: any[] = [];
    
    if (linkedSkateparkIds.length > 0) {
      // Extract ObjectIds - handle both ObjectId objects and strings
      const ids = linkedSkateparkIds.map((id: any) => {
        if (typeof id === 'string') return id;
        if (id._id) return id._id.toString();
        if (id.toString) return id.toString();
        return id;
      }).filter(Boolean);
      
      if (ids.length > 0) {
        const skateparks = await Skatepark.find({
          _id: { $in: ids },
          status: 'active',
        })
          .select('slug name images area rating totalReviews')
          .lean();
        
        linkedSkateparks = skateparks.map((park: any) => ({
          _id: park._id.toString(),
          slug: park.slug,
          name: park.name,
          imageUrl: park.images?.[0]?.url || '/placeholder-skatepark.jpg',
          area: park.area,
          rating: park.rating || 0,
          totalReviews: park.totalReviews || 0,
        }));
      }
    }

    // Format approved reviews only
    const approvedReviews = ((trainer.reviews as any[]) || [])
      .filter((review: any) => review.isApproved)
      .map((review: any) => ({
        _id: review._id?.toString() || review._id,
        userId: review.userId?.toString() || review.userId,
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt || review.createdAt,
      }));

    // Format response
    const formattedTrainer = {
      _id: trainer._id.toString(),
      slug: trainer.slug,
      name: trainer.name,
      description: trainer.description || {},
      shortDescription: trainer.shortDescription || {},
      profileImage: trainer.profileImage || '/placeholder-trainer.jpg',
      galleryImages: trainer.galleryImages || [],
      area: trainer.area,
      relatedSports: trainer.relatedSports || [],
      contactDetails: trainer.contactDetails || {},
      rating: trainer.rating || 0,
      totalReviews: trainer.totalReviews || 0,
      approvedReviews: trainer.approvedReviews || 0,
      isFeatured: trainer.isFeatured || false,
      linkedSkateparks,
      reviews: approvedReviews,
      createdAt: trainer.createdAt,
      updatedAt: trainer.updatedAt,
    };

    return NextResponse.json({
      trainer: formattedTrainer,
    });
  } catch (error) {
    console.error('Error fetching trainer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

