import mongoose, { Schema, Document, Model } from 'mongoose';

export type NewsletterSource = 'footer';

export interface INewsletterSubscriber extends Document {
  email: string;
  source?: NewsletterSource;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema: Schema<INewsletterSubscriber> = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['footer'],
      default: 'footer',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.NewsletterSubscriber ||
  mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema);
