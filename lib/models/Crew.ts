import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocalizedText {
  en: string;
  he: string;
}

export type CrewMemberRole = 'founder' | 'admin' | 'member';

export interface ICrewMember {
  userId: mongoose.Types.ObjectId;
  username: string;
  profilePhoto?: string;
  role: CrewMemberRole;
  joinedAt: Date;
  contributedXP: number;
}

export interface ICrew extends Document {
  name: string;
  slug: string;
  description?: ILocalizedText;
  logo?: string;
  city?: string;
  relatedSports: string[];
  founderId: mongoose.Types.ObjectId;
  founderName: string;
  members: ICrewMember[];
  totalXP: number;
  memberCount: number;
  currentSeasonXP: number;
  currentRank: number;
  currentSeasonRank: number;
  isPublic: boolean;
  requiresApproval: boolean;
  maxMembers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICrewModel extends Model<ICrew> {}

const LocalizedTextSchema = new Schema<ILocalizedText>(
  {
    en: { type: String, required: true, trim: true },
    he: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const CrewMemberSchema = new Schema<ICrewMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['founder', 'admin', 'member'],
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    contributedXP: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const CrewSchema = new Schema<ICrew>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: LocalizedTextSchema,
      required: false,
    },
    logo: {
      type: String,
      required: false,
      trim: true,
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    relatedSports: {
      type: [String],
      default: [],
    },
    founderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    founderName: {
      type: String,
      required: true,
      trim: true,
    },
    members: {
      type: [CrewMemberSchema],
      default: [],
    },
    totalXP: {
      type: Number,
      default: 0,
    },
    memberCount: {
      type: Number,
      default: 1,
    },
    currentSeasonXP: {
      type: Number,
      default: 0,
    },
    currentRank: {
      type: Number,
      default: 0,
    },
    currentSeasonRank: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    maxMembers: {
      type: Number,
      default: 50,
    },
  },
  {
    timestamps: true,
  }
);

const Crew: ICrewModel =
  (mongoose.models.Crew as ICrewModel) || mongoose.model<ICrew, ICrewModel>('Crew', CrewSchema);

export default Crew;

