import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import Commission from '../models/Commission';
import User from '../models/User';
import Product from '../models/Product';
import {
  generateReferralCode,
  addUserToMLMTree,
  getUplineChain,
  getDirectDownline,
  getCompleteDownline,
  getUserCommissionSummary,
} from '../services/mlm.service';

const router = Router();

// Generate or get user's referral code
router.post('/referral-code', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // If user already has a referral code, return it
    if (user.referralCode) {
      return res.json({
        success: true,
        data: {
          referralCode: user.referralCode,
          referralLink: `${process.env.FRONTEND_URL}/signup?ref=${user.referralCode}`,
        },
      });
    }

    // Generate new referral code
    const referralCode = await generateReferralCode();
    user.referralCode = referralCode;
    await user.save();

    res.json({
      success: true,
      data: {
        referralCode,
        referralLink: `${process.env.FRONTEND_URL}/signup?ref=${referralCode}`,
      },
      message: 'Referral code generated successfully',
    });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate referral code',
    });
  }
});

// Add user to MLM tree using referral code
router.post('/join-tree', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required',
      });
    }

    const result = await addUserToMLMTree(req.user._id, referralCode);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        data: {
          placement: result.placement,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('Error joining MLM tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join MLM tree',
    });
  }
});

// Get user's upline chain
router.get('/upline', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const maxLevel = parseInt(req.query.maxLevel as string) || 20;
    const upline = await getUplineChain(req.user._id, maxLevel);

    const uplineData = upline.map((user, index) => ({
      level: index + 1,
      userId: user._id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
    }));

    res.json({
      success: true,
      data: {
        upline: uplineData,
        totalLevels: uplineData.length,
      },
    });
  } catch (error) {
    console.error('Error fetching upline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upline',
    });
  }
});

// Get user's direct downline (left and right children)
router.get('/downline/direct', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const downline = await getDirectDownline(req.user._id);

    res.json({
      success: true,
      data: {
        left: downline.left
          ? {
              userId: downline.left._id,
              name: downline.left.name,
              email: downline.left.email,
              referralCode: downline.left.referralCode,
              totalEarnings: downline.left.totalEarnings,
            }
          : null,
        right: downline.right
          ? {
              userId: downline.right._id,
              name: downline.right.name,
              email: downline.right.email,
              referralCode: downline.right.referralCode,
              totalEarnings: downline.right.totalEarnings,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching direct downline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch downline',
    });
  }
});

// Get complete downline tree
router.get('/downline/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const maxDepth = parseInt(req.query.maxDepth as string) || 20;
    const downline = await getCompleteDownline(req.user._id, maxDepth);

    const downlineData = downline.map((user) => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      totalEarnings: user.totalEarnings,
    }));

    res.json({
      success: true,
      data: {
        downline: downlineData,
        totalMembers: downlineData.length,
      },
    });
  } catch (error) {
    console.error('Error fetching complete downline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complete downline',
    });
  }
});

// Get hierarchical tree structure for visualization
router.get('/tree', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const maxDepth = parseInt(req.query.maxDepth as string) || 5;

    // Recursive function to build tree
    const buildTree = async (userId: any, depth: number): Promise<any> => {
      if (depth >= maxDepth) return null;

      const user = await User.findById(userId).select('_id name email referralCode totalEarnings leftChild rightChild');
      if (!user) return null;

      const leftChild = user.leftChild ? await buildTree(user.leftChild, depth + 1) : null;
      const rightChild = user.rightChild ? await buildTree(user.rightChild, depth + 1) : null;

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        totalEarnings: user.totalEarnings || 0,
        left: leftChild,
        right: rightChild,
        hasChildren: !!(user.leftChild || user.rightChild),
      };
    };

    const treeData = await buildTree(req.user._id, 0);

    res.json({
      success: true,
      data: treeData,
    });
  } catch (error) {
    console.error('Error fetching tree structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tree structure',
    });
  }
});

// Get user's commissions
router.get('/commissions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const query: any = { userId: req.user._id };
    if (status && ['pending', 'paid', 'cancelled'].includes(status)) {
      query.status = status;
    }

    const commissions = await Commission.find(query)
      .populate('fromUserId', 'name email')
      .populate('productId', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Commission.countDocuments(query);

    res.json({
      success: true,
      data: {
        commissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commissions',
    });
  }
});

// Get commission summary
router.get('/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const summary = await getUserCommissionSummary(req.user._id);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission summary',
    });
  }
});

// Admin: Update product commission structure
router.put(
  '/admin/product/:productId/commission',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { productId } = req.params;
      const { commissionStructure } = req.body;

      if (!commissionStructure || !Array.isArray(commissionStructure)) {
        return res.status(400).json({
          success: false,
          message: 'Commission structure must be an array',
        });
      }

      // Validate commission structure
      for (const level of commissionStructure) {
        if (!level.level || level.points === undefined || level.level < 1 || level.level > 20 || level.points < 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid commission structure. Each level must have level (1-20) and points (>= 0)',
          });
        }
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Update product
      product.commissionStructure = commissionStructure;
      await product.save(); // This will trigger the pre-save hook to calculate totals

      res.json({
        success: true,
        message: 'Commission structure updated successfully',
        data: {
          productId: product._id,
          commissionStructure: product.commissionStructure,
          totalCommissionPoints: product.totalCommissionPoints,
        },
      });
    } catch (error) {
      console.error('Error updating commission structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update commission structure',
      });
    }
  }
);

// Admin: Get product commission structure
router.get(
  '/admin/product/:productId/commission',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { productId } = req.params;

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.json({
        success: true,
        data: {
          productId: product._id,
          name: product.name,
          price: product.price,
          cost: product.cost,
          commissionStructure: product.commissionStructure,
          buyerRewardPoints: product.buyerRewardPoints,
          totalCommissionPoints: product.totalCommissionPoints,
        },
      });
    } catch (error) {
      console.error('Error fetching commission structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission structure',
      });
    }
  }
);

export default router;
