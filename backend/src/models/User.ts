import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firebaseUid?: string; // Firebase authentication ID (optional for backwards compatibility)
  uniqueUserId: string; // Unique profile identifier (USR123456)
  email?: string; // Email from Firebase Auth
  mobileNumber?: string; // Phone from Firebase Auth
  name: string; // User's real name
  profileName?: string; // Profile display name like "Main Account", "Business Account"
  displayName?: string; // Legacy field - kept for backwards compatibility
  password?: string; // Legacy field - hashed password for old auth system
  totalPoints: number;
  role: 'customer' | 'shopkeeper' | 'pending';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // Account activation fields
  isActive: boolean;
  activatedAt?: Date;
  activatedBy?: mongoose.Types.ObjectId;
  pendingReferralCode?: string; // Stores referral code temporarily until account activation
  // MLM fields
  referredBy?: mongoose.Types.ObjectId;
  leftChild?: mongoose.Types.ObjectId;
  rightChild?: mongoose.Types.ObjectId;
  totalEarnings: number;
  pendingWithdrawal: number;
  withdrawnAmount: number;
  referralCode: string;
  lastLoginAt?: Date; // Track last login for analytics
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      sparse: true, // Sparse index allows multiple null/undefined values
    },
    uniqueUserId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profileName: {
      type: String,
      trim: true,
      default: 'Main Account',
    },
    displayName: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't return password in queries by default
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
    // Account activation fields
    isActive: {
      type: Boolean,
      default: false,
      index: true, // For querying pending users
    },
    activatedAt: {
      type: Date,
    },
    activatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pendingReferralCode: {
      type: String,
      trim: true,
      uppercase: true,
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
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Sparse unique index on firebaseUid - allows multiple null values but unique non-null values
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });

// Compound indexes for efficient multi-profile queries
userSchema.index({ firebaseUid: 1, uniqueUserId: 1 }); // Find all profiles for a Firebase user
userSchema.index({ mobileNumber: 1, uniqueUserId: 1 }); // Legacy mobile auth
userSchema.index({ email: 1, uniqueUserId: 1 }); // Legacy email auth

// Validation: Must have at least one identifier
userSchema.pre('validate', function (next) {
  if (!this.email && !this.mobileNumber && !this.firebaseUid) {
    next(new Error('User must have at least one identifier: email, mobile number, or Firebase UID'));
  } else {
    next();
  }
});

export default mongoose.model<IUser>('User', userSchema);