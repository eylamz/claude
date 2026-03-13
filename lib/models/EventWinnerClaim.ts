import mongoose, { Schema, Document, Model } from 'mongoose';

export type EventWinnerPlacement = '1st' | '2nd' | '3rd' | 'participant';
export type EventWinnerClaimStatus = 'pending' | 'approved' | 'rejected';

export interface IEventWinnerClaim extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  eventSlug: string;
  placement: EventWinnerPlacement;
  sport: string;
  category?: string;
  proofDescription: string;
  proofImages?: string[];
  status: EventWinnerClaimStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  xpAwarded: boolean;
  xpAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventWinnerClaimModel extends Model<IEventWinnerClaim> {}

const EventWinnerClaimSchema = new Schema<IEventWinnerClaim>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    eventId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Event',
    },
    eventSlug: {
      type: String,
      required: true,
      trim: true,
    },
    placement: {
      type: String,
      required: true,
      enum: ['1st', '2nd', '3rd', 'participant'],
    },
    sport: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    proofDescription: {
      type: String,
      required: true,
      trim: true,
    },
    proofImages: {
      type: [String],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    xpAwarded: {
      type: Boolean,
      default: false,
    },
    xpAmount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const EventWinnerClaim: IEventWinnerClaimModel =
  (mongoose.models.EventWinnerClaim as IEventWinnerClaimModel) ||
  mongoose.model<IEventWinnerClaim, IEventWinnerClaimModel>('EventWinnerClaim', EventWinnerClaimSchema);

export default EventWinnerClaim;

