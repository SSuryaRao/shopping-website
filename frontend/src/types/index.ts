export interface User {
  id: string;
  uniqueUserId: string; // Unique profile ID (USR123456)
  firebaseUid?: string; // Firebase authentication ID (optional for backwards compatibility)
  email?: string;
  mobileNumber?: string;
  name: string;
  profileName?: string; // Profile display name (e.g., "Main Account", "Business")
  displayName?: string; // Legacy field for backwards compatibility
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
  createdAt?: Date;
}

// Profile selector types
export interface ProfileOption {
  uniqueUserId: string;
  profileName: string;
  name: string;
  role: 'customer' | 'shopkeeper' | 'pending';
  totalPoints: number;
  isAdmin: boolean;
  isCurrent?: boolean;
}

// Legacy - keeping for backwards compatibility
export interface AccountOption {
  uniqueUserId: string;
  displayName: string;
  name: string;
  role: 'customer' | 'shopkeeper' | 'pending';
  totalPoints: number;
  isAdmin: boolean;
}

export interface MultiAccountResponse {
  success: true;
  requiresSelection: true;
  accounts: AccountOption[];
  tempToken: string;
}

export interface SingleAccountResponse {
  success: true;
  token: string;
  user: User;
}

export type LoginResponse = MultiAccountResponse | SingleAccountResponse;

// Registration types
export interface RegistrationData {
  registrationType: 'mobile' | 'email' | 'google';
  mobileNumber?: string;
  email?: string;
  password?: string;
  name: string;
  displayName?: string;
  role: 'customer' | 'shopkeeper';
  referralCode?: string;
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
  points: number;
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
  buyerRewardPoints: number;
  totalCommissionPoints: number;
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