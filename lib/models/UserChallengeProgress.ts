import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserChallengeProgress extends Document {
  userId: mongoose.Types.ObjectId;
  weekId: string;
  challengeId: string;
  currentCount: number;
  isCompleted: boolean;
  completedAt?: Date;
  xpAwarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserChallengeProgressModel extends Model<IUserChallengeProgress> {}

const UserChallengeProgressSchema = new Schema<IUserChallengeProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    weekId: {
      type: String,
      required: true,
      trim: true,
    },
    challengeId: {
      type: String,
      required: true,
      trim: true,
    },
    currentCount: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    xpAwarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

UserChallengeProgressSchema.index(
  { userId: 1, weekId: 1, challengeId: 1 },
  { unique: true }
);

const UserChallengeProgress: IUserChallengeProgressModel =
  (mongoose.models.UserChallengeProgress as IUserChallengeProgressModel) ||
  mongoose.model<IUserChallengeProgress, IUserChallengeProgressModel>(
    'UserChallengeProgress',
    UserChallengeProgressSchema
  );

export default UserChallengeProgress;

