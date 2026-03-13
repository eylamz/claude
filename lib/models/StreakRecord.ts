import mongoose, { Schema, Document, Model } from 'mongoose';

export type StreakType = 'weekly' | 'monthly';

export interface IStreakRecord extends Document {
  userId: mongoose.Types.ObjectId;
  type: StreakType;
  period: string;
  hoursLogged: number;
  metThreshold: boolean;
  streakCountAtEnd: number;
  bonusXPAwarded: boolean;
  createdAt: Date;
}

export interface IStreakRecordModel extends Model<IStreakRecord> {}

const StreakRecordSchema = new Schema<IStreakRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['weekly', 'monthly'],
    },
    period: {
      type: String,
      required: true,
      trim: true,
    },
    hoursLogged: {
      type: Number,
      default: 0,
    },
    metThreshold: {
      type: Boolean,
      default: false,
    },
    streakCountAtEnd: {
      type: Number,
      default: 0,
    },
    bonusXPAwarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StreakRecordSchema.index({ userId: 1, type: 1, period: 1 }, { unique: true });

const StreakRecord: IStreakRecordModel =
  (mongoose.models.StreakRecord as IStreakRecordModel) ||
  mongoose.model<IStreakRecord, IStreakRecordModel>('StreakRecord', StreakRecordSchema);

export default StreakRecord;

