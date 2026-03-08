import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** Locale-keyed content (en/he). Legacy docs may have plain strings. */
export type ReviewContentByLocale = { en?: string; he?: string };

export interface IReview extends Document {
  entityType: 'skatepark';
  entityId: mongoose.Types.ObjectId;
  slug: string; // for quick lookup by slug
  userId?: mongoose.Types.ObjectId; // Optional for anonymous reviews
  /** User display name by locale. Legacy: may be a plain string (treated as en). */
  userName: string | ReviewContentByLocale;
  rating: number;
  /** Comment by locale. Legacy: may be a plain string (treated as en). */
  comment: string | ReviewContentByLocale;
  helpfulCount: number;
  /** User IDs who marked this review helpful (one vote per user). */
  helpfulByUserIds: mongoose.Types.ObjectId[];
  reportsCount: number;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewModel extends Model<IReview> {
  forSkatepark(slug: string, onlyApproved?: boolean): Promise<IReview[]>;
}

const ReviewSchema: Schema<IReview> = new Schema<IReview>(
  {
    entityType: {
      type: String,
      enum: ['skatepark'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      ref: 'Skatepark',
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for anonymous reviews
      index: true,
    },
    userName: {
      type: Schema.Types.Mixed,
      required: true,
      // Stored as { en?: string, he?: string } by locale. Legacy docs may have plain string.
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    comment: {
      type: Schema.Types.Mixed,
      required: false,
      // Stored as { en?: string, he?: string } by locale. Legacy docs may have plain string.
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    helpfulByUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      select: true,
    },
    reportsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.statics.forSkatepark = function (slug: string, onlyApproved: boolean = true) {
  const q: any = { slug: slug.toLowerCase(), entityType: 'skatepark' };
  if (onlyApproved) q.status = 'approved';
  return this.find(q).sort({ createdAt: -1 });
};

ReviewSchema.index({ slug: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ entityType: 1, entityId: 1, status: 1 });

// Delete the cached model if it exists to ensure schema changes take effect
if (mongoose.models.Review) {
  delete mongoose.models.Review;
}

const Review: IReviewModel = mongoose.model<IReview, IReviewModel>('Review', ReviewSchema);

export default Review;

