import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Event signup status type
 */
export type EventSignupStatus = 'pending' | 'confirmed' | 'cancelled';

/**
 * Form field interface for dynamic fields
 */
export interface IFormField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox';
  value: string | number | boolean;
  label?: string;
}

/**
 * Event signup interface extending Mongoose Document
 */
export interface IEventSignup extends Document {
  eventId: mongoose.Types.ObjectId;
  eventSlug: string;
  
  // Form data (dynamic fields from builder)
  formData: IFormField[];
  
  // User information (if authenticated)
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userName?: string;
  
  // Submission metadata
  submittedAt: Date;
  confirmationNumber: string;
  status: EventSignupStatus;
  
  // IP and device info for rate limiting
  ipAddress?: string;
  userAgent?: string;
  
  // Additional notes
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Signup Model interface with static methods
 */
export interface IEventSignupModel extends Model<IEventSignup> {
  findByConfirmationNumber(confirmationNumber: string): Promise<IEventSignup | null>;
  findByEventId(eventId: string | mongoose.Types.ObjectId): Promise<IEventSignup[]>;
  findByUserId(userId: string | mongoose.Types.ObjectId): Promise<IEventSignup[]>;
  findDuplicate(eventId: string | mongoose.Types.ObjectId, email: string, ipAddress?: string): Promise<IEventSignup | null>;
  countByEventId(eventId: string | mongoose.Types.ObjectId): Promise<number>;
  generateConfirmationNumber(): string;
}

/**
 * Event signup schema definition
 */
const EventSignupSchema: Schema<IEventSignup> = new Schema<IEventSignup>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    eventSlug: {
      type: String,
      required: [true, 'Event slug is required'],
      index: true,
    },
    formData: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ['text', 'email', 'phone', 'number', 'select', 'textarea', 'checkbox'],
          required: true,
        },
        value: {
          type: Schema.Types.Mixed,
          required: true,
        },
        label: {
          type: String,
          trim: true,
        },
      },
    ],
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    confirmationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
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
EventSignupSchema.index({ eventId: 1, status: 1 });
EventSignupSchema.index({ userId: 1, eventId: 1 });
EventSignupSchema.index({ userEmail: 1, eventId: 1 });
EventSignupSchema.index({ ipAddress: 1, eventId: 1, submittedAt: -1 });

/**
 * Static method: Find signup by confirmation number
 */
EventSignupSchema.statics.findByConfirmationNumber = function (confirmationNumber: string) {
  return this.findOne({ confirmationNumber });
};

/**
 * Static method: Find signups by event ID
 */
EventSignupSchema.statics.findByEventId = function (eventId: string | mongoose.Types.ObjectId) {
  return this.find({ eventId, status: { $ne: 'cancelled' } }).sort({ submittedAt: -1 });
};

/**
 * Static method: Find signups by user ID
 */
EventSignupSchema.statics.findByUserId = function (userId: string | mongoose.Types.ObjectId) {
  return this.find({ userId }).sort({ submittedAt: -1 });
};

/**
 * Static method: Find duplicate signup
 */
EventSignupSchema.statics.findDuplicate = function (
  eventId: string | mongoose.Types.ObjectId,
  email: string,
  ipAddress?: string
) {
  const query: any = {
    eventId,
    userEmail: email.toLowerCase(),
    status: { $ne: 'cancelled' },
  };
  
  // Also check by IP if provided (for anonymous users)
  if (ipAddress && !email) {
    query.$or = [
      { ipAddress },
      { userEmail: email.toLowerCase() },
    ];
  }
  
  return this.findOne(query);
};

/**
 * Static method: Count signups by event ID
 */
EventSignupSchema.statics.countByEventId = function (eventId: string | mongoose.Types.ObjectId) {
  return this.countDocuments({ eventId, status: { $ne: 'cancelled' } });
};

/**
 * Static method: Generate unique confirmation number
 */
EventSignupSchema.statics.generateConfirmationNumber = function (): string {
  const prefix = 'EVT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Instance method: Check if signup is confirmed
 */
EventSignupSchema.methods.isConfirmed = function (): boolean {
  return this.status === 'confirmed';
};

/**
 * Instance method: Check if signup is cancelled
 */
EventSignupSchema.methods.isCancelled = function (): boolean {
  return this.status === 'cancelled';
};

/**
 * Pre-save middleware: Generate confirmation number if not present
 */
EventSignupSchema.pre('save', async function (next) {
  if (!this.confirmationNumber) {
    let confirmationNumber: string;
    let exists: boolean;
    
    // Ensure unique confirmation number
    do {
      confirmationNumber = EventSignupSchema.statics.generateConfirmationNumber();
      exists = await this.constructor.findOne({ confirmationNumber });
    } while (exists);
    
    this.confirmationNumber = confirmationNumber;
  }
  
  // Extract email from formData if not set
  if (!this.userEmail && this.formData) {
    const emailField = this.formData.find((field) => field.type === 'email');
    if (emailField && typeof emailField.value === 'string') {
      this.userEmail = emailField.value.toLowerCase();
    }
  }
  
  // Extract name from formData if not set
  if (!this.userName && this.formData) {
    const nameField = this.formData.find((field) => 
      field.name.toLowerCase().includes('name') || field.label?.toLowerCase().includes('name')
    );
    if (nameField && typeof nameField.value === 'string') {
      this.userName = nameField.value;
    }
  }
  
  next();
});

/**
 * Create and export the EventSignup model
 */
const EventSignup: IEventSignupModel =
  (mongoose.models.EventSignup as IEventSignupModel) ||
  mongoose.model<IEventSignup, IEventSignupModel>('EventSignup', EventSignupSchema);

export default EventSignup;


