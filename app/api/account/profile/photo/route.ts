import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import sharp from 'sharp';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { uploadImage, deleteImage, getPublicIdFromCloudinaryUrl } from '@/lib/cloudinary/upload';
import { configureCloudinary } from '@/lib/cloudinary/config';
import mongoose from 'mongoose';

const PROFILE_PHOTOS_FOLDER = 'profile-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 400; // max width/height before upload (saves storage)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

/** Resize raster images to max 400x400 (fit inside), output WebP. SVGs are returned as-is. */
async function resizeProfilePhoto(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; format: string }> {
  if (mimeType === 'image/svg+xml') {
    return { buffer, format: 'svg' };
  }
  const resized = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 100 })
    .toBuffer();
  return { buffer: resized, format: 'webp' };
}

/**
 * POST /api/account/profile/photo
 * Authenticated. Accepts multipart form with "photo" file. Uploads to Cloudinary
 * profile-photos folder and updates user.profilePhoto.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing or invalid file. Use form field "photo".' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, WebP, GIF or SVG.' },
        { status: 400 }
      );
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const existingUser = await User.findById(userId).select('profilePhoto').lean();
    if (existingUser?.profilePhoto) {
      const publicId = getPublicIdFromCloudinaryUrl(existingUser.profilePhoto);
      if (publicId) {
        try {
          configureCloudinary();
          await deleteImage(publicId);
        } catch (err) {
          console.warn('Could not delete previous profile photo from Cloudinary:', err);
        }
      }
    }

    configureCloudinary();
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer, format } = await resizeProfilePhoto(inputBuffer, file.type);
    const publicId = `${session.user.id}-${Date.now()}`;

    const result = await uploadImage(buffer, PROFILE_PHOTOS_FOLDER, {
      publicId,
      resourceType: 'image',
      format,
    });

    await User.updateOne(
      { _id: userId },
      { $set: { profilePhoto: result.secureUrl } }
    );

    return NextResponse.json({
      message: 'Profile photo updated',
      profilePhoto: result.secureUrl,
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
