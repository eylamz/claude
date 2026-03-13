import mongoose from 'mongoose';

import { featureFlags } from '../config/feature-flags';
import SkateparkKing from '../models/SkateparkKing';
import Skatepark from '../models/Skatepark';
import SkateparkCheckin from '../models/SkateparkCheckin';
import AwardNotification from '../models/AwardNotification';
import User from '../models/User';

export async function updateKingForSkatepark(
  skateparkId: string,
  skateparkSlug: string,
  month: string
): Promise<void> {
  if (!featureFlags.skateparkKing) {
    return;
  }

  const skateparkObjectId = new mongoose.Types.ObjectId(skateparkId);

  const aggregation = await SkateparkCheckin.aggregate<{
    _id: mongoose.Types.ObjectId;
    checkins: number;
  }>([
    {
      $match: {
        skateparkId: skateparkObjectId,
        isoMonth: month,
        isVerified: true,
      },
    },
    {
      $group: {
        _id: '$userId',
        checkins: { $sum: 1 },
      },
    },
    {
      $sort: { checkins: -1 },
    },
    {
      $limit: 1,
    },
  ]);

  if (aggregation.length === 0) {
    return;
  }

  const leader = aggregation[0];

  const user = await User.findById(leader._id).select('username profilePhoto');
  if (!user || !user.username) {
    return;
  }

  let kingDoc = await SkateparkKing.findOne({
    skateparkId: skateparkObjectId,
    month,
  });

  const now = new Date();

  if (!kingDoc) {
    kingDoc = await SkateparkKing.create({
      skateparkId: skateparkObjectId,
      skateparkSlug,
      currentKingUserId: leader._id,
      currentKingUsername: user.username,
      currentKingPhoto: user.profilePhoto,
      currentKingCheckins: leader.checkins,
      crownedAt: now,
      month,
      history: [],
    });

    await AwardNotification.create({
      userId: leader._id,
      type: 'king_crowned',
      message: {
        en: `You are the King of ${skateparkSlug} for ${month}!`,
        he: `את/ה המלך של ${skateparkSlug} לחודש ${month}!`,
      },
      sourceType: 'skatepark_king',
    });
  } else {
    const previousKingUserId = kingDoc.currentKingUserId;
    const previousKingUsername = kingDoc.currentKingUsername;
    const previousCheckins = kingDoc.currentKingCheckins;

    if (!previousKingUserId.equals(leader._id)) {
      kingDoc.history.push({
        userId: previousKingUserId,
        username: previousKingUsername,
        month: kingDoc.month,
        checkins: previousCheckins,
      });

      kingDoc.currentKingUserId = leader._id;
      kingDoc.currentKingUsername = user.username;
      kingDoc.currentKingPhoto = user.profilePhoto;
      kingDoc.currentKingCheckins = leader.checkins;
      kingDoc.crownedAt = now;

      await kingDoc.save();

      await AwardNotification.create({
        userId: leader._id,
        type: 'king_crowned',
        message: {
          en: `You are the King of ${skateparkSlug} for ${month}!`,
          he: `את/ה המלך של ${skateparkSlug} לחודש ${month}!`,
        },
        sourceType: 'skatepark_king',
      });

      await AwardNotification.create({
        userId: previousKingUserId,
        type: 'king_dethroned',
        message: {
          en: `You have been dethroned as King of ${skateparkSlug} for ${month}.`,
          he: `הודחת ממעמד המלך של ${skateparkSlug} לחודש ${month}.`,
        },
        sourceType: 'skatepark_king',
      });
    } else {
      kingDoc.currentKingCheckins = leader.checkins;
      await kingDoc.save();
    }
  }

  await Skatepark.updateOne(
    { _id: skateparkObjectId },
    {
      $set: {
        currentKingUserId: leader._id,
        currentKingUsername: user.username,
        currentKingPhoto: user.profilePhoto,
      },
    }
  );
}

