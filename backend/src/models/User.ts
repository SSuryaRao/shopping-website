import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  totalPoints: number;
  role: 'customer' | 'shopkeeper' | 'pending';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // MLM fields
  referredBy?: mongoose.Types.ObjectId;
  leftChild?: mongoose.Types.ObjectId;
  rightChild?: mongoose.Types.ObjectId;
  totalEarnings: number;
  pendingWithdrawal: number;
  withdrawnAmount: number;
  referralCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['customer', 'shopkeeper', 'pending'],
      default: 'customer',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    // MLM fields
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    leftChild: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rightChild: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingWithdrawal: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawnAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', userSchema);