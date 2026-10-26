import mongoose, { Document, Schema } from 'mongoose';

// A user's request to redeem points for a reward item. Points are held when requested,
// and returned to the user if the admin rejects the request.
export interface IRewardRedemption extends Document {
  userId: mongoose.Types.ObjectId;
  rewardItemId: mongoose.Types.ObjectId;
  rewardName: string; // Snapshot, so history survives edits to the item
  pointsSpent: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rewardItemId: {
      type: Schema.Types.ObjectId,
      ref: 'RewardItem',
      required: true,
    },
    rewardName: {
      type: String,
      required: true,
    },
    pointsSpent: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

rewardRedemptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IRewardRedemption>('RewardRedemption', rewardRedemptionSchema);
