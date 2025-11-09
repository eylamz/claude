import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

/**
 * Event image interface
 */
export interface IEventImage {
  url: string;
  alt: ILocalizedField;
  order: number;
  publicId: string;
}

/**
 * Event status type
 */
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

/**
 * Event interface extending Mongoose Document
 */
export interface IEvent extends Document {
  slug: string;
  title: ILocalizedField;
  description: ILocalizedField;
  shortDescription: ILocalizedField;
  
  // Date and time
  startDate: Date;
  endDate: Date;
  timezone: string;
  isAllDay: boolean;
  
  // Location
  location: {
    name: ILocalizedField;
    address: ILocalizedField;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    venueUrl?: string;
  };
  
  // Media
  images: IEventImage[];
  featuredImage: string;
  videoUrl?: string;
  
  // Related sports
  relatedSports: string[];
  
  // Event details
  category: string;
  organizer: {
    name: string;
    email: string;
    phone?: string;
  };
  capacity?: number;
  isFree: boolean;
  price?: number;
  currency?: string;
  registrationUrl?: string;
  
  // Statistics
  viewsCount: number;
  interestedCount: number;
  attendedCount: number;
  
  // Status and settings
  status: EventStatus;
  isFeatured: boolean;
  isPublic: boolean;
  registrationRequired: boolean;
  
  // SEO
  metaTitle?: ILocalizedField;
  metaDescription?: ILocalizedField;
  
  // Additional
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  getDurationHours(): number;
  isUpcoming(): boolean;
  isPast(): boolean;
  getAttendanceRate(): number;
}

/**
 * Event Model interface with static methods
 */
export interface IEventModel extends Model<IEvent> {
  findBySlug(slug: string): Promise<IEvent | null>;
  findUpcoming(): Promise<IEvent[]>;
  findPast(): Promise<IEvent[]>;
  findFeatured(): Promise<IEvent[]>;
  findBySport(sport: string): Promise<IEvent[]>;
  findPublished(): Promise<IEvent[]>;
  searchEvents(query: string): Promise<IEvent[]>;
}

/**
 * Event schema definition
 */
const EventSchema: Schema<IEvent> = new Schema<IEvent>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    title: {
      en: {
        type: String,
        required: [true, 'English title is required'],
        trim: true,
        maxlength: [200, 'English title cannot exceed 200 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew title is required'],
        trim: true,
        maxlength: [200, 'Hebrew title cannot exceed 200 characters'],
      },
    },
    description: {
      en: {
        type: String,
        required: [true, 'English description is required'],
        trim: true,
        maxlength: [5000, 'English description cannot exceed 5000 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew description is required'],
        trim: true,
        maxlength: [5000, 'Hebrew description cannot exceed 5000 characters'],
      },
    },
    shortDescription: {
      en: {
        type: String,
        trim: true,
        maxlength: [500, 'English short description cannot exceed 500 characters'],
      },
      he: {
        type: String,
        trim: true,
        maxlength: [500, 'Hebrew short description cannot exceed 500 characters'],
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (this: IEvent, value: Date) {
          return value >= this.startDate;
        },
        message: 'End date must be after or equal to start date',
      },
    },
    timezone: {
      type: String,
      default: 'Asia/Jerusalem',
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },
    location: {
      name: {
        en: {
          type: String,
          required: true,
          trim: true,
        },
        he: {
          type: String,
          required: true,
          trim: true,
        },
      },
      address: {
        en: {
          type: String,
          required: true,
          trim: true,
        },
        he: {
          type: String,
          required: true,
          trim: true,
        },
      },
      coordinates: {
        latitude: {
          type: Number,
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90'],
        },
        longitude: {
          type: Number,
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180'],
        },
      },
      venueUrl: {
        type: String,
        trim: true,
      },
    },
    images: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },
        alt: {
          en: {
            type: String,
            required: true,
            trim: true,
          },
          he: {
            type: String,
            required: true,
            trim: true,
          },
        },
        order: {
          type: Number,
          default: 0,
        },
        publicId: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    featuredImage: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    relatedSports: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    organizer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'ILS',
    },
    registrationUrl: {
      type: String,
      trim: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative'],
    },
    interestedCount: {
      type: Number,
      default: 0,
      min: [0, 'Interested count cannot be negative'],
    },
    attendedCount: {
      type: Number,
      default: 0,
      min: [0, 'Attended count cannot be negative'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    registrationRequired: {
      type: Boolean,
      default: false,
    },
    metaTitle: {
      en: {
        type: String,
        trim: true,
        maxlength: [70, 'Meta title cannot exceed 70 characters'],
      },
      he: {
        type: String,
        trim: true,
        maxlength: [70, 'Meta title cannot exceed 70 characters'],
      },
    },
    metaDescription: {
      en: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters'],
      },
      he: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters'],
      },
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indexes for performance
 */
// Note: slug already has unique: true which creates a unique index automatically
// Note: startDate already has index: true in field definition
EventSchema.index({ status: 1 });
EventSchema.index({ isFeatured: 1, status: 1 });
EventSchema.index({ category: 1, status: 1 });
EventSchema.index({
  'title.en': 'text',
  'title.he': 'text',
  'description.en': 'text',
  'description.he': 'text',
  tags: 'text',
});

/**
 * Instance method: Get duration in hours
 */
EventSchema.methods.getDurationHours = function (): number {
  const durationMs = this.endDate.getTime() - this.startDate.getTime();
  return Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
};

/**
 * Instance method: Check if event is upcoming
 */
EventSchema.methods.isUpcoming = function (): boolean {
  return this.startDate > new Date();
};

/**
 * Instance method: Check if event is past
 */
EventSchema.methods.isPast = function (): boolean {
  return this.endDate < new Date();
};

/**
 * Instance method: Get attendance rate
 */
EventSchema.methods.getAttendanceRate = function (): number {
  if (!this.capacity || this.capacity === 0) return 0;
  return Math.round((this.attendedCount / this.capacity) * 100);
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
    startDate: { $gte: new Date() },
    status: 'published',
  }).sort({ startDate: 1 });
};

/**
 * Static method: Find past events
 */
EventSchema.statics.findPast = function () {
  return this.find({
    endDate: { $lte: new Date() },
    status: 'published',
  }).sort({ startDate: -1 });
};

/**
 * Static method: Find featured events
 */
EventSchema.statics.findFeatured = function () {
  return this.find({
    isFeatured: true,
    status: 'published',
  }).sort({ startDate: 1 });
};

/**
 * Static method: Find events by sport
 */
EventSchema.statics.findBySport = function (sport: string) {
  return this.find({
    relatedSports: { $in: [sport] },
    status: 'published',
  }).sort({ startDate: 1 });
};

/**
 * Static method: Find published events
 */
EventSchema.statics.findPublished = function () {
  return this.find({ status: 'published' }).sort({ startDate: 1 });
};

/**
 * Static method: Search events by text
 */
EventSchema.statics.searchEvents = function (query: string) {
  return this.find({ $text: { $search: query }, status: 'published' })
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Virtual: Check if event is currently happening
 */
EventSchema.virtual('isHappening').get(function (this: IEvent): boolean {
  const now = new Date();
  return this.startDate <= now && now <= this.endDate;
});

/**
 * Virtual: Get formatted start date
 */
EventSchema.virtual('formattedStartDate').get(function (this: IEvent): string {
  return this.startDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

/**
 * Virtual: Get availability
 */
EventSchema.virtual('availability').get(function (this: IEvent): string {
  if (!this.capacity) return 'Unlimited';
  const spots = this.capacity - this.attendedCount;
  return `${spots}/${this.capacity} spots available`;
});

/**
 * Create and export the Event model
 */
const Event: IEventModel =
  (mongoose.models.Event as IEventModel) ||
  mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event;



