export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'shopkeeper' | 'pending';
  totalPoints: number;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  createdAt: Date;
}

export interface InviteToken {
  id: string;
  createdBy: any;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  usedBy?: any;
  usedAt?: Date;
  note?: string;
  isExpired: boolean;
}

export interface ShopkeeperRequest {
  _id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  message?: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: any;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  points: number;
  imageURL: string;
  stock: number;
  category: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Order {
  _id: string;
  userId: string;
  productId: string;
  product: Product;
  quantity: number;
  totalPrice: number;
  pointsEarned: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}