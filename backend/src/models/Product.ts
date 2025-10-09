import mongoose, { Document, Schema } from 'mongoose';

export interface ICommissionLevel {
  level: number;
  amount: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  cost: number; // Cost price for profit calculation
  points: number;
  imageURL: string;
  stock: number;
  category: string;
  isActive: boolean;
  // MLM Commission Structure
  commissionStructure: ICommissionLevel[];
  totalCommission: number; // Auto-calculated sum of all levels
  profitMargin: number; // price - cost - totalCommission
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
    imageURL: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionStructure: [
      {
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
      },
    ],
    totalCommission: {
      type: Number,
      default: 0,
      min: 0,
    },
    profitMargin: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totalCommission and profitMargin before saving
productSchema.pre('save', function (next) {
  if (this.commissionStructure && this.commissionStructure.length > 0) {
    this.totalCommission = this.commissionStructure.reduce(
      (sum, level) => sum + level.amount,
      0
    );
  } else {
    this.totalCommission = 0;
  }

  this.profitMargin = this.price - this.cost - this.totalCommission;
  next();
});

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ price: 1 });

export default mongoose.model<IProduct>('Product', productSchema);