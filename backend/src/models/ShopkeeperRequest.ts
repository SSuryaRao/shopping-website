import mongoose, { Document, Schema } from 'mongoose';

export interface IShopkeeperRequest extends Document {
  firebaseUid?: string;
  name: string;
  email: string;
  message?: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

const shopkeeperRequestSchema = new Schema<IShopkeeperRequest>(
  {
    firebaseUid: {
      type: String,
      ref: 'User',
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: String,
      ref: 'User',
      sparse: true,
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: false,
  }
);

shopkeeperRequestSchema.index({ email: 1, status: 1 });

export default mongoose.model<IShopkeeperRequest>('ShopkeeperRequest', shopkeeperRequestSchema);