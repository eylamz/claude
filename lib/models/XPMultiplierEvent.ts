import mongoose, { Schema, Document, Model } from 'mongoose';

import { XPEventType } from './XPEvent';

export interface ILocalizedText {
  en: string;
  he: string;
}

export interface IXPMultiplierEvent extends Document {
  title: ILocalizedText;
  description?: ILocalizedText;
  multiplier: number;
  appliesTo: (XPEventType | 'all')[];
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IXPMultiplierEventModel extends Model<IXPMultiplierEvent> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const XPMultiplierEventSchema = new Schema<IXPMultiplierEvent>(
  {
    title: {
      type: LocalizedTextSchema,
      required: true,
    },
    description: {
      type: LocalizedTextSchema,
      required: false,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 1,
    },
    appliesTo: {
      type: [String],
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
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

XPMultiplierEventSchema.index({ startsAt: 1, endsAt: 1, isActive: 1 });

const XPMultiplierEvent: IXPMultiplierEventModel =
  (mongoose.models.XPMultiplierEvent as IXPMultiplierEventModel) ||
  mongoose.model<IXPMultiplierEvent, IXPMultiplierEventModel>(
    'XPMultiplierEvent',
    XPMultiplierEventSchema
  );

export default XPMultiplierEvent;

