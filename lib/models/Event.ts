import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface (e.g. for SEO)
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

// Content section interface for events
export interface IEventContentSection {
  type: 'intro' | 'heading' | 'text' | 'list' | 'image' | 'divider' | 'info-box';
  order: number;
  level?: number; // for headings (h1, h2, h3, etc.)
  content?: string;
  listType?: 'bullet' | 'numbered';
  items?: Array<{
    title: string;
    content: string;
  }>;
  data?: {
    url: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
  };
  links?: Array<{
    text: string;
    url: string;
    target?: string;
  }>;
  boxStyle?: 'info' | 'warning' | 'highlight'; // for info-box type
}

// Event media asset interface
export interface IEventMediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  cloudinaryId?: string;
  altText: {
    he: string;
    en: string;
  };
  caption?: {
    he: string;
    en: string;
  };
  usedInSections: string[];
  width?: number;
  height?: number;
}

// Event localized content interface
export interface IEventLocalizedContent {
  title: string;
  description: string;
  tags: string[];
  sections: IEventContentSection[];
}

// Event location interface with localization
export interface IEventLocation {
  name: {
    he: string;
    en: string;
  };
  address?: {
    he: string;
    en: string;
  };
  url?: string; // Optional link to location (Google Maps, venue website, etc.)
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Event date/time interface with localization
export interface IEventDateTime {
  startDate: Date;
  endDate?: Date;
  startTime?: string; // e.g., "18:00"
  endTime?: string;   // e.g., "22:00"
  timezone: {
    he: string;
    en: string;
  };
}

/** Allowed values for event related sports (same as Guide) */
export const EVENT_RELATED_SPORTS = ['roller', 'skate', 'scoot', 'bmx', 'longboard'] as const;
export type EventRelatedSport = (typeof EVENT_RELATED_SPORTS)[number];

/** Event signup form field option (for select/checkbox); linkUrl makes the option label a link e.g. privacy policy */
export interface IEventSignupFormFieldOption {
  value: string;
  label: { en: string; he: string };
  linkUrl?: string;
}

/** Event signup form field definition (admin-configured, used on public signup page) */
export interface IEventSignupFormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox';
  label: { en: string; he: string };
  required?: boolean;
  placeholder?: { en: string; he: string };
  options?: IEventSignupFormFieldOption[];
  order?: number;
  /** For number fields: min/max value; for text: min/max length */
  validation?: { min?: number; max?: number };
}

/** Event signup form config (stored on Event, controls public registration form) */
export interface IEventSignupForm {
  title: { en: string; he: string };
  description?: { en: string; he: string };
  fields: IEventSignupFormField[];
  /** When true, show a required "I accept the Event Rules" checkbox (link opens rules modal). Hides the standalone "View event rules" button. */
  showEventRulesCheckbox?: boolean;
  /** When true, show a required "I agree to the Privacy Policy" checkbox. */
  showPrivacyCheckbox?: boolean;
  /** URL for privacy policy link when showPrivacyCheckbox is true. If empty, uses /[locale]/privacy. */
  privacyPolicyUrl?: string;
}

/** Event rules (e.g. participation rules) – shown on signup page in a modal */
export interface IEventRules {
  en: string;
  he: string;
}

// Main Event interface
export interface IEvent extends Document {
  slug: string;
  relatedSports: string[];
  type: 'competition' | 'session' | 'camp' | 'premiere' | 'jam' | 'workshop' | 'event' | 'meetup';
  status: 'draft' | 'published' | 'archived' | 'cancelled';
  isFeatured: boolean;
  
  // Event timing
  dateTime: IEventDateTime;
  
  // Event location
  location: IEventLocation;
  
  // Engagement metrics
  viewCount: number;
  interestedCount: number; // people who marked "interested"
  attendingCount: number;  // people who marked "attending"
  
  // Localized content
  content: {
    he: IEventLocalizedContent;
    en: IEventLocalizedContent;
  };
  
  // Media management
  media: IEventMediaAsset[];
  featuredImage: {
    url: string;
    cloudinaryId?: string;
    altText: {
      he: string;
      en: string;
    };
  };
  
  // SEO and search
  searchableText: string;
  
  // SEO
  metaTitle?: ILocalizedField;
  metaDescription?: ILocalizedField;
  metaKeywords?: ILocalizedField;
  
  // Event specific fields
  isOnline: boolean;
  isFree: boolean;
  registrationRequired: boolean;
  registrationUrl?: string;
  /** After this date/time, registration is closed even if the event has not started yet. */
  registrationClosesAt?: Date;
  /** Admin-configured signup form (fields, labels). When set, public signup page uses this instead of defaults. */
  signupForm?: IEventSignupForm;
  /** Event rules (participation rules) – editable in signup-form admin, shown in modal on public signup page. */
  eventRules?: IEventRules;

  // Timestamps (from mongoose timestamps)
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  getDurationHours(): number;
  isUpcoming(): boolean;
  isPast(): boolean;
  getAttendanceRate(): number;
}

// Event Model interface with static methods
export interface IEventModel extends Model<IEvent> {
  findBySlug(slug: string): Promise<IEvent | null>;
  findUpcoming(): Promise<IEvent[]>;
  findPast(): Promise<IEvent[]>;
  findFeatured(): Promise<IEvent[]>;
  findByRelatedSport(sport: string): Promise<IEvent[]>;
  findPublished(): Promise<IEvent[]>;
  searchEvents(query: string): Promise<IEvent[]>;
}

// Schema definition
const EventContentSectionSchema = new Schema<IEventContentSection>({
  type: { 
    type: String, 
    required: true, 
    enum: ['intro', 'heading', 'text', 'list', 'image', 'divider', 'info-box'] 
  },
  order: { type: Number, required: true },
  level: { type: Number },
  content: { type: String },
  listType: { type: String, enum: ['bullet', 'numbered'] },
  items: [{
    title: { type: String, required: true },
    content: { type: String, required: true }
  }],
  data: {
    url: { type: String },
    alt: { type: String },
    caption: { type: String },
    width: { type: Number },
    height: { type: Number }
  },
  links: [{
    text: { type: String, required: true },
    url: { type: String, required: true },
    target: { type: String }
  }],
  boxStyle: { type: String, enum: ['info', 'warning', 'highlight'] }
}, { _id: false });

const EventMediaAssetSchema = new Schema<IEventMediaAsset>({
  id: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true, enum: ['image', 'video'] },
  cloudinaryId: { type: String },
  altText: {
    he: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  caption: {
    he: { type: String },
    en: { type: String }
  },
  usedInSections: [{ type: String }],
  width: { type: Number },
  height: { type: Number }
}, { _id: false });

const EventLocalizedContentSchema = new Schema<IEventLocalizedContent>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  sections: [EventContentSectionSchema]
}, { _id: false });

const EventLocationSchema = new Schema<IEventLocation>({
  name: {
    he: { type: String, required: true },
    en: { type: String, required: true }
  },
  address: {
    he: { type: String },
    en: { type: String }
  },
  url: { type: String }, // Link to location
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, { _id: false });

const EventDateTimeSchema = new Schema<IEventDateTime>({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  timezone: {
    he: { type: String, required: true, default: 'אסיה/ירושלים' },
    en: { type: String, required: true, default: 'Asia/Jerusalem' }
  }
}, { _id: false });

const EventSchema = new Schema<IEvent>(
  {
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    relatedSports: {
      type: [{ type: String, trim: true, enum: EVENT_RELATED_SPORTS }],
      default: [],
    },
    type: { 
      type: String, 
      required: true, 
      enum: ['competition', 'session', 'camp', 'premiere', 'jam', 'workshop', 'event', 'meetup'] 
    },
    status: { 
      type: String, 
      required: true, 
      enum: ['draft', 'published', 'archived', 'cancelled'], 
      default: 'draft' 
    },
    isFeatured: { type: Boolean, default: false },
    
    // Event timing
    dateTime: { type: EventDateTimeSchema, required: true },
    
    // Event location
    location: { type: EventLocationSchema, required: true },
    
    // Engagement metrics
    viewCount: { type: Number, default: 0, min: 0 },
    interestedCount: { type: Number, default: 0, min: 0 },
    attendingCount: { type: Number, default: 0, min: 0 },
    
    // Localized content
    content: {
      he: { type: EventLocalizedContentSchema, required: true },
      en: { type: EventLocalizedContentSchema, required: true }
    },
    
    // Media management
    media: [EventMediaAssetSchema],
    featuredImage: {
      url: { type: String, required: true },
      cloudinaryId: { type: String },
      altText: {
        he: { type: String, required: true },
        en: { type: String, required: true }
      }
    },
    
    // SEO and search
    searchableText: { type: String },
    
    // SEO
    metaTitle: {
      en: { type: String, trim: true, maxlength: [70, 'Meta title cannot exceed 70 characters'] },
      he: { type: String, trim: true, maxlength: [70, 'Meta title cannot exceed 70 characters'] },
    },
    metaDescription: {
      en: { type: String, trim: true, maxlength: [160, 'Meta description cannot exceed 160 characters'] },
      he: { type: String, trim: true, maxlength: [160, 'Meta description cannot exceed 160 characters'] },
    },
    metaKeywords: {
      en: { type: String, trim: true },
      he: { type: String, trim: true },
    },
    
    // Event specific fields
    isOnline: { type: Boolean, default: false },
    isFree: { type: Boolean, default: true },
    registrationRequired: { type: Boolean, default: false },
    registrationUrl: { type: String },
    registrationClosesAt: { type: Date },
    signupForm: {
      title: { en: { type: String }, he: { type: String } },
      description: { en: { type: String }, he: { type: String } },
      showEventRulesCheckbox: { type: Boolean },
      showPrivacyCheckbox: { type: Boolean },
      privacyPolicyUrl: { type: String },
      fields: [{
        id: { type: String },
        name: { type: String },
        type: { type: String, enum: ['text', 'email', 'phone', 'number', 'select', 'textarea', 'checkbox'] },
        label: { en: { type: String }, he: { type: String } },
        required: { type: Boolean },
        placeholder: { en: { type: String }, he: { type: String } },
        options: [{ value: { type: String }, label: { en: { type: String }, he: { type: String } }, linkUrl: { type: String } }],
        order: { type: Number },
        validation: { min: { type: Number }, max: { type: Number } },
      }],
    },
    eventRules: {
      en: { type: String },
      he: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
EventSchema.index({ relatedSports: 1, status: 1, isFeatured: -1 });
EventSchema.index({ status: 1, 'dateTime.startDate': 1 });
EventSchema.index({ 'dateTime.startDate': 1, status: 1 });
EventSchema.index({ searchableText: 'text' });
EventSchema.index({ 'content.he.tags': 1 });
EventSchema.index({ 'content.en.tags': 1 });
EventSchema.index({ viewCount: -1 });
EventSchema.index({ type: 1, relatedSports: 1 });

/**
 * Instance method: Get duration in hours
 */
EventSchema.methods.getDurationHours = function (): number {
  const endDate = this.dateTime.endDate || this.dateTime.startDate;
  const durationMs = endDate.getTime() - this.dateTime.startDate.getTime();
  return Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
};

/**
 * Instance method: Check if event is upcoming
 */
EventSchema.methods.isUpcoming = function (): boolean {
  return this.dateTime.startDate > new Date();
};

/**
 * Instance method: Check if event is past
 */
EventSchema.methods.isPast = function (): boolean {
  const endDate = this.dateTime.endDate || this.dateTime.startDate;
  return endDate < new Date();
};

/**
 * Instance method: Get attendance rate
 */
EventSchema.methods.getAttendanceRate = function (): number {
  // Note: This method assumes capacity might be stored elsewhere or calculated
  // For now, return 0 as capacity is not in the new model
  return 0;
};

/**
 * Static method: Find event by slug
 */
EventSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Static method: Find upcoming events
 */
EventSchema.statics.findUpcoming = function () {
  return this.find({
    'dateTime.startDate': { $gte: new Date() },
    status: 'published',
  }).sort({ 'dateTime.startDate': 1 });
};

/**
 * Static method: Find past events
 */
EventSchema.statics.findPast = function () {
  return this.find({
    $or: [
      { 'dateTime.endDate': { $lte: new Date() } },
      { 'dateTime.endDate': { $exists: false }, 'dateTime.startDate': { $lte: new Date() } }
    ],
    status: 'published',
  }).sort({ 'dateTime.startDate': -1 });
};

/**
 * Static method: Find featured events
 */
EventSchema.statics.findFeatured = function () {
  return this.find({
    isFeatured: true,
    status: 'published',
  }).sort({ 'dateTime.startDate': 1 });
};

/**
 * Static method: Find events by related sport
 */
EventSchema.statics.findByRelatedSport = function (sport: string) {
  return this.find({
    relatedSports: sport,
    status: 'published',
  }).sort({ 'dateTime.startDate': 1 });
};

/**
 * Static method: Find published events
 */
EventSchema.statics.findPublished = function () {
  return this.find({ status: 'published' }).sort({ 'dateTime.startDate': 1 });
};

/**
 * Static method: Search events by text
 */
EventSchema.statics.searchEvents = function (query: string) {
  return this.find({ 
    $text: { $search: query }, 
    status: 'published' 
  }).sort({ score: { $meta: 'textScore' } });
};

/**
 * Virtual: Check if event is currently happening
 */
EventSchema.virtual('isHappening').get(function (this: IEvent): boolean {
  const now = new Date();
  const endDate = this.dateTime.endDate || this.dateTime.startDate;
  return this.dateTime.startDate <= now && now <= endDate;
});

/**
 * Virtual: Get formatted start date
 */
EventSchema.virtual('formattedStartDate').get(function (this: IEvent): string {
  return this.dateTime.startDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

/**
 * Create and export the Event model.
 * Delete cached model so schema changes (e.g. category -> relatedSports) are picked up after hot reload.
 */
if (mongoose.models.Event) {
  delete mongoose.models.Event;
}
const Event: IEventModel = mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event;
