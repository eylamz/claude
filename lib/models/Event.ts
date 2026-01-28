import mongoose, { Schema, Document, Model } from 'mongoose';

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

// Main Event interface
export interface IEvent extends Document {
  slug: string;
  category: 'roller' | 'skate' | 'scoot' | 'bike';
  type: 'competition' | 'workshop' | 'event' | 'meetup' | 'jam';
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
  
  // Event specific fields
  isOnline: boolean;
  isFree: boolean;
  registrationRequired: boolean;
  registrationUrl?: string;
  
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
  findByCategory(category: string): Promise<IEvent[]>;
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
    he: { type: String, required: true },
    en: { type: String, required: true }
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
    category: { 
      type: String, 
      required: true, 
      enum: ['roller', 'skate', 'scoot', 'bike'] 
    },
    type: { 
      type: String, 
      required: true, 
      enum: ['competition', 'workshop', 'event', 'meetup', 'jam'] 
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
    
    // Event specific fields
    isOnline: { type: Boolean, default: false },
    isFree: { type: Boolean, default: true },
    registrationRequired: { type: Boolean, default: false },
    registrationUrl: { type: String }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
EventSchema.index({ category: 1, status: 1, isFeatured: -1 });
EventSchema.index({ status: 1, 'dateTime.startDate': 1 });
EventSchema.index({ 'dateTime.startDate': 1, status: 1 });
EventSchema.index({ searchableText: 'text' });
EventSchema.index({ 'content.he.tags': 1 });
EventSchema.index({ 'content.en.tags': 1 });
EventSchema.index({ viewCount: -1 });
EventSchema.index({ type: 1, category: 1 });

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
 * Static method: Find events by category
 */
EventSchema.statics.findByCategory = function (category: string) {
  return this.find({
    category: category,
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
 * Create and export the Event model
 */
const Event: IEventModel =
  (mongoose.models.Event as IEventModel) ||
  mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event;
