import mongoose, { Schema, Document, Model } from 'mongoose';

export type AnalyticsEventType = 'page_view' | 'consent' | 'search_query' | 'search_click';

export type SearchEventSource = 'header' | 'sidebar' | 'search_page';

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';
export type ReferrerCategory = 'direct' | 'internal' | 'google' | 'social' | 'other';
/** Classified from User-Agent: user (browser), crawler (SEO/social), bot (scripts/headless), other */
export type VisitorType = 'user' | 'crawler' | 'bot' | 'other';
export type ConsentChoice =
  | 'accept_all'
  | 'reject_non_essential'
  | 'save_preferences'
  | 'il_consent_x'
  | 'il_consent_confirm';

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
  /** ISO 3166-1 alpha-2 country code from request IP (e.g. Vercel/Cloudflare headers) */
  country?: string;
  /** Classified from request User-Agent (user, crawler, bot, other) */
  visitorType?: VisitorType;
}

export interface IConsentEvent extends IAnalyticsEventBase {
  type: 'consent';
  choice: ConsentChoice;
  sessionId?: string;
  visitorType?: VisitorType;
}

export interface ISearchQueryEvent extends IAnalyticsEventBase {
  type: 'search_query';
  query: string;
  sessionId?: string;
  locale?: string;
  source?: SearchEventSource;
  visitorType?: VisitorType;
}

export interface ISearchClickEvent extends IAnalyticsEventBase {
  type: 'search_click';
  query?: string;
  resultType: string;
  resultId?: string;
  resultSlug: string;
  href?: string;
  sessionId?: string;
  locale?: string;
  source?: SearchEventSource;
  visitorType?: VisitorType;
}

export type IAnalyticsEvent = IPageViewEvent | IConsentEvent | ISearchQueryEvent | ISearchClickEvent;

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: {
      type: String,
      required: true,
      enum: ['page_view', 'consent', 'search_query', 'search_click'],
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
    country: { type: String },
    visitorType: { type: String, enum: ['user', 'crawler', 'bot', 'other'] },
    // consent fields
    choice: {
      type: String,
      enum: ['accept_all', 'reject_non_essential', 'save_preferences', 'il_consent_x', 'il_consent_confirm'],
    },
    // search_query fields
    query: { type: String },
    source: { type: String, enum: ['header', 'sidebar', 'search_page'] },
    // search_click fields
    resultType: { type: String },
    resultId: { type: String },
    resultSlug: { type: String },
    href: { type: String },
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
AnalyticsEventSchema.index({ type: 1, userId: 1 });
AnalyticsEventSchema.index({ type: 1, userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ type: 1, country: 1 });
AnalyticsEventSchema.index({ type: 1, visitorType: 1 });
AnalyticsEventSchema.index({ type: 1, query: 1 });
AnalyticsEventSchema.index({ type: 1, resultType: 1 });

// In dev, Next.js may cache the model with an old schema; ensure we use the latest enum (e.g. search_query, search_click)
if (mongoose.models?.AnalyticsEvent) {
  delete (mongoose.models as Record<string, Model<unknown>>).AnalyticsEvent;
}
const AnalyticsEvent: Model<IAnalyticsEvent> =
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEvent;
