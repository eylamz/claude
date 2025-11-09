import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

/**
 * Trainer image interface
 */
export interface ITrainerImage {
  url: string;
  alt: ILocalizedField;
  order: number;
  publicId: string;
}

/**
 * Review interface
 */
export interface IReview {
  userId: mongoose.Types.ObjectId;
  userName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: Date;
}

/**
 * Contact details interface
 */
export interface IContactDetails {
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  visible: boolean;
}

/**
 * Trainer status type
 */
export type TrainerStatus = 'active' | 'inactive' | 'pending';

/**
 * Trainer interface extending Mongoose Document
 */
export interface ITrainer extends Document {
  slug: string;
  name: ILocalizedField;
  description: ILocalizedField;
  shortDescription: ILocalizedField;
  
  // Images
  profileImage: string;
  galleryImages: ITrainerImage[];
  
  // Location & Area
  area: 'north' | 'center' | 'south';
  
  // Sports
  relatedSports: string[];
  
  // Contact
  contactDetails: IContactDetails;
  
  // Linked Resources
  linkedSkateparks: mongoose.Types.ObjectId[];
  
  // Statistics
  rating: number;
  totalReviews: number;
  approvedReviews: number;
  reviews: IReview[];
  
  // Status & Features
  status: TrainerStatus;
  isFeatured: boolean;
  
  // SEO
  metaTitle?: ILocalizedField;
  metaDescription?: ILocalizedField;
  
  // Additional
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  getAverageRating(): number;
  getApprovedReviewsCount(): number;
  hasContactInfo(): boolean;
}

/**
 * Trainer Model interface with static methods
 */
export interface ITrainerModel extends Model<ITrainer> {
  findBySlug(slug: string): Promise<ITrainer | null>;
  findActive(): Promise<ITrainer[]>;
  findFeatured(): Promise<ITrainer[]>;
  findByArea(area: string): Promise<ITrainer[]>;
  findBySport(sport: string): Promise<ITrainer[]>;
  searchTrainers(query: string): Promise<ITrainer[]>;
}

/**
 * Trainer schema definition
 */
const TrainerSchema: Schema<ITrainer> = new Schema<ITrainer>(
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
    profileImage: {
      type: String,
      required: [true, 'Profile image is required'],
      trim: true,
    },
    galleryImages: [
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
    area: {
      type: String,
      enum: ['north', 'center', 'south'],
      required: [true, 'Area is required'],
    },
    relatedSports: [
      {
        type: String,
        trim: true,
      },
    ],
    contactDetails: {
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      website: {
        type: String,
        trim: true,
      },
      instagram: {
        type: String,
        trim: true,
      },
      facebook: {
        type: String,
        trim: true,
      },
      visible: {
        type: Boolean,
        default: true,
      },
    },
    linkedSkateparks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Skatepark',
      },
    ],
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
    approvedReviews: {
      type: Number,
      default: 0,
      min: [0, 'Approved reviews cannot be negative'],
    },
    reviews: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: [1, 'Rating must be at least 1'],
          max: [5, 'Rating cannot exceed 5'],
        },
        comment: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        },
        isApproved: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
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
TrainerSchema.index({ area: 1 });
TrainerSchema.index({ status: 1 });
TrainerSchema.index({ isFeatured: 1, status: 1 });
TrainerSchema.index({
  'name.en': 'text',
  'name.he': 'text',
  'description.en': 'text',
  'description.he': 'text',
});

/**
 * Instance method: Get average rating
 */
TrainerSchema.methods.getAverageRating = function (): number {
  const approvedReviews = this.reviews.filter(r => r.isApproved);
  if (approvedReviews.length === 0) return 0;
  const sum = approvedReviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / approvedReviews.length;
};

/**
 * Instance method: Get approved reviews count
 */
TrainerSchema.methods.getApprovedReviewsCount = function (): number {
  return this.reviews.filter(r => r.isApproved).length;
};

/**
 * Instance method: Check if trainer has contact info
 */
TrainerSchema.methods.hasContactInfo = function (): boolean {
  return !!(
    this.contactDetails?.phone ||
    this.contactDetails?.email ||
    this.contactDetails?.website ||
    this.contactDetails?.instagram ||
    this.contactDetails?.facebook
  );
};

/**
 * Static method: Find trainer by slug
 */
TrainerSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Static method: Find active trainers
 */
TrainerSchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

/**
 * Static method: Find featured trainers
 */
TrainerSchema.statics.findFeatured = function () {
  return this.find({ isFeatured: true, status: 'active' });
};

/**
 * Static method: Find trainers by area
 */
TrainerSchema.statics.findByArea = function (area: string) {
  return this.find({ area, status: 'active' });
};

/**
 * Static method: Find trainers by sport
 */
TrainerSchema.statics.findBySport = function (sport: string) {
  return this.find({ relatedSports: { $in: [sport] }, status: 'active' });
};

/**
 * Static method: Search trainers
 */
TrainerSchema.statics.searchTrainers = function (query: string) {
  return this.find({ $text: { $search: query }, status: 'active' })
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Pre-save middleware: Update rating statistics
 */
TrainerSchema.pre('save', function (next) {
  if (this.isModified('reviews')) {
    const approvedReviews = this.reviews.filter(r => r.isApproved);
    this.approvedReviews = approvedReviews.length;
    this.totalReviews = this.reviews.length;
    
    if (approvedReviews.length > 0) {
      const sum = approvedReviews.reduce((acc, review) => acc + review.rating, 0);
      this.rating = sum / approvedReviews.length;
    }
  }
  next();
});

/**
 * Create and export the Trainer model
 */
const Trainer: ITrainerModel =
  (mongoose.models.Trainer as ITrainerModel) ||
  mongoose.model<ITrainer, ITrainerModel>('Trainer', TrainerSchema);

export default Trainer;



