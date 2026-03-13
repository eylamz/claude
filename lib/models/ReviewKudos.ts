import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReviewKudos extends Document {
  giverUserId: mongoose.Types.ObjectId;
  receiverUserId: mongoose.Types.ObjectId;
  reviewId: mongoose.Types.ObjectId;
  skateparkId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IReviewKudosModel extends Model<IReviewKudos> {}

const ReviewKudosSchema = new Schema<IReviewKudos>(
  {
    giverUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    skateparkId: {
      type: Schema.Types.ObjectId,
      ref: 'Skatepark',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ReviewKudosSchema.index({ giverUserId: 1, reviewId: 1 }, { unique: true });

const ReviewKudos: IReviewKudosModel =
  (mongoose.models.ReviewKudos as IReviewKudosModel) ||
  mongoose.model<IReviewKudos, IReviewKudosModel>('ReviewKudos', ReviewKudosSchema);

export default ReviewKudos;

