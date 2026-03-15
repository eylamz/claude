import mongoose from 'mongoose';

import { featureFlags, serverFlags } from '../config/feature-flags';
import User from '../models/User';
import StreakRecord from '../models/StreakRecord';
import AwardNotification from '../models/AwardNotification';
import { awardXP } from './xp.service';

export async function addCheckinHours(
  userId: string,
  durationMinutes: number,
  isoWeek: string,
  isoMonth: string
): Promise<void> {
  if (!featureFlags.streaks) {
    return;
  }

  const hours = durationMinutes / 60;

  await User.updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    {
      $inc: {
        'streak.weeklyHoursThisWeek': hours,
        'streak.monthlyHoursThisMonth': hours,
      },
      $set: {
        'streak.lastActiveWeek': isoWeek,
        'streak.lastActiveMonth': isoMonth,
      },
    }
  );
}

export async function processWeeklyStreaks(): Promise<void> {
  if (!featureFlags.streaks || !featureFlags.xpSystem) {
    return;
  }

  const users = await User.find().select('streak totalXP');

  for (const user of users) {
    const hours = user.streak.weeklyHoursThisWeek;
    const metThreshold = hours >= serverFlags.streakWeeklyMinHours;

    if (metThreshold) {
      const currentStreak = user.streak.currentWeeklyStreak + 1;
      const longestStreak = Math.max(user.streak.longestWeeklyStreak, currentStreak);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'streak.currentWeeklyStreak': currentStreak,
            'streak.longestWeeklyStreak': longestStreak,
            'streak.weeklyHoursThisWeek': 0,
          },
        }
      );

      await StreakRecord.create({
        userId: user._id,
        type: 'weekly',
        period: user.streak.lastActiveWeek,
        hoursLogged: hours,
        metThreshold: true,
        streakCountAtEnd: currentStreak,
        bonusXPAwarded: true,
      });

      await awardXP({
        userId: String(user._id),
        type: 'streak_bonus_weekly',
        xpAmount: serverFlags.xpStreakWeeklyBonus,
        sourceType: 'streak_system',
        meta: {
          period: user.streak.lastActiveWeek,
          streakCount: currentStreak,
        },
      });

      await AwardNotification.create({
        userId: user._id,
        type: 'streak',
        xpAmount: serverFlags.xpStreakWeeklyBonus,
        message: {
          en: `Weekly streak continued for ${currentStreak} weeks!`,
          he: `סטריק שבועי נמשך במשך ${currentStreak} שבועות!`,
        },
        sourceType: 'streak_system',
      });
    } else {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'streak.currentWeeklyStreak': 0,
            'streak.weeklyHoursThisWeek': 0,
          },
        }
      );

      await StreakRecord.create({
        userId: user._id,
        type: 'weekly',
        period: user.streak.lastActiveWeek,
        hoursLogged: hours,
        metThreshold: false,
        streakCountAtEnd: 0,
        bonusXPAwarded: false,
      });
    }
  }
}

export async function processMonthlyStreaks(): Promise<void> {
  if (!featureFlags.streaks || !featureFlags.xpSystem) {
    return;
  }

  const users = await User.find().select('streak totalXP');

  for (const user of users) {
    const hours = user.streak.monthlyHoursThisMonth;
    const metThreshold = hours >= serverFlags.streakMonthlyMinHours;

    if (metThreshold) {
      const currentStreak = user.streak.currentMonthlyStreak + 1;
      const longestStreak = Math.max(user.streak.longestMonthlyStreak, currentStreak);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'streak.currentMonthlyStreak': currentStreak,
            'streak.longestMonthlyStreak': longestStreak,
            'streak.monthlyHoursThisMonth': 0,
          },
        }
      );

      await StreakRecord.create({
        userId: user._id,
        type: 'monthly',
        period: user.streak.lastActiveMonth,
        hoursLogged: hours,
        metThreshold: true,
        streakCountAtEnd: currentStreak,
        bonusXPAwarded: true,
      });

      await awardXP({
        userId: String(user._id),
        type: 'streak_bonus_monthly',
        xpAmount: serverFlags.xpStreakMonthlyBonus,
        sourceType: 'streak_system',
        meta: {
          period: user.streak.lastActiveMonth,
          streakCount: currentStreak,
        },
      });

      await AwardNotification.create({
        userId: user._id,
        type: 'streak',
        xpAmount: serverFlags.xpStreakMonthlyBonus,
        message: {
          en: `Monthly streak continued for ${currentStreak} months!`,
          he: `סטריק חודשי נמשך במשך ${currentStreak} חודשים!`,
        },
        sourceType: 'streak_system',
      });
    } else {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'streak.currentMonthlyStreak': 0,
            'streak.monthlyHoursThisMonth': 0,
          },
        }
      );

      await StreakRecord.create({
        userId: user._id,
        type: 'monthly',
        period: user.streak.lastActiveMonth,
        hoursLogged: hours,
        metThreshold: false,
        streakCountAtEnd: 0,
        bonusXPAwarded: false,
      });
    }
  }
}

