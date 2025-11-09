import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Address interface
 */
export interface IAddress {
  type: 'home' | 'work' | 'other';
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

/**
 * User preferences interface
 */
export interface IUserPreferences {
  language: 'en' | 'he';
  colorMode: 'light' | 'dark' | 'system';
  emailMarketing: boolean;
}

/**
 * User role type
 */
export type UserRole = 'user' | 'editor' | 'admin';

/**
 * User interface extending Mongoose Document
 */
export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  addresses: IAddress[];
  preferences: IUserPreferences;
  wishlist: mongoose.Types.ObjectId[];
  resetToken?: string;
  resetTokenExpiry?: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
  toJSON(): any;
  isAdmin(): boolean;
  isEditor(): boolean;
  getDefaultAddress(): IAddress | undefined;
}

/**
 * User Model interface with static methods
 */
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findAdmins(): Promise<IUser[]>;
}

/**
 * User schema definition
 */
const UserSchema: Schema<IUser> = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'editor', 'admin'],
      default: 'user',
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ['home', 'work', 'other'],
          required: true,
        },
        name: {
          type: String,
          required: [true, 'Address name is required'],
          trim: true,
        },
        street: {
          type: String,
          required: [true, 'Street address is required'],
          trim: true,
        },
        city: {
          type: String,
          required: [true, 'City is required'],
          trim: true,
        },
        zip: {
          type: String,
          required: [true, 'ZIP code is required'],
          trim: true,
        },
        country: {
          type: String,
          required: [true, 'Country is required'],
          trim: true,
        },
        phone: {
          type: String,
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    preferences: {
      language: {
        type: String,
        enum: ['en', 'he'],
        default: 'en',
      },
      colorMode: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      emailMarketing: {
        type: Boolean,
        default: false,
      },
    },
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    resetToken: {
      type: String,
      select: false,
    },
    resetTokenExpiry: {
      type: Date,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
    toJSON: { virtuals: true, transform: function (_doc, ret: any) {
      delete ret.password;
      delete ret.resetToken;
      delete ret.resetTokenExpiry;
      return ret;
    }},
    toObject: { virtuals: true },
  }
);

/**
 * Indexes for performance
 * Note: email index is automatically created by unique: true in schema
 * Only need to manually create role index
 */
if (!UserSchema.indexes().some(index => JSON.stringify(index) === JSON.stringify({ role: 1 }))) {
  UserSchema.index({ role: 1 });
}

/**
 * Pre-save middleware to hash password
 */
UserSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Pre-save middleware for addresses
 * Ensure only one default address
 */
UserSchema.pre('save', async function (next) {
  if (this.isModified('addresses') && this.addresses.length > 0) {
    // Count default addresses
    const defaultAddresses = this.addresses.filter((addr) => addr.isDefault);
    
    // If more than one default, keep only the first one
    if (defaultAddresses.length > 1) {
      let foundFirst = false;
      this.addresses.forEach((addr) => {
        if (addr.isDefault && foundFirst) {
          addr.isDefault = false;
        } else if (addr.isDefault) {
          foundFirst = true;
        }
      });
    }
  }
  next();
});

/**
 * Instance method to compare password
 */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

/**
 * Instance method to generate reset token
 */
UserSchema.methods.generateResetToken = function (): string {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Token expires in 1 hour
  this.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  
  return resetToken;
};

/**
 * Instance method to exclude sensitive fields from JSON
 */
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.resetToken;
  delete userObject.resetTokenExpiry;
  
  return userObject;
};

/**
 * Static method to find by email
 */
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Static method to find admin users
 */
UserSchema.statics.findAdmins = function () {
  return this.find({ role: 'admin' });
};

/**
 * Instance method to check if user is admin
 */
UserSchema.methods.isAdmin = function (): boolean {
  return this.role === 'admin';
};

/**
 * Instance method to check if user is editor or admin
 */
UserSchema.methods.isEditor = function (): boolean {
  return this.role === 'editor' || this.role === 'admin';
};

/**
 * Instance method to get default address
 */
UserSchema.methods.getDefaultAddress = function (): IAddress | undefined {
  return this.addresses.find((addr: IAddress) => addr.isDefault) || this.addresses[0];
};

/**
 * Virtual property to check if email is verified
 */
UserSchema.virtual('isVerified').get(function () {
  return this.emailVerified;
});

/**
 * Create and export the User model
 */
const User: IUserModel =
  (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;

/**
 * Helper types for easier imports
 * (Types are already exported above)
 */
