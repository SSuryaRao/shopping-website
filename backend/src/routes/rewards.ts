import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest, requireAdmin, requireActiveAccount } from '../middleware/auth';
import RewardItem from '../models/RewardItem';
import RewardRedemption from '../models/RewardRedemption';
import User from '../models/User';
import { imageUpload, uploadToCloudStorage, generateFileName } from '../utils/uploads';

const router = Router();

// Parse a whole number from form data; null if missing, not a number, or below min
const parseWholeNumber = (value: unknown, min: number): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isInteger(num) && num >= min ? num : null;
};

// ==================== ADMIN: REWARD ITEMS ====================

// Get all reward items, including inactive ones
router.get('/admin/items', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const items = await RewardItem.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Admin get reward items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create reward item
router.post('/admin/items', authenticateToken, requireAdmin, imageUpload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, pointsRequired, stock, isActive } = req.body;

    if (!name || !pointsRequired || stock === undefined || stock === '') {
      return res.status(400).json({
        success: false,
        message: 'Name, points required and stock are required',
      });
    }

    const points = parseWholeNumber(pointsRequired, 1);
    const stockCount = parseWholeNumber(stock, 0);
    if (points === null || stockCount === null) {
      return res.status(400).json({
        success: false,
        message: 'Points required must be a whole number of at least 1, and stock a whole number of 0 or more',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Reward image is required',
      });
    }

    let imageURL;
    try {
      imageURL = await uploadToCloudStorage(req.file, generateFileName(req.file), 'rewards');
    } catch (uploadError) {
      console.error('Reward image upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image. Please try again.',
      });
    }

    const item = new RewardItem({
      name: name.trim(),
      description: (description || '').trim(),
      imageURL,
      pointsRequired: points,
      stock: stockCount,
      isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
    });

    await item.save();

    res.status(201).json({
      success: true,
      message: 'Reward item created successfully',
      data: item,
    });
  } catch (error) {
    console.error('Create reward item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update reward item
router.put('/admin/items/:id', authenticateToken, requireAdmin, imageUpload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, pointsRequired, stock, isActive } = req.body;

    const item = await RewardItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Reward item not found' });
    }

    if (pointsRequired !== undefined) {
      const points = parseWholeNumber(pointsRequired, 1);
      if (points === null) {
        return res.status(400).json({ success: false, message: 'Points required must be a whole number of at least 1' });
      }
      item.pointsRequired = points;
    }
    if (stock !== undefined) {
      const stockCount = parseWholeNumber(stock, 0);
      if (stockCount === null) {
        return res.status(400).json({ success: false, message: 'Stock must be a whole number of 0 or more' });
      }
      item.stock = stockCount;
    }
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      item.name = name.trim();
    }
    if (description !== undefined) item.description = description.trim();
    if (isActive !== undefined) item.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      try {
        item.imageURL = await uploadToCloudStorage(req.file, generateFileName(req.file), 'rewards');
      } catch (uploadError) {
        console.error('Reward image upload failed during update:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new image. Please try again.',
        });
      }
    }

    await item.save();

    res.json({
      success: true,
      message: 'Reward item updated successfully',
      data: item,
    });
  } catch (error) {
    console.error('Update reward item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Deactivate reward item (soft delete, keeps redemption history intact)
router.delete('/admin/items/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const item = await RewardItem.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Reward item not found' });
    }

    res.json({ success: true, message: 'Reward item deactivated successfully' });
  } catch (error) {
    console.error('Delete reward item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== ADMIN: REDEMPTIONS ====================

// List redemptions, optionally filtered by status (?status=pending)
router.get('/admin/redemptions', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { status } = req.query;
    const query: Record<string, unknown> = {};
    if (typeof status === 'string' && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const redemptions = await RewardRedemption.find(query)
      .populate('userId', 'uniqueUserId name email mobileNumber')
      .populate('rewardItemId', 'name imageURL')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, data: redemptions, count: redemptions.length });
  } catch (error) {
    console.error('Admin get redemptions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve a redemption (reward handed over to the user)
router.post('/admin/redemptions/:id/approve', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const redemption = await RewardRedemption.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        status: 'approved',
        adminNotes: req.body.adminNotes || undefined,
        processedBy: req.user._id,
        processedAt: new Date(),
      },
      { new: true }
    );

    if (!redemption) {
      return res.status(400).json({ success: false, message: 'Redemption not found or already processed' });
    }

    res.json({ success: true, message: 'Redemption approved', data: redemption });
  } catch (error) {
    console.error('Approve redemption error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject a redemption - returns the points to the user and the item to stock
router.post('/admin/redemptions/:id/reject', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    // Conditional update so the refund can only ever happen once
    const redemption = await RewardRedemption.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        status: 'rejected',
        adminNotes: `Rejected: ${reason}`,
        processedBy: req.user._id,
        processedAt: new Date(),
      },
      { new: true }
    );

    if (!redemption) {
      return res.status(400).json({ success: false, message: 'Redemption not found or already processed' });
    }

    await User.findByIdAndUpdate(redemption.userId, { $inc: { totalPoints: redemption.pointsSpent } });
    await RewardItem.findByIdAndUpdate(redemption.rewardItemId, { $inc: { stock: 1 } });

    res.json({ success: true, message: 'Redemption rejected and points returned', data: redemption });
  } catch (error) {
    console.error('Reject redemption error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== USER ====================

// Get active reward items
router.get('/', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const items = await RewardItem.find({ isActive: true }).sort({ pointsRequired: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get reward items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get the current user's redemption history
router.get('/my-redemptions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const redemptions = await RewardRedemption.find({ userId: req.user._id })
      .populate('rewardItemId', 'name imageURL')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, data: redemptions });
  } catch (error) {
    console.error('Get my redemptions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Redeem points for a reward item
router.post('/:id/redeem', authenticateToken, requireActiveAccount, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid reward item' });
    }

    // 1. Reserve one unit of stock (atomic, so two users can't take the last one)
    const item = await RewardItem.findOneAndUpdate(
      { _id: req.params.id, isActive: true, stock: { $gte: 1 } },
      { $inc: { stock: -1 } },
      { new: true }
    );

    if (!item) {
      return res.status(400).json({ success: false, message: 'This reward is out of stock or no longer available' });
    }

    // 2. Deduct points only if the user still has enough (atomic)
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, totalPoints: { $gte: item.pointsRequired } },
      { $inc: { totalPoints: -item.pointsRequired } },
      { new: true }
    );

    if (!user) {
      await RewardItem.findByIdAndUpdate(item._id, { $inc: { stock: 1 } });
      return res.status(400).json({
        success: false,
        message: `Not enough points. You need ${item.pointsRequired} points for this reward.`,
      });
    }

    // 3. Record the request for admin approval
    try {
      const redemption = await RewardRedemption.create({
        userId: user._id,
        rewardItemId: item._id,
        rewardName: item.name,
        pointsSpent: item.pointsRequired,
        status: 'pending',
      });

      res.status(201).json({
        success: true,
        message: 'Reward requested! The admin will review it soon.',
        data: {
          redemption,
          remainingPoints: user.totalPoints,
        },
      });
    } catch (createError) {
      // Undo the reservation if the record could not be saved
      await User.findByIdAndUpdate(user._id, { $inc: { totalPoints: item.pointsRequired } });
      await RewardItem.findByIdAndUpdate(item._id, { $inc: { stock: 1 } });
      throw createError;
    }
  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
