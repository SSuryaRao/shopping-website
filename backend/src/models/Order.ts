import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  totalPrice: number;
  pointsEarned: number;
  status: 'pending_admin_approval' | 'admin_approved' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: mongoose.Types.ObjectId;
  // Manual payment details (verified by admin before approval)
  paymentMethod?: 'cash' | 'qr';
  cashPaidTo?: string; // Name of the person the cash was handed to
  paymentScreenshot?: string; // Private storage key (see utils/uploads.ts), never a public URL
  checkoutId?: string; // Groups the per-product orders created by one checkout
  checkoutTotal?: number; // Total amount paid for the whole checkout
  // Admin approval fields
  adminApprovedBy?: mongoose.Types.ObjectId;
  adminApprovedAt?: Date;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    pointsEarned: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending_admin_approval', 'admin_approved', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
      default: 'pending_admin_approval',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'qr'],
    },
    cashPaidTo: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    paymentScreenshot: {
      type: String,
    },
    checkoutId: {
      type: String,
      index: true,
    },
    checkoutTotal: {
      type: Number,
      min: 0,
    },
    // Admin approval fields
    adminApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    adminApprovedAt: {
      type: Date,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>('Order', orderSchema);