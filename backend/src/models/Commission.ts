import mongoose, { Document, Schema } from 'mongoose';

export interface ICommission extends Document {
  userId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId; // Who made the purchase
  orderId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  level: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const commissionSchema = new Schema<ICommission>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
commissionSchema.index({ userId: 1, status: 1 });
commissionSchema.index({ userId: 1, createdAt: -1 });
commissionSchema.index({ orderId: 1 });

export default mongoose.model<ICommission>('Commission', commissionSchema);
