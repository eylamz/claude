import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import BadgeDefinition from '@/lib/models/BadgeDefinition';
import AwardNotification from '@/lib/models/AwardNotification';
import { getLevelFromXP, getNextLevel } from '@/lib/config/levels';
import { deleteImage, getPublicIdFromCloudinaryUrl } from '@/lib/cloudinary/upload';
import { configureCloudinary } from '@/lib/cloudinary/config';
import mongoose from 'mongoose';

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const BIO_MAX = 300;
const RELATED_SPORTS = ['skateboarding', 'rollerblading', 'bmx', 'scootering'] as const;

/**
 * GET /api/account/profile
 * Authenticated. Returns current user profile for edit page (includes XP, level, streak, badges).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const user = await User.findById(userId)
      .select(
        'username fullName bio profilePhoto city relatedSports totalXP levelId currentRank stats streak badges email'
      )
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalXP = user.totalXP ?? 0;
    const level = getLevelFromXP(totalXP);
    const nextLevel = getNextLevel(totalXP);
    const badgeIds = user.badges ?? [];

    let badgesWithDetails: Array<{ id: string; name: { en: string; he: string }; icon: string; rarity: string }> = [];
    let badgeEarnedAt: Record<string, string> = {};

    if (badgeIds.length > 0) {
      const [defs, notifications] = await Promise.all([
        BadgeDefinition.find({ id: { $in: badgeIds }, isActive: true })
          .select('id name icon rarity')
          .lean(),
        AwardNotification.find({
          userId,
          type: 'badge',
          badgeId: { $in: badgeIds },
        })
          .sort({ createdAt: 1 })
          .select('badgeId createdAt')
          .lean(),
      ]);
      badgesWithDetails = defs.map((d: any) => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        rarity: d.rarity ?? 'common',
      }));
      notifications.forEach((n: any) => {
        if (n.badgeId && !badgeEarnedAt[n.badgeId]) {
          badgeEarnedAt[n.badgeId] = n.createdAt;
        }
      });
    }

    return NextResponse.json({
      user: {
        _id: user._id?.toString(),
        username: user.username ?? '',
        fullName: user.fullName ?? '',
        bio: user.bio ?? '',
        profilePhoto: user.profilePhoto,
        city: user.city ?? '',
        email: (user as any).email ?? '',
        relatedSports: user.relatedSports ?? [],
        totalXP: user.totalXP ?? 0,
        levelId: user.levelId ?? 1,
        levelTitle: level.title,
        levelColor: level.color,
        levelColorDark: level.colorDark,
        levelTextColorLight: level.textColorLight,
        levelTextColorDark: level.textColorDark,
        currentLevelMinXP: level.minXP,
        nextLevelMinXP: nextLevel?.minXP ?? null,
        nextLevelTitle: nextLevel?.title ?? null,
        currentRank: user.currentRank ?? 0,
        stats: user.stats ?? {},
        streak: user.streak ?? {},
        badges: user.badges ?? [],
        badgesWithDetails,
        badgeEarnedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/account/profile
 * Authenticated. Updates username, bio, profilePhoto, relatedSports, city, fullName.
 * Validates username uniqueness.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.username === 'string') {
      const raw = body.username.trim();
      if (raw.length < USERNAME_MIN) {
        return NextResponse.json(
          { error: 'Username too short', field: 'username' },
          { status: 400 }
        );
      }
      if (raw.length > USERNAME_MAX) {
        return NextResponse.json(
          { error: 'Username too long', field: 'username' },
          { status: 400 }
        );
      }
      if (!USERNAME_REGEX.test(raw)) {
        return NextResponse.json(
          { error: 'Username can only contain letters, numbers, underscores and hyphens', field: 'username' },
          { status: 400 }
        );
      }
      if (raw.toLowerCase() !== (user.username ?? '').toLowerCase()) {
        const existing = await User.findOne({
          username: { $regex: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        }).select('_id');
        if (existing && String(existing._id) !== session.user.id) {
          return NextResponse.json(
            { error: 'Username is already taken', field: 'username' },
            { status: 400 }
          );
        }
      }
      updates.username = raw;
    }

    if (typeof body.fullName === 'string') {
      updates.fullName = body.fullName.trim().slice(0, 100);
    }

    if (typeof body.bio === 'string') {
      const bio = body.bio.trim();
      if (bio.length > BIO_MAX) {
        return NextResponse.json(
          { error: `Bio cannot exceed ${BIO_MAX} characters`, field: 'bio' },
          { status: 400 }
        );
      }
      updates.bio = bio;
    }

    if (typeof body.city === 'string') {
      updates.city = body.city.trim() || undefined;
    }

    if (typeof body.profilePhoto === 'string') {
      updates.profilePhoto = body.profilePhoto.trim() || null;
    } else if (body.profilePhoto === null || body.profilePhoto === '') {
      if (user.profilePhoto) {
        const publicId = getPublicIdFromCloudinaryUrl(user.profilePhoto);
        if (publicId) {
          try {
            configureCloudinary();
            await deleteImage(publicId);
          } catch (err) {
            console.warn('Could not delete profile photo from Cloudinary:', err);
          }
        }
      }
      updates.profilePhoto = null;
    }

    if (Array.isArray(body.relatedSports)) {
      const valid = body.relatedSports.filter((s: string) =>
        RELATED_SPORTS.includes(s as (typeof RELATED_SPORTS)[number])
      );
      updates.relatedSports = [...new Set(valid)];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No updates provided' });
    }

    await User.updateOne({ _id: userId }, { $set: updates });

    const updated = await User.findById(userId)
      .select('username fullName bio profilePhoto city relatedSports')
      .lean();

    return NextResponse.json({
      message: 'Profile updated',
      user: {
        username: updated?.username,
        fullName: updated?.fullName,
        bio: updated?.bio,
        profilePhoto: updated?.profilePhoto,
        city: updated?.city,
        relatedSports: updated?.relatedSports ?? [],
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
