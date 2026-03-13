import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGuideQuizAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  guideId: mongoose.Types.ObjectId;
  guideSlug: string;
  quizId: mongoose.Types.ObjectId;
  answers: number[];
  score: number;
  passed: boolean;
  xpAwarded: boolean;
  xpAmount: number;
  attemptNumber: number;
  completedAt?: Date;
  createdAt: Date;
}

export interface IGuideQuizAttemptModel extends Model<IGuideQuizAttempt> {}

const GuideQuizAttemptSchema = new Schema<IGuideQuizAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    guideId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Guide',
      index: true,
    },
    guideSlug: {
      type: String,
      required: true,
      trim: true,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'GuideQuiz',
    },
    answers: {
      type: [Number],
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    xpAwarded: {
      type: Boolean,
      default: false,
    },
    xpAmount: {
      type: Number,
      default: 0,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

GuideQuizAttemptSchema.index({ userId: 1, guideId: 1 });

const GuideQuizAttempt: IGuideQuizAttemptModel =
  (mongoose.models.GuideQuizAttempt as IGuideQuizAttemptModel) ||
  mongoose.model<IGuideQuizAttempt, IGuideQuizAttemptModel>('GuideQuizAttempt', GuideQuizAttemptSchema);

export default GuideQuizAttempt;

