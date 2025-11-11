import User from '../models/User';
import bcrypt from 'bcrypt';

/**
 * Generate a unique User ID
 * Format: BRI + 6 random digits (e.g., BRI123456)
 */
export const generateUniqueUserId = async (): Promise<string> => {
  const prefix = 'BRI';
  let uniqueId: string;
  let exists = true;

  // Keep generating until we find a unique ID
  while (exists) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    uniqueId = `${prefix}${randomNum}`;

    const user = await User.findOne({ uniqueUserId: uniqueId });
    exists = !!user;
  }

  return uniqueId!;
};

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hashed password
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  // Optional: Add more strength requirements
  // - Must contain uppercase, lowercase, number, special char

  return { valid: true };
};

/**
 * Check account limits for mobile/email
 */
export const checkAccountLimits = async (
  identifier: string,
  type: 'mobile' | 'email'
): Promise<{ allowed: boolean; count: number; message?: string }> => {
  const MAX_ACCOUNTS = 5;

  const query = type === 'mobile'
    ? { mobileNumber: identifier }
    : { email: identifier };

  const count = await User.countDocuments(query);

  if (count >= MAX_ACCOUNTS) {
    return {
      allowed: false,
      count,
      message: `Maximum account limit (${MAX_ACCOUNTS}) reached for this ${type === 'mobile' ? 'mobile number' : 'email'}`
    };
  }

  return { allowed: true, count };
};

/**
 * Validate mobile number format
 */
export const validateMobileNumber = (mobile: string): { valid: boolean; message?: string } => {
  // Remove spaces and special characters
  const cleaned = mobile.replace(/[\s\-\(\)]/g, '');

  // Check if it's a valid phone number (10-15 digits with optional + prefix)
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;

  if (!phoneRegex.test(cleaned)) {
    return { valid: false, message: 'Invalid mobile number format' };
  }

  return { valid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): { valid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }

  return { valid: true };
};
