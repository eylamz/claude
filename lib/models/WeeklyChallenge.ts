import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocalizedText {
  en: string;
  he: string;
}

export interface IWeeklyChallengeItem {
  id: string;
  title: ILocalizedText;
  description: ILocalizedText;
  actionType: string;
  targetCount: number;
  xpReward: number;
  icon: string;
}

export interface IWeeklyChallenge extends Document {
  weekId: string;
  challenges: IWeeklyChallengeItem[];
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
}

export interface IWeeklyChallengeModel extends Model<IWeeklyChallenge> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const WeeklyChallengeItemSchema = new Schema<IWeeklyChallengeItem>(
  {
    id: { type: String, required: true, trim: true },
    title: { type: LocalizedTextSchema, required: true },
    description: { type: LocalizedTextSchema, required: true },
    actionType: { type: String, required: true, trim: true },
    targetCount: { type: Number, required: true },
    xpReward: { type: Number, required: true },
    icon: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const WeeklyChallengeSchema = new Schema<IWeeklyChallenge>(
  {
    weekId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    challenges: {
      type: [WeeklyChallengeItemSchema],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const WeeklyChallenge: IWeeklyChallengeModel =
  (mongoose.models.WeeklyChallenge as IWeeklyChallengeModel) ||
  mongoose.model<IWeeklyChallenge, IWeeklyChallengeModel>('WeeklyChallenge', WeeklyChallengeSchema);

export default WeeklyChallenge;

