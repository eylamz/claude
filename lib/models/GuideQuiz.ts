import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocalizedText {
  en: string;
  he: string;
}

export interface IGuideQuizQuestionOption extends ILocalizedText {}

export interface IGuideQuizQuestion {
  id: string;
  question: ILocalizedText;
  options: IGuideQuizQuestionOption[];
  correctOptionIndex: number;
  explanation?: ILocalizedText;
  order: number;
}

export interface IGuideQuiz extends Document {
  guideId: mongoose.Types.ObjectId;
  guideSlug: string;
  questions: IGuideQuizQuestion[];
  passingScore: number;
  xpReward: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGuideQuizModel extends Model<IGuideQuiz> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const GuideQuizQuestionOptionSchema = new Schema<IGuideQuizQuestionOption>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const GuideQuizQuestionSchema = new Schema<IGuideQuizQuestion>(
  {
    id: { type: String, required: true, trim: true },
    question: { type: LocalizedTextSchema, required: true },
    options: { type: [GuideQuizQuestionOptionSchema], required: true },
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: LocalizedTextSchema, required: false },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const GuideQuizSchema = new Schema<IGuideQuiz>(
  {
    guideId: {
      type: Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    guideSlug: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    questions: {
      type: [GuideQuizQuestionSchema],
      required: true,
    },
    passingScore: {
      type: Number,
      default: 70,
    },
    xpReward: {
      type: Number,
      default: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const GuideQuiz: IGuideQuizModel =
  (mongoose.models.GuideQuiz as IGuideQuizModel) ||
  mongoose.model<IGuideQuiz, IGuideQuizModel>('GuideQuiz', GuideQuizSchema);

export default GuideQuiz;

