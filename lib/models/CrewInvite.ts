import mongoose, { Schema, Document, Model } from 'mongoose';

export type CrewInviteStatus = 'pending' | 'accepted' | 'declined';

export interface ICrewInvite extends Document {
  crewId: mongoose.Types.ObjectId;
  invitedUserId: mongoose.Types.ObjectId;
  invitedByUserId: mongoose.Types.ObjectId;
  status: CrewInviteStatus;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ICrewInviteModel extends Model<ICrewInvite> {}

const CrewInviteSchema = new Schema<ICrewInvite>(
  {
    crewId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Crew',
    },
    invitedUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    invitedByUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const CrewInvite: ICrewInviteModel =
  (mongoose.models.CrewInvite as ICrewInviteModel) ||
  mongoose.model<ICrewInvite, ICrewInviteModel>('CrewInvite', CrewInviteSchema);

export default CrewInvite;

