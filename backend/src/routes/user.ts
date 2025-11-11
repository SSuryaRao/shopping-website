import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import User from '../models/User';
import Order from '../models/Order';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('-firebaseUid');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        uniqueUserId: user.uniqueUserId,
        email: user.email,
        mobileNumber: user.mobileNumber,
        name: user.name,
        role: user.role,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        totalEarnings: user.totalEarnings,
        pendingWithdrawal: user.pendingWithdrawal,
        withdrawnAmount: user.withdrawnAmount,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Valid name is required',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    ).select('-firebaseUid');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        uniqueUserId: user.uniqueUserId,
        email: user.email,
        mobileNumber: user.mobileNumber,
        name: user.name,
        role: user.role,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        totalEarnings: user.totalEarnings,
        pendingWithdrawal: user.pendingWithdrawal,
        withdrawnAmount: user.withdrawnAmount,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Get user orders
router.get('/orders', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50, page = 1 } = req.query;

    const limitNum = Math.min(parseInt(limit as string), 100);
    const pageNum = Math.max(parseInt(page as string), 1);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find({ userId: req.user._id })
      .populate('productId', 'name imageURL price points')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    const totalOrders = await Order.countDocuments({ userId: req.user._id });

    // Transform the data to match frontend expectations
    const transformedOrders = orders.map(order => ({
      ...order,
      product: order.productId,
      productId: (order.productId as any)?._id,
    }));

    res.json({
      success: true,
      data: transformedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limitNum),
      },
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Get user points balance
router.get('/points', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('totalPoints');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        totalPoints: user.totalPoints,
      },
    });
  } catch (error) {
    console.error('Get user points error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Calculate points discount (for order preview)
router.post('/points/calculate-discount', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, subtotal } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid point amount is required',
      });
      return;
    }

    if (!subtotal || typeof subtotal !== 'number' || subtotal <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid subtotal is required',
      });
      return;
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.totalPoints < amount) {
      res.status(400).json({
        success: false,
        message: 'Insufficient points',
      });
      return;
    }

    // Calculate discount (1 point = $0.01)
    const discount = amount * 0.01;
    const finalTotal = Math.max(subtotal - discount, 0);

    res.json({
      success: true,
      data: {
        pointsToRedeem: amount,
        discount,
        subtotal,
        finalTotal,
        availablePoints: user.totalPoints,
      },
    });
  } catch (error) {
    console.error('Calculate discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;