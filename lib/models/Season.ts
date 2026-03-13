import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocalizedText {
  en: string;
  he: string;
}

export interface ISeasonReward {
  rank: number;
  badgeId: string;
  xpBonus: number;
}

export interface ISeason extends Document {
  id: string;
  title: ILocalizedText;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  topIndividuals?: any;
  topCrews?: any;
  rewards: ISeasonReward[];
  createdAt: Date;
}

export interface ISeasonModel extends Model<ISeason> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const SeasonRewardSchema = new Schema<ISeasonReward>(
  {
    rank: { type: Number, required: true },
    badgeId: { type: String, required: true, trim: true },
    xpBonus: { type: Number, required: true },
  },
  { _id: false }
);

const SeasonSchema = new Schema<ISeason>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: LocalizedTextSchema,
      required: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    topIndividuals: {
      type: Schema.Types.Mixed,
    },
    topCrews: {
      type: Schema.Types.Mixed,
    },
    rewards: {
      type: [SeasonRewardSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Season: ISeasonModel =
  (mongoose.models.Season as ISeasonModel) ||
  mongoose.model<ISeason, ISeasonModel>('Season', SeasonSchema);

export default Season;

