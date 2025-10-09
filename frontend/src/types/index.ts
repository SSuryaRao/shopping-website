export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'shopkeeper' | 'pending';
  totalPoints: number;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  // MLM fields
  referredBy?: string;
  leftChild?: string;
  rightChild?: string;
  totalEarnings: number;
  pendingWithdrawal: number;
  withdrawnAmount: number;
  referralCode?: string;
  createdAt: Date;
}

export interface InviteToken {
  id: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  usedBy?: {
    id: string;
    name: string;
    email: string;
  };
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
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  };
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface CommissionLevel {
  level: number;
  amount: number;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  points: number;
  imageURL: string;
  stock: number;
  category: string;
  isActive: boolean;
  // MLM fields
  commissionStructure: CommissionLevel[];
  totalCommission: number;
  profitMargin: number;
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

export interface Commission {
  _id: string;
  userId: string;
  fromUserId: {
    _id: string;
    name: string;
    email: string;
  };
  orderId: string;
  productId: {
    _id: string;
    name: string;
    price: number;
  };
  level: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: Date;
}

export interface CommissionSummary {
  totalEarnings: number;
  pendingWithdrawal: number;
  withdrawnAmount: number;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
}

export interface UplineUser {
  level: number;
  userId: string;
  name: string;
  email: string;
  referralCode?: string;
}

export interface DownlineUser {
  userId: string;
  name: string;
  email: string;
  referralCode?: string;
  totalEarnings: number;
}

export interface MLMTreeNode {
  id: string;
  name: string;
  email: string;
  referralCode?: string;
  totalEarnings: number;
  left: MLMTreeNode | null;
  right: MLMTreeNode | null;
  hasChildren: boolean;
}