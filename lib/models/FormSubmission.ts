import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

/**
 * Form submission answer interface
 */
export interface IFormSubmissionAnswer {
  fieldId: string;
  question: ILocalizedField;
  answer: any; // Can be string, number, array, etc. depending on field type
  fieldType: string;
}

/**
 * FormSubmission interface extending Mongoose Document
 */
export interface IFormSubmission extends Document {
  formId: mongoose.Types.ObjectId;
  formSlug: string;
  answers: IFormSubmissionAnswer[];
  submittedAt: Date;
  userFingerprint: string; // Hash of IP + User-Agent for duplicate detection
  ipAddress: string; // Hashed for privacy
  userAgent: string; // Hashed
}

/**
 * FormSubmission Model interface with static methods
 */
export interface IFormSubmissionModel extends Model<IFormSubmission> {
  findByFormId(formId: mongoose.Types.ObjectId): Promise<IFormSubmission[]>;
  findByFormSlug(formSlug: string): Promise<IFormSubmission[]>;
  findByFingerprint(formId: mongoose.Types.ObjectId, fingerprint: string): Promise<IFormSubmission | null>;
  countByFormId(formId: mongoose.Types.ObjectId): Promise<number>;
}

/**
 * Form submission answer schema
 */
const FormSubmissionAnswerSchema = new Schema<IFormSubmissionAnswer>(
  {
    fieldId: {
      type: String,
      required: true,
    },
    question: {
      en: {
        type: String,
        required: true,
      },
      he: {
        type: String,
        required: true,
      },
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true,
    },
    fieldType: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

/**
 * FormSubmission schema definition
 */
const FormSubmissionSchema: Schema<IFormSubmission> = new Schema<IFormSubmission>(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      index: true,
    },
    formSlug: {
      type: String,
      required: true,
      index: true,
    },
    answers: {
      type: [FormSubmissionAnswerSchema],
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    userFingerprint: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Compound index for duplicate detection
 */
FormSubmissionSchema.index({ formId: 1, userFingerprint: 1 }, { unique: true });

/**
 * Indexes for performance
 */
FormSubmissionSchema.index({ formSlug: 1, submittedAt: -1 });
FormSubmissionSchema.index({ submittedAt: -1 });

/**
 * Static method: Find submissions by form ID
 */
FormSubmissionSchema.statics.findByFormId = function (formId: mongoose.Types.ObjectId) {
  return this.find({ formId }).sort({ submittedAt: -1 });
};

/**
 * Static method: Find submissions by form slug
 */
FormSubmissionSchema.statics.findByFormSlug = function (formSlug: string) {
  return this.find({ formSlug }).sort({ submittedAt: -1 });
};

/**
 * Static method: Find submission by form ID and fingerprint (for duplicate detection)
 */
FormSubmissionSchema.statics.findByFingerprint = function (
  formId: mongoose.Types.ObjectId,
  fingerprint: string
) {
  return this.findOne({ formId, userFingerprint: fingerprint });
};

/**
 * Static method: Count submissions by form ID
 */
FormSubmissionSchema.statics.countByFormId = function (formId: mongoose.Types.ObjectId) {
  return this.countDocuments({ formId });
};

/**
 * Create and export the FormSubmission model
 */
const FormSubmission: IFormSubmissionModel =
  (mongoose.models.FormSubmission as IFormSubmissionModel) ||
  mongoose.model<IFormSubmission, IFormSubmissionModel>('FormSubmission', FormSubmissionSchema);

export default FormSubmission;
