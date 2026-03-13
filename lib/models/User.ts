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
 * User streak stats interface
 */
export interface IUserStreak {
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  currentMonthlyStreak: number;
  longestMonthlyStreak: number;
  lastActiveWeek: string;
  lastActiveMonth: string;
  weeklyHoursThisWeek: number;
  monthlyHoursThisMonth: number;
}

/**
 * User aggregated stats interface
 */
export interface IUserStats {
  skateparksVisited: number;
  totalCheckinHours: number;
  guidesCompleted: number;
  quizzesPassed: number;
  eventsAttended: number;
  reviewsWritten: number;
  surveysCompleted: number;
  kudosReceived: number;
  kudosGiven: number;
  challengesCompleted: number;
  pioneerParks: number;
  crownedKingCount: number;
}

/**
 * User interface extending Mongoose Document
 */
export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  username?: string;
  bio?: string;
  profilePhoto?: string;
  addresses: IAddress[];
  preferences: IUserPreferences;
  wishlist: mongoose.Types.ObjectId[];
  relatedSports: string[];
  city?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  resetTokenUsed?: boolean;
  resetTokenAttempts?: number;
  resetTokenIP?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  totalXP: number;
  levelId: number;
  currentRank: number;
  currentSeasonXP: number;
  currentSeasonRank: number;
  streak: IUserStreak;
  crewId?: mongoose.Types.ObjectId | null;
  badges: string[];
  stats: IUserStats;
  pioneerParkIds: mongoose.Types.ObjectId[];
  
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
      minlength: [12, 'Password must be at least 12 characters'],
      select: false, // Don't include password in queries by default
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      trim: true,
      maxlength: [30, 'Username cannot exceed 30 characters'],
      unique: true,
      sparse: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },
    profilePhoto: {
      type: String,
      trim: true,
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
    relatedSports: {
      type: [String],
      default: [],
    },
    city: {
      type: String,
      trim: true,
    },
    resetToken: {
      type: String,
      select: false,
    },
    resetTokenExpiry: {
      type: Date,
      select: false,
    },
    resetTokenUsed: {
      type: Boolean,
      default: false,
      select: false,
    },
    resetTokenAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    resetTokenIP: {
      type: String,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    totalXP: {
      type: Number,
      default: 0,
    },
    levelId: {
      type: Number,
      default: 1,
    },
    currentRank: {
      type: Number,
      default: 0,
    },
    currentSeasonXP: {
      type: Number,
      default: 0,
    },
    currentSeasonRank: {
      type: Number,
      default: 0,
    },
    streak: {
      currentWeeklyStreak: {
        type: Number,
        default: 0,
      },
      longestWeeklyStreak: {
        type: Number,
        default: 0,
      },
      currentMonthlyStreak: {
        type: Number,
        default: 0,
      },
      longestMonthlyStreak: {
        type: Number,
        default: 0,
      },
      lastActiveWeek: {
        type: String,
        default: '',
      },
      lastActiveMonth: {
        type: String,
        default: '',
      },
      weeklyHoursThisWeek: {
        type: Number,
        default: 0,
      },
      monthlyHoursThisMonth: {
        type: Number,
        default: 0,
      },
    },
    crewId: {
      type: Schema.Types.ObjectId,
      ref: 'Crew',
      required: false,
    },
    badges: {
      type: [String],
      default: [],
    },
    stats: {
      skateparksVisited: {
        type: Number,
        default: 0,
      },
      totalCheckinHours: {
        type: Number,
        default: 0,
      },
      guidesCompleted: {
        type: Number,
        default: 0,
      },
      quizzesPassed: {
        type: Number,
        default: 0,
      },
      eventsAttended: {
        type: Number,
        default: 0,
      },
      reviewsWritten: {
        type: Number,
        default: 0,
      },
      surveysCompleted: {
        type: Number,
        default: 0,
      },
      kudosReceived: {
        type: Number,
        default: 0,
      },
      kudosGiven: {
        type: Number,
        default: 0,
      },
      challengesCompleted: {
        type: Number,
        default: 0,
      },
      pioneerParks: {
        type: Number,
        default: 0,
      },
      crownedKingCount: {
        type: Number,
        default: 0,
      },
    },
    pioneerParkIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Skatepark',
      default: [],
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
    toJSON: { virtuals: true, transform: function (_doc, ret: any) {
      delete ret.password;
      delete ret.resetToken;
      delete ret.resetTokenExpiry;
      delete ret.resetTokenUsed;
      delete ret.resetTokenAttempts;
      delete ret.resetTokenIP;
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
  
  // Token expires in 15 minutes
  this.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
  this.resetTokenUsed = false;
  this.resetTokenAttempts = 0;
  
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
      delete userObject.resetTokenUsed;
      delete userObject.resetTokenAttempts;
      delete userObject.resetTokenIP;
  
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
