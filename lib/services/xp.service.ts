import mongoose from 'mongoose';

import { featureFlags } from '../config/feature-flags';
import { getLevelFromXP, LevelDefinition } from '../config/levels';
import XPEvent, { XPEventType } from '../models/XPEvent';
import XPMultiplierEvent from '../models/XPMultiplierEvent';
import Season from '../models/Season';
import User, { IUserStats } from '../models/User';
import Crew from '../models/Crew';
import AwardNotification from '../models/AwardNotification';
import * as badgeService from './badge.service';

export interface AwardXPParams {
  userId: string;
  type: XPEventType;
  xpAmount: number;
  sourceId?: string;
  sourceType?: string;
  meta?: Record<string, any>;
}

export interface AwardXPResult {
  newTotal: number;
  newLevel: LevelDefinition | null;
  badgesEarned: import('../models/BadgeDefinition').IBadgeDefinition[];
}

export async function checkLevelUp(
  userId: string,
  oldXP: number,
  newXP: number
): Promise<LevelDefinition | null> {
  const oldLevel = getLevelFromXP(oldXP);
  const newLevel = getLevelFromXP(newXP);

  if (oldLevel.id === newLevel.id) {
    return null;
  }

  await User.updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { $set: { levelId: newLevel.id } }
  );

  await AwardNotification.create({
    userId: new mongoose.Types.ObjectId(userId),
    type: 'level_up',
    levelId: newLevel.id,
    levelTitle: newLevel.title,
    message: {
      en: `You reached level ${newLevel.title.en}!`,
      he: `הגעת לרמה ${newLevel.title.he}!`,
    },
    sourceType: 'level_system',
  });

  return newLevel;
}

export async function awardXP(params: AwardXPParams): Promise<AwardXPResult> {
  if (!featureFlags.xpSystem) {
    return {
      newTotal: 0,
      newLevel: null,
      badgesEarned: [],
    };
  }

  const { userId, type, sourceId, sourceType, meta = {} } = params;
  let xpAmount = params.xpAmount;

  const now = new Date();

  let baseXP: number | undefined;
  let multiplierApplied: number | undefined;

  if (featureFlags.xpMultiplier) {
    const activeMultiplier = await XPMultiplierEvent.findOne({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
      appliesTo: { $in: [type, 'all'] },
    }).sort({ startsAt: -1 });

    if (activeMultiplier) {
      baseXP = xpAmount;
      multiplierApplied = activeMultiplier.multiplier;
      xpAmount = Math.round(xpAmount * activeMultiplier.multiplier);
    }
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const userBefore = await User.findById(userObjectId).select('totalXP stats crewId currentSeasonXP');
  const oldXP = userBefore?.totalXP ?? 0;

  const statsInc: Partial<Record<keyof IUserStats, number>> = {};

  switch (type) {
    case 'skatepark_checkin': {
      const isNewPark = meta.isNewPark === true;
      const durationHours = (meta.durationHours as number | undefined) ?? 0;
      if (isNewPark) {
        statsInc.skateparksVisited = 1;
      }
      if (durationHours > 0) {
        statsInc.totalCheckinHours = durationHours;
      }
      break;
    }
    case 'guide_quiz_passed':
      statsInc.guidesCompleted = 1;
      statsInc.quizzesPassed = 1;
      break;
    case 'event_signup':
      statsInc.eventsAttended = 1;
      break;
    case 'review_written':
      statsInc.reviewsWritten = 1;
      break;
    case 'survey_completed':
      statsInc.surveysCompleted = 1;
      break;
    case 'kudos_received':
      statsInc.kudosReceived = 1;
      break;
    case 'kudos_given':
      statsInc.kudosGiven = 1;
      break;
    case 'weekly_challenge_completed':
      statsInc.challengesCompleted = 1;
      break;
    default:
      break;
  }

  const userUpdateResult = await User.findOneAndUpdate(
    { _id: userObjectId },
    {
      $inc: {
        totalXP: xpAmount,
        currentSeasonXP: xpAmount,
        ...Object.fromEntries(
          Object.entries(statsInc).map(([key, value]) => [`stats.${key}`, value])
        ),
      },
    },
    {
      new: true,
    }
  ).select('totalXP stats crewId currentSeasonXP');

  if (!userUpdateResult) {
    return {
      newTotal: oldXP,
      newLevel: null,
      badgesEarned: [],
    };
  }

  const updatedStats = userUpdateResult.stats;
  const newTotalXP = userUpdateResult.totalXP;

  if (userUpdateResult.crewId && featureFlags.crews) {
    await Crew.updateOne(
      {
        _id: userUpdateResult.crewId,
        'members.userId': userObjectId,
      },
      {
        $inc: {
          totalXP: xpAmount,
          currentSeasonXP: xpAmount,
          'members.$.contributedXP': xpAmount,
        },
      }
    );
  }

  const activeSeason = await Season.findOne({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).sort({ startsAt: -1 });

  await XPEvent.create({
    userId: userObjectId,
    type,
    xpAmount,
    baseXP,
    multiplierApplied,
    sourceId: sourceId ? new mongoose.Types.ObjectId(sourceId) : undefined,
    sourceType,
    seasonId: activeSeason?.id,
    meta,
  });

  const newLevel = await checkLevelUp(userId, oldXP, newTotalXP);

  const badgesEarned = await badgeService.checkAndAwardBadges(userId, type, updatedStats);

  if (badgesEarned.length > 0) {
    const badgeIds = badgesEarned.map((badge) => badge.id);

    await User.updateOne(
      { _id: userObjectId },
      {
        $addToSet: {
          badges: { $each: badgeIds },
        },
      }
    );

    await Promise.all(
      badgesEarned.map((badge) =>
        AwardNotification.create({
          userId: userObjectId,
          type: 'badge',
          badgeId: badge.id,
          badgeName: badge.name,
          badgeIcon: badge.icon,
          message: {
            en: `You earned a new badge: ${badge.name.en}`,
            he: `הרווחת באדג׳ חדש: ${badge.name.he}`,
          },
          sourceType: 'badge_system',
        })
      )
    );
  }

  return {
    newTotal: newTotalXP,
    newLevel,
    badgesEarned,
  };
}

