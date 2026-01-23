import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

/**
 * Form field types
 */
export type FormFieldType = 
  | 'text' 
  | 'textarea' 
  | 'radio' 
  | 'checkbox' 
  | 'select' 
  | 'date' 
  | 'number' 
  | 'link' 
  | 'image' 
  | 'image-selection';

/**
 * Form field option interface
 */
export interface IFormFieldOption {
  value: string;
  label: ILocalizedField;
}

/**
 * Form field image interface
 */
export interface IFormFieldImage {
  url: string;
  alt?: ILocalizedField;
}

/**
 * Form field interface
 */
export interface IFormField {
  id: string;
  type: FormFieldType;
  label: ILocalizedField;
  required: boolean;
  order: number;
  placeholder?: ILocalizedField;
  options?: IFormFieldOption[];
  hasOtherOption?: boolean;
  otherInputType?: 'input' | 'textarea';
  images?: IFormFieldImage[];
  min?: number;
  max?: number;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    custom?: string;
  };
}

/**
 * Form status type
 */
export type FormStatus = 'draft' | 'published' | 'archived';

/**
 * Form interface extending Mongoose Document
 */
export interface IForm extends Document {
  slug: string;
  title: ILocalizedField;
  description: ILocalizedField;
  fields: IFormField[];
  status: FormStatus;
  visibleFrom?: Date;
  visibleUntil?: Date;
  metaTitle?: ILocalizedField;
  metaDescription?: ILocalizedField;
  metaKeywords?: ILocalizedField;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  submissionsCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // Instance methods
  isPublished(): boolean;
  isVisible(): boolean;
  incrementSubmissions(): Promise<void>;
}

/**
 * Form Model interface with static methods
 */
export interface IFormModel extends Model<IForm> {
  findBySlug(slug: string): Promise<IForm | null>;
  findPublished(): Promise<IForm[]>;
  findVisible(): Promise<IForm[]>;
  findByStatus(status: FormStatus): Promise<IForm[]>;
}

/**
 * Form field schema definition
 */
const FormFieldSchema = new Schema<IFormField>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'radio', 'checkbox', 'select', 'date', 'number', 'link', 'image', 'image-selection'],
      required: true,
    },
    label: {
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
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    placeholder: {
      en: {
        type: String,
        trim: true,
      },
      he: {
        type: String,
        trim: true,
      },
    },
    options: [
      {
        value: {
          type: String,
          required: true,
          trim: true,
        },
        label: {
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
      },
    ],
    hasOtherOption: {
      type: Boolean,
      default: false,
    },
    otherInputType: {
      type: String,
      enum: ['input', 'textarea'],
      default: 'input',
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
            trim: true,
          },
          he: {
            type: String,
            trim: true,
          },
        },
      },
    ],
    min: {
      type: Number,
    },
    max: {
      type: Number,
    },
    validation: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

/**
 * Form schema definition
 */
const FormSchema: Schema<IForm> = new Schema<IForm>(
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
    fields: {
      type: [FormFieldSchema],
      default: [],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    visibleFrom: {
      type: Date,
    },
    visibleUntil: {
      type: Date,
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
    submissionsCount: {
      type: Number,
      default: 0,
      min: [0, 'Submissions count cannot be negative'],
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
FormSchema.index({ slug: 1 }, { unique: true });
FormSchema.index({ status: 1 });
FormSchema.index({ visibleFrom: 1, visibleUntil: 1 });
FormSchema.index({ 'title.en': 'text', 'title.he': 'text', 'description.en': 'text', 'description.he': 'text' });
FormSchema.index({ authorId: 1 });
FormSchema.index({ createdAt: -1 });

/**
 * Instance method: Check if form is published
 */
FormSchema.methods.isPublished = function (): boolean {
  return this.status === 'published';
};

/**
 * Instance method: Check if form is currently visible
 */
FormSchema.methods.isVisible = function (): boolean {
  if (this.status !== 'published') {
    return false;
  }
  
  const now = new Date();
  
  if (this.visibleFrom && now < this.visibleFrom) {
    return false;
  }
  
  if (this.visibleUntil && now > this.visibleUntil) {
    return false;
  }
  
  return true;
};

/**
 * Instance method: Increment submissions count
 */
FormSchema.methods.incrementSubmissions = async function (): Promise<void> {
  this.submissionsCount += 1;
  await this.save();
};

/**
 * Static method: Find form by slug
 */
FormSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Static method: Find published forms
 */
FormSchema.statics.findPublished = function () {
  return this.find({ status: 'published' }).sort({ createdAt: -1 });
};

/**
 * Static method: Find visible forms (published and within date range)
 */
FormSchema.statics.findVisible = function () {
  const now = new Date();
  return this.find({
    status: 'published',
    $and: [
      {
        $or: [
          { visibleFrom: { $exists: false } },
          { visibleFrom: { $lte: now } },
        ],
      },
      {
        $or: [
          { visibleUntil: { $exists: false } },
          { visibleUntil: { $gte: now } },
        ],
      },
    ],
  }).sort({ createdAt: -1 });
};

/**
 * Static method: Find forms by status
 */
FormSchema.statics.findByStatus = function (status: FormStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

/**
 * Pre-save hook: Set published date
 */
FormSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

/**
 * Create and export the Form model
 */
const Form: IFormModel =
  (mongoose.models.Form as IFormModel) ||
  mongoose.model<IForm, IFormModel>('Form', FormSchema);

export default Form;
