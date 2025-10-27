import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Commission from '../models/Commission';
import { IProduct } from '../models/Product';
import { nanoid } from 'nanoid';

/**
 * Generate a unique referral code for a user
 */
export const generateReferralCode = async (): Promise<string> => {
  let code: string;
  let exists = true;

  while (exists) {
    code = nanoid(8).toUpperCase();
    const user = await User.findOne({ referralCode: code });
    exists = !!user;
  }

  return code!;
};

/**
 * Find the first available position in the downline tree (spillover placement)
 */
const findAvailablePosition = async (
  rootUserId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
): Promise<{ parent: IUser; position: 'left' | 'right' } | null> => {
  const queue: mongoose.Types.ObjectId[] = [rootUserId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentUserId = queue.shift()!;
    const currentUserIdStr = currentUserId.toString();

    if (visited.has(currentUserIdStr)) continue;
    visited.add(currentUserIdStr);

    const currentUser = await User.findById(currentUserId).session(session);
    if (!currentUser) continue;

    // Check if left position is available
    if (!currentUser.leftChild) {
      return { parent: currentUser, position: 'left' };
    }

    // Check if right position is available
    if (!currentUser.rightChild) {
      return { parent: currentUser, position: 'right' };
    }

    // Add children to queue for breadth-first search
    if (currentUser.leftChild) queue.push(currentUser.leftChild);
    if (currentUser.rightChild) queue.push(currentUser.rightChild);
  }

  return null; // No available position found (shouldn't happen in practice)
};

/**
 * Add a new user to the MLM tree under a referrer
 * Uses binary tree placement with spillover (left first, then right, then downline)
 */
export const addUserToMLMTree = async (
  newUserId: mongoose.Types.ObjectId,
  referrerCode: string
): Promise<{ success: boolean; message: string; placement?: 'left' | 'right'; sponsor?: string }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find sponsor (the person whose referral code was used)
    const sponsor = await User.findOne({ referralCode: referrerCode }).session(session);

    if (!sponsor) {
      await session.abortTransaction();
      return { success: false, message: 'Invalid referral code' };
    }

    // Check if user is already in tree
    const newUser = await User.findById(newUserId).session(session);
    if (!newUser) {
      await session.abortTransaction();
      return { success: false, message: 'User not found' };
    }

    if (newUser.referredBy) {
      await session.abortTransaction();
      return { success: false, message: 'User already has a referrer' };
    }

    // Find available position (spillover placement)
    const availablePosition = await findAvailablePosition(sponsor._id as mongoose.Types.ObjectId, session);

    if (!availablePosition) {
      await session.abortTransaction();
      return { success: false, message: 'No available position found in the tree' };
    }

    const { parent, position } = availablePosition;

    // Place user in the found position
    if (position === 'left') {
      parent.leftChild = newUserId;
    } else {
      parent.rightChild = newUserId;
    }

    await parent.save({ session });

    // Update new user with referrer (parent in tree structure)
    newUser.referredBy = parent._id as mongoose.Types.ObjectId;
    await newUser.save({ session });

    await session.commitTransaction();

    const parentId = parent._id as mongoose.Types.ObjectId;
    const sponsorId = sponsor._id as mongoose.Types.ObjectId;

    const message = parentId.equals(sponsorId)
      ? `Placed directly under sponsor in ${position} position`
      : `Placed under ${parent.name} (in sponsor's downline) in ${position} position`;

    return {
      success: true,
      message,
      placement: position,
      sponsor: sponsor.name,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding user to MLM tree:', error);
    return { success: false, message: 'Failed to add user to MLM tree' };
  } finally {
    session.endSession();
  }
};

/**
 * Get upline chain for a user (up to specified level)
 */
export const getUplineChain = async (
  userId: mongoose.Types.ObjectId,
  maxLevel: number = 20
): Promise<IUser[]> => {
  const upline: IUser[] = [];
  let currentUser = await User.findById(userId);

  for (let level = 1; level <= maxLevel && currentUser?.referredBy; level++) {
    const referrer = await User.findById(currentUser.referredBy);
    if (!referrer) break;

    upline.push(referrer);
    currentUser = referrer;
  }

  return upline;
};

/**
 * Calculate and distribute commissions for an order
 */
export const distributeCommissions = async (
  orderId: mongoose.Types.ObjectId,
  buyerId: mongoose.Types.ObjectId,
  product: IProduct
): Promise<{ success: boolean; totalDistributed: number; commissionsCreated: number }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get commission structure from product
    const commissionStructure = product.commissionStructure || [];
    const buyerRewardPoints = product.buyerRewardPoints || 0;

    let totalDistributed = 0;
    let commissionsCreated = 0;

    // First, give reward points to the buyer themselves (level 0)
    if (buyerRewardPoints > 0) {
      const buyerCommission = new Commission({
        userId: buyerId,
        fromUserId: buyerId,
        orderId: orderId,
        productId: product._id,
        level: 0, // Level 0 represents buyer's own reward
        points: buyerRewardPoints,
        status: 'pending',
      });

      await buyerCommission.save({ session });

      // Update buyer's points
      await User.findByIdAndUpdate(
        buyerId,
        { $inc: { totalPoints: buyerRewardPoints } },
        { session }
      );

      totalDistributed += buyerRewardPoints;
      commissionsCreated++;
    }

    // If no upline commissions configured, commit and return
    if (commissionStructure.length === 0) {
      await session.commitTransaction();
      return { success: true, totalDistributed, commissionsCreated };
    }

    // Get upline chain
    const upline = await getUplineChain(buyerId, 20);

    // Distribute commission points to upline based on product's commission structure
    for (const levelConfig of commissionStructure) {
      const level = levelConfig.level;
      const points = levelConfig.points;

      // Check if upline exists at this level (level 1 = index 0)
      const uplineUser = upline[level - 1];

      if (!uplineUser || points <= 0) {
        continue; // Skip if no upline at this level or points is 0
      }

      // Create commission record
      const commission = new Commission({
        userId: uplineUser._id,
        fromUserId: buyerId,
        orderId: orderId,
        productId: product._id,
        level: level,
        points: points,
        status: 'pending',
      });

      await commission.save({ session });

      // Update user's points
      await User.findByIdAndUpdate(
        uplineUser._id as mongoose.Types.ObjectId,
        { $inc: { totalPoints: points } },
        { session }
      );

      totalDistributed += points;
      commissionsCreated++;
    }

    await session.commitTransaction();
    return { success: true, totalDistributed, commissionsCreated };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error distributing commissions:', error);
    return { success: false, totalDistributed: 0, commissionsCreated: 0 };
  } finally {
    session.endSession();
  }
};

/**
 * Get downline (direct children) for a user
 */
export const getDirectDownline = async (
  userId: mongoose.Types.ObjectId
): Promise<{ left: IUser | undefined; right: IUser | undefined }> => {
  const user = await User.findById(userId).populate('leftChild rightChild');

  return {
    left: user?.leftChild as unknown as IUser | undefined,
    right: user?.rightChild as unknown as IUser | undefined,
  };
};

/**
 * Get complete downline tree for a user (all descendants)
 */
export const getCompleteDownline = async (
  userId: mongoose.Types.ObjectId,
  maxDepth: number = 20
): Promise<IUser[]> => {
  const allDownline: IUser[] = [];
  const queue: { userId: mongoose.Types.ObjectId; depth: number }[] = [{ userId, depth: 0 }];

  while (queue.length > 0) {
    const { userId: currentUserId, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    const user = await User.findById(currentUserId);
    if (!user) continue;

    if (user.leftChild) {
      const leftUser = await User.findById(user.leftChild);
      if (leftUser) {
        allDownline.push(leftUser);
        queue.push({ userId: user.leftChild, depth: depth + 1 });
      }
    }

    if (user.rightChild) {
      const rightUser = await User.findById(user.rightChild);
      if (rightUser) {
        allDownline.push(rightUser);
        queue.push({ userId: user.rightChild, depth: depth + 1 });
      }
    }
  }

  return allDownline;
};

/**
 * Get user's commission summary
 */
export const getUserCommissionSummary = async (
  userId: mongoose.Types.ObjectId
): Promise<{
  totalEarnings: number;
  pendingWithdrawal: number;
  withdrawnAmount: number;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
}> => {
  const user = await User.findById(userId);

  const commissions = await Commission.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    totalEarnings: user?.totalEarnings || 0,
    pendingWithdrawal: user?.pendingWithdrawal || 0,
    withdrawnAmount: user?.withdrawnAmount || 0,
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0,
  };

  commissions.forEach((comm) => {
    summary.totalCommissions += comm.total;
    if (comm._id === 'paid') {
      summary.paidCommissions = comm.total;
    } else if (comm._id === 'pending') {
      summary.pendingCommissions = comm.total;
    }
  });

  return summary;
};
