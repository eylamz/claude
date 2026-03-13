import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISkateparkKingHistoryItem {
  userId: mongoose.Types.ObjectId;
  username: string;
  month: string;
  checkins: number;
}

export interface ISkateparkKing extends Document {
  skateparkId: mongoose.Types.ObjectId;
  skateparkSlug: string;
  currentKingUserId: mongoose.Types.ObjectId;
  currentKingUsername: string;
  currentKingPhoto?: string;
  currentKingCheckins: number;
  crownedAt: Date;
  month: string;
  history: ISkateparkKingHistoryItem[];
  updatedAt: Date;
}

export interface ISkateparkKingModel extends Model<ISkateparkKing> {}

const SkateparkKingHistoryItemSchema = new Schema<ISkateparkKingHistoryItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    checkins: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const SkateparkKingSchema = new Schema<ISkateparkKing>(
  {
    skateparkId: {
      type: Schema.Types.ObjectId,
      ref: 'Skatepark',
      required: true,
    },
    skateparkSlug: {
      type: String,
      required: true,
      trim: true,
    },
    currentKingUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentKingUsername: {
      type: String,
      required: true,
      trim: true,
    },
    currentKingPhoto: {
      type: String,
      trim: true,
    },
    currentKingCheckins: {
      type: Number,
      required: true,
    },
    crownedAt: {
      type: Date,
      required: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    history: {
      type: [SkateparkKingHistoryItemSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

SkateparkKingSchema.index({ skateparkId: 1, month: 1 }, { unique: true });

const SkateparkKing: ISkateparkKingModel =
  (mongoose.models.SkateparkKing as ISkateparkKingModel) ||
  mongoose.model<ISkateparkKing, ISkateparkKingModel>('SkateparkKing', SkateparkKingSchema);

export default SkateparkKing;

