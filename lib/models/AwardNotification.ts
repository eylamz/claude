import mongoose, { Schema, Document, Model } from 'mongoose';

export type AwardNotificationType =
  | 'xp'
  | 'badge'
  | 'level_up'
  | 'streak'
  | 'king_crowned'
  | 'king_dethroned';

export interface ILocalizedText {
  en: string;
  he: string;
}

export interface IAwardNotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: AwardNotificationType;
  xpAmount?: number;
  badgeId?: string;
  badgeName?: ILocalizedText;
  badgeIcon?: string;
  levelId?: number;
  levelTitle?: ILocalizedText;
  message: ILocalizedText;
  isRead: boolean;
  readAt?: Date;
  sourceType: string;
  createdAt: Date;
}

export interface IAwardNotificationModel extends Model<IAwardNotification> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const AwardNotificationSchema = new Schema<IAwardNotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['xp', 'badge', 'level_up', 'streak', 'king_crowned', 'king_dethroned'],
    },
    xpAmount: {
      type: Number,
    },
    badgeId: {
      type: String,
      trim: true,
    },
    badgeName: {
      type: LocalizedTextSchema,
    },
    badgeIcon: {
      type: String,
      trim: true,
    },
    levelId: {
      type: Number,
    },
    levelTitle: {
      type: LocalizedTextSchema,
    },
    message: {
      type: LocalizedTextSchema,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    sourceType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AwardNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const AwardNotification: IAwardNotificationModel =
  (mongoose.models.AwardNotification as IAwardNotificationModel) ||
  mongoose.model<IAwardNotification, IAwardNotificationModel>('AwardNotification', AwardNotificationSchema);

export default AwardNotification;

