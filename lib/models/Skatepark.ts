import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface for single strings (used for name, address)
 */
export interface ILocalizedString {
  en: string;
  he: string;
}

/**
 * Localized field interface for arrays of strings (used for notes)
 */
export interface ILocalizedStringArray {
  en?: string[];
  he?: string[];
}

/**
 * Skatepark image interface
 */
export interface ISkateparkImage {
  url: string;
  isFeatured: boolean;
  orderNumber: number;
}

/**
 * Day schedule interface
 */
export interface IDaySchedule {
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
}

/**
 * Operating hours interface
 */
export interface IOperatingHours {
  sunday: IDaySchedule;
  monday: IDaySchedule;
  tuesday: IDaySchedule;
  wednesday: IDaySchedule;
  thursday: IDaySchedule;
  friday: IDaySchedule;
  saturday: IDaySchedule;
  holidays: IDaySchedule;
}

/**
 * Lighting hours interface
 */
export interface ILightingHours {
  endTime: string;
  is24Hours: boolean;
}

/**
 * Amenities interface
 */
export interface IAmenities {
  entryFee: boolean;
  parking: boolean;
  shade: boolean;
  bathroom: boolean;
  helmetRequired: boolean;
  guard: boolean;
  seating: boolean;
  bombShelter: boolean;
  scootersAllowed: boolean;
  bikesAllowed: boolean;
  noWax: boolean;
  nearbyRestaurants: boolean;
}

/**
 * Media links interface
 */
export interface IMediaLinks {
  youtube?: string;
  googleMapsFrame?: string;
}

/**
 * Geospatial location interface
 */
export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Area type
 */
export type Area = 'north' | 'center' | 'south';

/**
 * Skatepark status type
 */
export type SkateparkStatus = 'active' | 'inactive';

/**
 * Skatepark interface extending Mongoose Document
 */
export interface ISkatepark extends Document {
  slug: string;
  name: ILocalizedString;
  status: SkateparkStatus;
  address: ILocalizedString;
  area: Area;
  location: ILocation;
  images: ISkateparkImage[];
  operatingHours: IOperatingHours;
  lightingHours?: ILightingHours;
  amenities: IAmenities;
  openingYear?: number;
  closingYear?: number;
  notes: ILocalizedStringArray;
  isFeatured: boolean;
  mediaLinks: IMediaLinks;
  rating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  getLocationCoordinates(): [number, number];
  isOpenNow(): boolean;
  getCurrentOperatingHours(): IDaySchedule | undefined;
  getDistanceFrom(lat: number, lng: number): number;
}

/**
 * Skatepark Model interface with static methods
 */
export interface ISkateparkModel extends Model<ISkatepark> {
  findBySlug(slug: string): Promise<ISkatepark | null>;
  findActive(): Promise<ISkatepark[]>;
  findFeatured(): Promise<ISkatepark[]>;
  findNearby(lat: number, lng: number, radiusKm?: number): Promise<ISkatepark[]>;
  searchSkateparks(query: string): Promise<ISkatepark[]>;
  findByArea(area: Area): Promise<ISkatepark[]>;
}

/**
 * Day schedule schema
 */
const DayScheduleSchema = new Schema<IDaySchedule>({
  openingTime: {
    type: String,
    required: true,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:mm format'],
  },
  closingTime: {
    type: String,
    required: true,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:mm format'],
  },
  isOpen: { type: Boolean, default: false },
}, { _id: false });

/**
 * Operating hours schema
 */
const OperatingHoursSchema = new Schema<IOperatingHours>({
  sunday: { type: DayScheduleSchema, required: true },
  monday: { type: DayScheduleSchema, required: true },
  tuesday: { type: DayScheduleSchema, required: true },
  wednesday: { type: DayScheduleSchema, required: true },
  thursday: { type: DayScheduleSchema, required: true },
  friday: { type: DayScheduleSchema, required: true },
  saturday: { type: DayScheduleSchema, required: true },
  holidays: { type: DayScheduleSchema, required: true },
}, { _id: false });

/**
 * Lighting hours schema
 */
const LightingHoursSchema = new Schema<ILightingHours>({
  endTime: {
    type: String,
    required: false,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:mm format'],
  },
  is24Hours: { type: Boolean, default: false },
}, { _id: false });

/**
 * Skatepark image schema
 */
const SkateparkImageSchema = new Schema<ISkateparkImage>({
  url: { type: String, required: true },
  isFeatured: { type: Boolean, default: false },
  orderNumber: { type: Number, required: true },
}, { _id: false });

/**
 * Skatepark schema definition
 */
const SkateparkSchema: Schema<ISkatepark> = new Schema<ISkatepark>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    name: {
      en: {
        type: String,
        required: [true, 'English name is required'],
        trim: true,
        maxlength: [200, 'English name cannot exceed 200 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew name is required'],
        trim: true,
        maxlength: [200, 'Hebrew name cannot exceed 200 characters'],
      },
    },
    address: {
      en: {
        type: String,
        required: [true, 'English address is required'],
        trim: true,
        maxlength: [300, 'English address cannot exceed 300 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew address is required'],
        trim: true,
        maxlength: [300, 'Hebrew address cannot exceed 300 characters'],
      },
    },
    area: {
      type: String,
      enum: ['north', 'center', 'south'],
      required: [true, 'Area is required'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function (coords: number[]) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },
    images: [SkateparkImageSchema],
    operatingHours: { type: OperatingHoursSchema, required: true },
    lightingHours: { type: LightingHoursSchema, required: false },
    amenities: {
      entryFee: {
        type: Boolean,
        default: false,
      },
      parking: {
        type: Boolean,
        default: false,
      },
      shade: {
        type: Boolean,
        default: false,
      },
      bathroom: {
        type: Boolean,
        default: false,
      },
      helmetRequired: {
        type: Boolean,
        default: false,
      },
      guard: {
        type: Boolean,
        default: false,
      },
      seating: {
        type: Boolean,
        default: false,
      },
      bombShelter: {
        type: Boolean,
        default: false,
      },
      scootersAllowed: {
        type: Boolean,
        default: false,
      },
      bikesAllowed: {
        type: Boolean,
        default: false,
      },
      noWax: {
        type: Boolean,
        default: false,
      },
      nearbyRestaurants: {
        type: Boolean,
        default: false,
      },
    },
    openingYear: {
      type: Number,
      min: [1900, 'Opening year must be after 1900'],
      max: [new Date().getFullYear(), 'Opening year cannot be in the future'],
    },
    closingYear: {
      type: Number,
      min: [1900, 'Closing year must be after 1900'],
      validate: {
        validator: function (this: ISkatepark, value: number | undefined) {
          return !value || !this.openingYear || value >= this.openingYear;
        },
        message: 'Closing year must be after or equal to opening year',
      },
    },
    notes: {
      en: { type: [String] },
      he: { type: [String] },
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    mediaLinks: {
      youtube: {
        type: String,
        trim: true,
        validate: {
          validator: function (value: string | undefined) {
            if (!value) return true;
            return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(value);
          },
          message: 'Invalid YouTube URL',
        },
      },
      googleMapsFrame: {
        type: String,
        trim: true,
      },
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Total reviews cannot be negative'],
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
// Geospatial index for location searches
SkateparkSchema.index({ location: '2dsphere' });

// Area index
SkateparkSchema.index({ area: 1 });

// Featured + status compound index
SkateparkSchema.index({ isFeatured: 1, status: 1 });

// Text index for search
SkateparkSchema.index({
  'name.en': 'text',
  'name.he': 'text',
  'address.en': 'text',
  'address.he': 'text',
  'notes.en': 'text',
  'notes.he': 'text',
  area: 'text',
});

/**
 * Instance method: Get location coordinates
 */
SkateparkSchema.methods.getLocationCoordinates = function (): [number, number] {
  return this.location.coordinates;
};

/**
 * Instance method: Check if skatepark is currently open
 */
SkateparkSchema.methods.isOpenNow = function (): boolean {
  if (this.lightingHours?.is24Hours) return true;

  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ];

  const daySchedule = this.operatingHours[dayOfWeek as keyof IOperatingHours] as IDaySchedule;

  if (!daySchedule || !daySchedule.isOpen) return false;
  if (!daySchedule.openingTime || !daySchedule.closingTime) return false;

  const [openHour, openMin] = daySchedule.openingTime.split(':').map(Number);
  const [closeHour, closeMin] = daySchedule.closingTime.split(':').map(Number);
  const openTime = new Date().setHours(openHour, openMin, 0, 0);
  const closeTime = new Date().setHours(closeHour, closeMin, 0, 0);
  const nowTime = new Date().setHours(now.getHours(), now.getMinutes(), 0, 0);

  return nowTime >= openTime && nowTime <= closeTime;
};

/**
 * Instance method: Get current operating hours for today
 */
SkateparkSchema.methods.getCurrentOperatingHours = function (): IDaySchedule | undefined {
  if (this.lightingHours?.is24Hours) {
    return { openingTime: '00:00', closingTime: '23:59', isOpen: true };
  }

  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ];

  return this.operatingHours[dayOfWeek as keyof IOperatingHours] as IDaySchedule;
};

/**
 * Instance method: Calculate distance from a point in kilometers
 */
SkateparkSchema.methods.getDistanceFrom = function (lat: number, lng: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat - this.location.coordinates[1]) * Math.PI) / 180;
  const dLon = ((lng - this.location.coordinates[0]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((this.location.coordinates[1] * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

/**
 * Static method: Find skatepark by slug
 */
SkateparkSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Static method: Find active skateparks
 */
SkateparkSchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

/**
 * Static method: Find featured skateparks
 */
SkateparkSchema.statics.findFeatured = function () {
  return this.find({ isFeatured: true, status: 'active' });
};

/**
 * Static method: Find skateparks near a location
 */
SkateparkSchema.statics.findNearby = function (lat: number, lng: number, radiusKm: number = 10) {
  const radiusMeters = radiusKm * 1000;
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusMeters,
      },
    },
    status: 'active',
  });
};

/**
 * Static method: Search skateparks by text
 */
SkateparkSchema.statics.searchSkateparks = function (query: string) {
  return this.find({ $text: { $search: query }, status: 'active' })
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Static method: Find skateparks by area
 */
SkateparkSchema.statics.findByArea = function (area: Area) {
  return this.find({ area, status: 'active' });
};

/**
 * Pre-save middleware: Sort images by orderNumber
 */
SkateparkSchema.pre('save', function (next) {
  if (this.isModified('images') && this.images.length > 0) {
    this.images.sort((a, b) => a.orderNumber - b.orderNumber);
  }
  next();
});

/**
 * Virtual: Get primary image
 */
SkateparkSchema.virtual('primaryImage').get(function (this: ISkatepark): ISkateparkImage | undefined {
  return this.images.length > 0 ? this.images[0] : undefined;
});

/**
 * Virtual: Get latitude
 */
SkateparkSchema.virtual('latitude').get(function (this: ISkatepark): number {
  return this.location.coordinates[1];
});

/**
 * Virtual: Get longitude
 */
SkateparkSchema.virtual('longitude').get(function (this: ISkatepark): number {
  return this.location.coordinates[0];
});

/**
 * Virtual: Check if skatepark is permanently closed
 */
SkateparkSchema.virtual('isClosed').get(function (this: ISkatepark): boolean {
  return !!(this.closingYear && this.closingYear <= new Date().getFullYear());
});

/**
 * Virtual: Get average rating display
 */
SkateparkSchema.virtual('ratingDisplay').get(function (this: ISkatepark): string {
  if (this.totalReviews === 0) return 'No reviews yet';
  return `${this.rating.toFixed(1)} (${this.totalReviews} ${this.totalReviews === 1 ? 'review' : 'reviews'})`;
});

/**
 * Create and export the Skatepark model
 */
const Skatepark: ISkateparkModel =
  (mongoose.models.Skatepark as ISkateparkModel) ||
  mongoose.model<ISkatepark, ISkateparkModel>('Skatepark', SkateparkSchema);

export default Skatepark;

