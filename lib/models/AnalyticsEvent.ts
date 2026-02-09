import mongoose, { Schema, Document, Model } from 'mongoose';

export type AnalyticsEventType = 'page_view' | 'consent';

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';
export type ReferrerCategory = 'direct' | 'internal' | 'google' | 'social' | 'other';
export type ConsentChoice = 'accept_all' | 'reject_non_essential' | 'save_preferences';

export interface IAnalyticsEventBase extends Document {
  type: AnalyticsEventType;
  timestamp: Date;
  createdAt?: Date;
}

export interface IPageViewEvent extends IAnalyticsEventBase {
  type: 'page_view';
  sessionId: string;
  path: string;
  locale?: string;
  timeOnPageMs?: number;
  deviceType?: string;
  deviceCategory?: DeviceCategory;
  referrer?: string;
  referrerCategory?: ReferrerCategory;
  userId?: string;
}

export interface IConsentEvent extends IAnalyticsEventBase {
  type: 'consent';
  choice: ConsentChoice;
  sessionId?: string;
}

export type IAnalyticsEvent = IPageViewEvent | IConsentEvent;

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: {
      type: String,
      required: true,
      enum: ['page_view', 'consent'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // page_view fields
    sessionId: { type: String },
    path: { type: String },
    locale: { type: String },
    timeOnPageMs: { type: Number },
    deviceType: { type: String },
    deviceCategory: { type: String, enum: ['mobile', 'tablet', 'desktop'] },
    referrer: { type: String },
    referrerCategory: { type: String, enum: ['direct', 'internal', 'google', 'social', 'other'] },
    userId: { type: String },
    // consent fields
    choice: { type: String, enum: ['accept_all', 'reject_non_essential', 'save_preferences'] },
  },
  {
    timestamps: true,
    collection: 'analytics_events',
  }
);

// Indexes for aggregation queries
AnalyticsEventSchema.index({ type: 1, timestamp: -1 });
AnalyticsEventSchema.index({ type: 1, path: 1 });
AnalyticsEventSchema.index({ type: 1, sessionId: 1 });
AnalyticsEventSchema.index({ type: 1, choice: 1 });
AnalyticsEventSchema.index({ type: 1, referrerCategory: 1 });
AnalyticsEventSchema.index({ type: 1, deviceCategory: 1 });
AnalyticsEventSchema.index({ type: 1, deviceType: 1 });

const AnalyticsEvent: Model<IAnalyticsEvent> =
  (mongoose.models?.AnalyticsEvent as Model<IAnalyticsEvent>) ??
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEvent;
