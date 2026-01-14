import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IReview extends Document {
  entityType: 'skatepark';
  entityId: mongoose.Types.ObjectId;
  slug: string; // for quick lookup by slug
  userId?: mongoose.Types.ObjectId; // Optional for anonymous reviews
  userName: string;
  rating: number;
  comment: string;
  helpfulCount: number;
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
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    comment: {
      type: String,
      required: false,
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
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

