import mongoose, { Document, Schema } from 'mongoose';

export interface IInviteToken extends Document {
  tokenHash: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
  note?: string;
}

const inviteTokenSchema = new Schema<IInviteToken>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: String,
      ref: 'User',
      sparse: true,
    },
    usedAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false,
  }
);

inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IInviteToken>('InviteToken', inviteTokenSchema);