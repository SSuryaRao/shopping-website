import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getAuth } from './firebase';
import InviteToken from '../models/InviteToken';

export const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashToken = async (token: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(token, saltRounds);
};

export const verifyToken = async (token: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(token, hash);
};

export const isValidInviteToken = async (token: string): Promise<{ valid: boolean; tokenDoc?: any }> => {
  try {
    // Find all non-expired, unused tokens
    const tokens = await InviteToken.find({
      used: false,
      expiresAt: { $gt: new Date() }
    });

    // Check each token hash
    for (const tokenDoc of tokens) {
      const isMatch = await verifyToken(token, tokenDoc.tokenHash);
      if (isMatch) {
        return { valid: true, tokenDoc };
      }
    }

    return { valid: false };
  } catch (error) {
    console.error('Error validating invite token:', error);
    return { valid: false };
  }
};

export const setFirebaseCustomClaims = async (uid: string, claims: any): Promise<void> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    await auth.setCustomUserClaims(uid, claims);
  } catch (error) {
    console.error('Error setting Firebase custom claims:', error);
    throw error;
  }
};

export const createInviteToken = async (
  createdBy: string,
  expiresInHours: number = 72,
  note?: string
): Promise<{ token: string; tokenDoc: any }> => {
  const token = generateInviteToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

  const tokenDoc = new InviteToken({
    tokenHash,
    createdBy,
    expiresAt,
    note,
  });

  await tokenDoc.save();

  return { token, tokenDoc };
};

export const markTokenAsUsed = async (tokenDoc: any, usedBy: string): Promise<void> => {
  tokenDoc.used = true;
  tokenDoc.usedBy = usedBy;
  tokenDoc.usedAt = new Date();
  await tokenDoc.save();
};