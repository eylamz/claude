import mongoose from 'mongoose';

import { featureFlags } from '../config/feature-flags';
import BadgeDefinition, { IBadgeDefinition } from '../models/BadgeDefinition';
import User, { IUserStats } from '../models/User';
import XPEvent from '../models/XPEvent';
import AwardNotification from '../models/AwardNotification';

export async function checkAndAwardBadges(
  userId: string,
  actionType: string,
  stats: IUserStats
): Promise<IBadgeDefinition[]> {
  if (!featureFlags.xpSystem) {
    return [];
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userObjectId).select('badges');

  if (!user) {
    return [];
  }

  const candidateBadges = await BadgeDefinition.find({
    isActive: true,
    'trigger.type': 'count',
    'trigger.action': actionType,
  });

  const alreadyOwned = new Set(user.badges ?? []);

  const newlyQualifying: IBadgeDefinition[] = [];

  for (const badge of candidateBadges) {
    if (alreadyOwned.has(badge.id)) {
      continue;
    }

    const trigger = badge.trigger as { type: 'count'; action: string; threshold: number };

    const counterValue = (stats as any)[trigger.action] as number | undefined;

    if (typeof counterValue === 'number' && counterValue >= trigger.threshold) {
      newlyQualifying.push(badge);
    }
  }

  return newlyQualifying;
}

export async function awardBadgeManually(
  userId: string,
  badgeId: string,
  adminId: string,
  note: string
): Promise<void> {
  if (!featureFlags.xpSystem) {
    return;
  }

  const badge = await BadgeDefinition.findOne({ id: badgeId, isActive: true });
  if (!badge) {
    return;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  await User.updateOne(
    { _id: userObjectId },
    {
      $addToSet: { badges: badge.id },
    }
  );

  if (badge.xpReward > 0) {
    await XPEvent.create({
      userId: userObjectId,
      type: 'admin_adjustment',
      xpAmount: badge.xpReward,
      sourceId: new mongoose.Types.ObjectId(adminId),
      sourceType: 'manual_badge_award',
      meta: {
        badgeId: badge.id,
        note,
      },
    });
  }

  await AwardNotification.create({
    userId: userObjectId,
    type: 'badge',
    badgeId: badge.id,
    badgeName: badge.name,
    badgeIcon: badge.icon,
    message: {
      en: `An admin awarded you the badge: ${badge.name.en}`,
      he: `אדמין העניק לך באדג׳: ${badge.name.he}`,
    },
    sourceType: 'manual_badge_award',
  });
}

