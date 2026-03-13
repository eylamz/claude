import mongoose, { Schema, Document, Model } from 'mongoose';

export type XPEventType =
  | 'skatepark_checkin'
  | 'guide_quiz_passed'
  | 'event_signup'
  | 'event_winner_approved'
  | 'survey_completed'
  | 'review_written'
  | 'kudos_received'
  | 'kudos_given'
  | 'weekly_challenge_completed'
  | 'streak_bonus_weekly'
  | 'streak_bonus_monthly'
  | 'pioneer_bonus'
  | 'admin_adjustment';

export interface IXPEvent extends Document {
  userId: mongoose.Types.ObjectId;
  type: XPEventType;
  xpAmount: number;
  multiplierApplied?: number;
  baseXP?: number;
  sourceId?: mongoose.Types.ObjectId;
  sourceType?: string;
  seasonId?: string;
  meta?: Record<string, any>;
  awardedBadgeIds?: string[];
  createdAt: Date;
}

export interface IXPEventModel extends Model<IXPEvent> {}

const XPEventSchema = new Schema<IXPEvent>(
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
      enum: [
        'skatepark_checkin',
        'guide_quiz_passed',
        'event_signup',
        'event_winner_approved',
        'survey_completed',
        'review_written',
        'kudos_received',
        'kudos_given',
        'weekly_challenge_completed',
        'streak_bonus_weekly',
        'streak_bonus_monthly',
        'pioneer_bonus',
        'admin_adjustment',
      ],
    },
    xpAmount: {
      type: Number,
      required: true,
    },
    multiplierApplied: {
      type: Number,
    },
    baseXP: {
      type: Number,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
    },
    sourceType: {
      type: String,
      trim: true,
    },
    seasonId: {
      type: String,
      trim: true,
    },
    meta: {
      type: Schema.Types.Mixed,
    },
    awardedBadgeIds: {
      type: [String],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

XPEventSchema.index({ userId: 1, createdAt: -1 });
XPEventSchema.index({ userId: 1, type: 1 });

const XPEvent: IXPEventModel =
  (mongoose.models.XPEvent as IXPEventModel) ||
  mongoose.model<IXPEvent, IXPEventModel>('XPEvent', XPEventSchema);

export default XPEvent;

