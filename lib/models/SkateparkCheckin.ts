import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface ISkateparkCheckin extends Document {
  userId: mongoose.Types.ObjectId;
  skateparkId: mongoose.Types.ObjectId;
  skateparkSlug: string;
  checkInAt: Date;
  checkOutAt?: Date;
  durationMinutes?: number;
  coordinates?: ICoordinates;
  isVerified: boolean;
  xpAwarded: boolean;
  xpAmount: number;
  isPioneer: boolean;
  isoWeek: string;
  isoMonth: string;
  createdAt: Date;
}

export interface ISkateparkCheckinModel extends Model<ISkateparkCheckin> {}

const CoordinatesSchema = new Schema<ICoordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const SkateparkCheckinSchema = new Schema<ISkateparkCheckin>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
    checkInAt: {
      type: Date,
      required: true,
    },
    checkOutAt: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
    },
    coordinates: {
      type: CoordinatesSchema,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    xpAwarded: {
      type: Boolean,
      default: false,
    },
    xpAmount: {
      type: Number,
      default: 0,
    },
    isPioneer: {
      type: Boolean,
      default: false,
    },
    isoWeek: {
      type: String,
      required: true,
      trim: true,
    },
    isoMonth: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SkateparkCheckinSchema.index({ userId: 1, skateparkId: 1, isoWeek: 1 });
SkateparkCheckinSchema.index({ skateparkId: 1, createdAt: -1 });
SkateparkCheckinSchema.index({ userId: 1, skateparkId: 1, isoWeek: 1 }, { unique: true });

const SkateparkCheckin: ISkateparkCheckinModel =
  (mongoose.models.SkateparkCheckin as ISkateparkCheckinModel) ||
  mongoose.model<ISkateparkCheckin, ISkateparkCheckinModel>('SkateparkCheckin', SkateparkCheckinSchema);

export default SkateparkCheckin;

