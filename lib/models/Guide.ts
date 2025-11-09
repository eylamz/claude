import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

/**
 * Content block types
 */
export type ContentBlockType = 
  | 'text' 
  | 'heading' 
  | 'list' 
  | 'image' 
  | 'video' 
  | 'link' 
  | 'code' 
  | 'divider';

/**
 * Heading level type
 */
export type HeadingLevel = 'h2' | 'h3' | 'h4';

/**
 * List type
 */
export type ListType = 'bullet' | 'numbered';

/**
 * Content block interface
 */
export interface IContentBlock {
  type: ContentBlockType;
  order: number;
  
  // For text blocks
  text?: ILocalizedField;
  
  // For heading blocks
  heading?: ILocalizedField;
  headingLevel?: HeadingLevel;
  
  // For list blocks
  listType?: ListType;
  listItems?: ILocalizedField[];
  
  // For image blocks
  imageUrl?: string;
  imageCaption?: ILocalizedField;
  imageAlt?: ILocalizedField;
  
  // For video blocks
  videoUrl?: string;
  videoTitle?: ILocalizedField;
  
  // For link blocks
  linkText?: ILocalizedField;
  linkUrl?: string;
  linkExternal?: boolean;
  
  // For code blocks
  code?: string;
  language?: string;
}

/**
 * Guide status type
 */
export type GuideStatus = 'draft' | 'published' | 'archived';

/**
 * Guide interface extending Mongoose Document
 */
export interface IGuide extends Document {
  slug: string;
  title: ILocalizedField;
  description: ILocalizedField;
  
  // Media
  coverImage: string;
  
  // Related sports
  relatedSports: string[];
  
  // Content
  contentBlocks: IContentBlock[];
  
  // Tags
  tags: string[];
  
  // Statistics
  viewsCount: number;
  likesCount: number;
  
  // Rating (average from user reviews)
  rating: number;
  ratingCount: number;
  
  // Status and settings
  status: GuideStatus;
  isFeatured: boolean;
  
  // SEO
  metaTitle?: ILocalizedField;
  metaDescription?: ILocalizedField;
  metaKeywords?: ILocalizedField;
  
  // Author
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // Instance methods
  incrementViews(): Promise<void>;
  calculateRating(): void;
  isPublished(): boolean;
}

/**
 * Guide Model interface with static methods
 */
export interface IGuideModel extends Model<IGuide> {
  findBySlug(slug: string): Promise<IGuide | null>;
  findPublished(): Promise<IGuide[]>;
  findFeatured(): Promise<IGuide[]>;
  findBySport(sport: string): Promise<IGuide[]>;
  findByTag(tag: string): Promise<IGuide[]>;
  searchGuides(query: string): Promise<IGuide[]>;
}

/**
 * Guide schema definition
 */
const GuideSchema: Schema<IGuide> = new Schema<IGuide>(
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
        maxlength: [1000, 'English description cannot exceed 1000 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew description is required'],
        trim: true,
        maxlength: [1000, 'Hebrew description cannot exceed 1000 characters'],
      },
    },
    coverImage: {
      type: String,
      required: [true, 'Cover image is required'],
      trim: true,
    },
    relatedSports: [
      {
        type: String,
        trim: true,
      },
    ],
    contentBlocks: [
      {
        type: {
          type: String,
          enum: ['text', 'heading', 'list', 'image', 'video', 'link', 'code', 'divider'],
          required: true,
        },
        order: {
          type: Number,
          required: true,
          default: 0,
        },
        text: {
          en: {
            type: String,
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
        heading: {
          en: {
            type: String,
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
        headingLevel: {
          type: String,
          enum: ['h2', 'h3', 'h4'],
          default: 'h2',
        },
        listType: {
          type: String,
          enum: ['bullet', 'numbered'],
          default: 'bullet',
        },
        listItems: [
          {
            en: {
              type: String,
              trim: true,
            },
            he: {
              type: String,
              trim: true,
            },
          },
        ],
        imageUrl: {
          type: String,
          trim: true,
        },
        imageCaption: {
          en: {
            type: String,
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
        imageAlt: {
          en: {
            type: String,
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
        videoUrl: {
          type: String,
          trim: true,
        },
        videoTitle: {
          en: {
            type: String,
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
        linkText: {
          en: {
            type: String,
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
        linkUrl: {
          type: String,
          trim: true,
        },
        linkExternal: {
          type: Boolean,
          default: false,
        },
        code: {
          type: String,
          trim: true,
        },
        language: {
          type: String,
          trim: true,
          default: 'javascript',
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    viewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative'],
    },
    likesCount: {
      type: Number,
      default: 0,
      min: [0, 'Likes count cannot be negative'],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
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
    metaKeywords: {
      en: {
        type: String,
        trim: true,
      },
      he: {
        type: String,
        trim: true,
      },
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    publishedAt: {
      type: Date,
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
GuideSchema.index({ status: 1 });
GuideSchema.index({ isFeatured: 1, status: 1 });
GuideSchema.index({ relatedSports: 1, status: 1 });
GuideSchema.index({ tags: 1, status: 1 });
GuideSchema.index({ viewsCount: -1 });
GuideSchema.index({ rating: -1 });
GuideSchema.index({
  'title.en': 'text',
  'title.he': 'text',
  'description.en': 'text',
  'description.he': 'text',
  tags: 'text',
});

/**
 * Instance method: Increment views
 */
GuideSchema.methods.incrementViews = async function (): Promise<void> {
  this.viewsCount += 1;
  await this.save();
};

/**
 * Instance method: Calculate rating (to be implemented with reviews)
 */
GuideSchema.methods.calculateRating = function (): void {
  // This would calculate average from user reviews
  // For now, it's a placeholder
};

/**
 * Instance method: Check if guide is published
 */
GuideSchema.methods.isPublished = function (): boolean {
  return this.status === 'published';
};

/**
 * Static method: Find guide by slug
 */
GuideSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Static method: Find published guides
 */
GuideSchema.statics.findPublished = function () {
  return this.find({ status: 'published' }).sort({ createdAt: -1 });
};

/**
 * Static method: Find featured guides
 */
GuideSchema.statics.findFeatured = function () {
  return this.find({
    isFeatured: true,
    status: 'published',
  }).sort({ createdAt: -1 });
};

/**
 * Static method: Find guides by sport
 */
GuideSchema.statics.findBySport = function (sport: string) {
  return this.find({
    relatedSports: { $in: [sport] },
    status: 'published',
  }).sort({ viewsCount: -1 });
};

/**
 * Static method: Find guides by tag
 */
GuideSchema.statics.findByTag = function (tag: string) {
  return this.find({
    tags: { $in: [tag] },
    status: 'published',
  }).sort({ createdAt: -1 });
};

/**
 * Static method: Search guides by text
 */
GuideSchema.statics.searchGuides = function (query: string) {
  return this.find({ $text: { $search: query }, status: 'published' })
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Virtual: Get formatted rating
 */
GuideSchema.virtual('formattedRating').get(function (this: IGuide): string {
  if (this.ratingCount === 0) return 'No ratings yet';
  return `${this.rating.toFixed(1)} (${this.ratingCount} ratings)`;
});

/**
 * Virtual: Get reading time estimate
 */
GuideSchema.virtual('readingTime').get(function (this: IGuide): number {
  // Estimate reading time based on content blocks
  const totalWords = this.contentBlocks.reduce((total, block) => {
    if (block.text) {
      const enWords = block.text.en.split(' ').length;
      const heWords = block.text.he.split(' ').length;
      return total + Math.max(enWords, heWords);
    } else if (block.heading) {
      return total + 5; // Headings add minimal reading time
    } else if (block.listItems) {
      return total + block.listItems.length * 3;
    }
    return total;
  }, 0);
  
  // Average reading speed is 200 words per minute
  return Math.ceil(totalWords / 200);
});

/**
 * Pre-save hook: Set published date
 */
GuideSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

/**
 * Create and export the Guide model
 */
const Guide: IGuideModel =
  (mongoose.models.Guide as IGuideModel) ||
  mongoose.model<IGuide, IGuideModel>('Guide', GuideSchema);

export default Guide;



