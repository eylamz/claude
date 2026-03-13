import mongoose, { Schema, Document, Model } from 'mongoose';

export type BadgeCategory =
  | 'location'
  | 'guides'
  | 'events'
  | 'reviews'
  | 'surveys'
  | 'signups'
  | 'streaks'
  | 'social'
  | 'crews'
  | 'special';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ILocalizedText {
  en: string;
  he: string;
}

export type BadgeTriggerType =
  | { type: 'count'; action: string; threshold: number }
  | { type: 'streak'; streakType: 'weekly' | 'monthly'; threshold: number }
  | { type: 'pioneer' }
  | { type: 'king' }
  | { type: 'manual' };

export interface IBadgeDefinition extends Document {
  id: string;
  name: ILocalizedText;
  description: ILocalizedText;
  icon: string;
  category: BadgeCategory;
  trigger: BadgeTriggerType;
  xpReward: number;
  rarity: BadgeRarity;
  isActive: boolean;
  createdAt: Date;
}

export interface IBadgeDefinitionModel extends Model<IBadgeDefinition> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BadgeDefinitionSchema = new Schema<IBadgeDefinition>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: LocalizedTextSchema,
      required: true,
    },
    description: {
      type: LocalizedTextSchema,
      required: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'location',
        'guides',
        'events',
        'reviews',
        'surveys',
        'signups',
        'streaks',
        'social',
        'crews',
        'special',
      ],
    },
    trigger: {
      type: Schema.Types.Mixed,
      required: true,
    },
    xpReward: {
      type: Number,
      required: true,
      min: 0,
    },
    rarity: {
      type: String,
      required: true,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

BadgeDefinitionSchema.index({ category: 1, rarity: 1, isActive: 1 });

const BadgeDefinition: IBadgeDefinitionModel =
  (mongoose.models.BadgeDefinition as IBadgeDefinitionModel) ||
  mongoose.model<IBadgeDefinition, IBadgeDefinitionModel>('BadgeDefinition', BadgeDefinitionSchema);

export default BadgeDefinition;

