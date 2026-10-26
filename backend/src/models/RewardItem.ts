import mongoose, { Document, Schema } from 'mongoose';

// A product the admin puts in the Rewards tab, redeemable with points
export interface IRewardItem extends Document {
  name: string;
  description: string;
  imageURL: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rewardItemSchema = new Schema<IRewardItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    imageURL: {
      type: String,
      required: true,
    },
    pointsRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IRewardItem>('RewardItem', rewardItemSchema);
