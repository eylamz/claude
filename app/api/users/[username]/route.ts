import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import BadgeDefinition from '@/lib/models/BadgeDefinition';
import { getLevelFromXP } from '@/lib/config/levels';

/**
 * GET /api/users/[username]
 * Public profile data (no sensitive fields). Looks up user by username.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ username: username.trim() })
      .select(
        'username fullName bio profilePhoto city relatedSports totalXP levelId currentRank stats streak badges createdAt'
      )
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalXP = user.totalXP ?? 0;
    const usersAbove = await User.countDocuments({ totalXP: { $gt: totalXP } });
    const computedRank = usersAbove + 1;
    const level = getLevelFromXP(totalXP);
    const badgeIds = user.badges ?? [];
    let badgesWithDetails: Array<{ id: string; name: { en: string; he: string }; icon: string; rarity: string }> = [];

    if (badgeIds.length > 0) {
      const defs = await BadgeDefinition.find({ id: { $in: badgeIds }, isActive: true })
        .select('id name icon rarity')
        .lean();
      badgesWithDetails = defs.map((d: any) => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        rarity: d.rarity ?? 'common',
      }));
    }

    return NextResponse.json({
      _id: user._id?.toString(),
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      profilePhoto: user.profilePhoto,
      city: user.city,
      relatedSports: user.relatedSports ?? [],
      totalXP: user.totalXP ?? 0,
      levelId: user.levelId ?? 1,
      levelTitle: level.title,
      levelColor: level.color,
      currentRank: computedRank,
      stats: user.stats ?? {
        skateparksVisited: 0,
        guidesCompleted: 0,
        eventsAttended: 0,
        reviewsWritten: 0,
      },
      streak: user.streak
        ? {
            currentWeeklyStreak: user.streak.currentWeeklyStreak ?? 0,
            longestWeeklyStreak: user.streak.longestWeeklyStreak ?? 0,
            currentMonthlyStreak: user.streak.currentMonthlyStreak ?? 0,
            weeklyHoursThisWeek: user.streak.weeklyHoursThisWeek ?? 0,
          }
        : null,
      badges: user.badges ?? [],
      badgesWithDetails,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
