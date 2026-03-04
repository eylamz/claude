import mongoose, { Schema, Document } from 'mongoose';

export type NewsletterSource = 'footer';
export type NewsletterLocale = 'he' | 'en';

export interface INewsletterSubscriber extends Document {
  email: string;
  locale: NewsletterLocale;
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
      index: true,
    },
    locale: {
      type: String,
      enum: ['he', 'en'],
      default: 'en',
      required: true,
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

NewsletterSubscriberSchema.index({ email: 1, locale: 1 }, { unique: true });

export default mongoose.models.NewsletterSubscriber ||
  mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema);
