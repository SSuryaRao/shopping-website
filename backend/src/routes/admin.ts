import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import Product from '../models/Product';
import User from '../models/User';
import Order from '../models/Order';
import { distributeCommissions, addUserToMLMTree } from '../services/mlm.service';
import { uploadToGCS, getBucket } from '../utils/storage';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to upload file to Google Cloud Storage with local fallback
const uploadToCloudStorage = async (file: Express.Multer.File, fileName: string): Promise<string> => {
  const bucket = getBucket();

  // Try Google Cloud Storage first
  if (bucket) {
    try {
      const publicUrl = await uploadToGCS(file.buffer, fileName, file.mimetype, 'products');
      console.log(`✅ Uploaded to GCS: ${fileName}`);
      return publicUrl;
    } catch (error) {
      console.warn('Google Cloud Storage upload failed, falling back to local storage:', error);
      return uploadToLocalStorage(file, fileName);
    }
  } else {
    console.log('Google Cloud Storage not configured, using local storage');
    return uploadToLocalStorage(file, fileName);
  }
};

// Helper function to upload file to local storage
const uploadToLocalStorage = async (file: Express.Multer.File, fileName: string): Promise<string> => {
  const filePath = path.join(uploadsDir, fileName);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, file.buffer, (error) => {
      if (error) {
        reject(error);
      } else {
        // Return URL relative to the server
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const publicUrl = `${baseUrl}/uploads/${fileName}`;
        resolve(publicUrl);
      }
    });
  });
};

// Get all products (admin)
router.get('/products', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 100, page = 1, search } = req.query;

    let query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const limitNum = Math.min(parseInt(limit as string), 100);
    const pageNum = Math.max(parseInt(page as string), 1);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    const totalProducts = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalProducts,
        pages: Math.ceil(totalProducts / limitNum),
      },
    });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Create product
router.post('/products', authenticateToken, requireAdmin, upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, price, cost, points, stock, category, isActive, buyerRewardPoints, commissionStructure } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (!name || !description || !price || !cost || !points || !stock || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Product image is required',
      });
    }

    // Upload image to Google Cloud Storage (with local fallback)
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${imageFile.originalname.split('.').pop()}`;
    let imageURL;
    try {
      imageURL = await uploadToCloudStorage(imageFile, fileName);
    } catch (uploadError) {
      console.error('Image upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image. Please try again.',
      });
    }

    // Parse MLM fields
    const parsedBuyerRewardPoints = buyerRewardPoints ? parseInt(buyerRewardPoints) : 0;
    const parsedCommissionStructure = commissionStructure ? JSON.parse(commissionStructure) : [];

    // Create product
    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      cost: parseFloat(cost),
      points: parseInt(points),
      imageURL,
      stock: parseInt(stock),
      category: category.trim().toLowerCase(),
      isActive: isActive === 'true' || isActive === true,
      buyerRewardPoints: parsedBuyerRewardPoints,
      commissionStructure: parsedCommissionStructure,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Update product
router.put('/products/:id', authenticateToken, requireAdmin, upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, price, cost, points, stock, category, isActive, buyerRewardPoints, commissionStructure } = req.body;
    const imageFile = req.file;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Update fields if provided
    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (cost !== undefined) product.cost = parseFloat(cost);
    if (points !== undefined) product.points = parseInt(points);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (category !== undefined) product.category = category.trim().toLowerCase();
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;

    // Update MLM fields
    if (buyerRewardPoints !== undefined) product.buyerRewardPoints = parseInt(buyerRewardPoints);
    if (commissionStructure !== undefined) {
      product.commissionStructure = JSON.parse(commissionStructure);
    }

    // Update image if new one provided
    if (imageFile) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${imageFile.originalname.split('.').pop()}`;
      try {
        const imageURL = await uploadToCloudStorage(imageFile, fileName);
        product.imageURL = imageURL;
      } catch (uploadError) {
        console.error('Image upload failed during product update:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new image. Please try again.',
        });
      }
    }

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Delete product
router.delete('/products/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Instead of hard delete, mark as inactive
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Get all orders (only paid orders)
router.get('/orders', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const Order = (await import('../models/Order')).default;

    const orders = await Order.find({ paymentStatus: 'paid' })
      .populate('userId', 'name email')
      .populate('productId', 'name imageURL price')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Update order status
router.patch('/orders/:id/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const Order = (await import('../models/Order')).default;
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('userId', 'name email')
      .populate('productId', 'name imageURL price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ==================== USER ACTIVATION ENDPOINTS ====================

// Get all pending (inactive) users
router.get('/users/pending', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const pendingUsers = await User.find({ isActive: false })
      .select('_id uniqueUserId name email mobileNumber role createdAt isActive')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingUsers,
      count: pendingUsers.length,
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending users',
    });
  }
});

// Get all users (active and inactive)
router.get('/users/all', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    console.log('GET /admin/users/all - Admin user:', req.user?.email || req.user?.uniqueUserId);

    const allUsers = await User.find({})
      .select('_id uniqueUserId name email mobileNumber role createdAt isActive totalPoints totalEarnings')
      .sort({ createdAt: -1 });

    console.log(`Found ${allUsers.length} total users`);

    res.json({
      success: true,
      data: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
});

// Activate a user account
router.post('/users/:userId/activate', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already activated',
      });
    }

    // Activate user
    user.isActive = true;
    user.activatedAt = new Date();
    user.activatedBy = adminId;
    await user.save();

    // If user has a pending referral code, add them to MLM tree
    let mlmTreeMessage = '';
    if (user.pendingReferralCode) {
      const referralCode = user.pendingReferralCode; // Store before clearing
      const mlmResult = await addUserToMLMTree(user._id as mongoose.Types.ObjectId, referralCode);
      if (mlmResult.success) {
        mlmTreeMessage = ` and added to MLM tree under sponsor ${referralCode}`;
        // Clear the pending referral code after successful placement
        user.set('pendingReferralCode', undefined);
        await user.save();
      } else {
        mlmTreeMessage = `, but failed to add to MLM tree: ${mlmResult.message}`;
      }
    }

    res.json({
      success: true,
      message: `User ${user.name} (${user.uniqueUserId}) activated successfully${mlmTreeMessage}`,
      data: {
        userId: user._id,
        uniqueUserId: user.uniqueUserId,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        activatedAt: user.activatedAt,
      },
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
    });
  }
});

// Deactivate a user account
router.post('/users/:userId/deactivate', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already inactive',
      });
    }

    // Prevent deactivating super admin
    if (user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate super admin',
      });
    }

    // Deactivate user
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} (${user.uniqueUserId}) deactivated successfully`,
      data: {
        userId: user._id,
        uniqueUserId: user.uniqueUserId,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
    });
  }
});

// ==================== ORDER APPROVAL ENDPOINTS ====================

// Get all pending orders (waiting for admin approval)
router.get('/orders/pending', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const pendingOrders = await Order.find({ status: 'pending_admin_approval' })
      .populate('userId', 'uniqueUserId name email mobileNumber isActive')
      .populate('productId', 'name price imageURL')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingOrders,
      count: pendingOrders.length,
    });
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending orders',
    });
  }
});

// Approve an order
router.post('/orders/:orderId/approve', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;

    // Find order with populated data
    const order = await Order.findById(orderId)
      .populate('userId')
      .populate('productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'pending_admin_approval') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}. Can only approve pending orders.`,
      });
    }

    // Check if user is active
    const user = order.userId as any;
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cannot approve order for inactive user. Please activate the user first.',
      });
    }

    // Check product stock
    const product = order.productId as any;
    if (product.stock < order.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}, Required: ${order.quantity}`,
      });
    }

    // Start transaction-like process
    try {
      // 1. Update product stock
      product.stock -= order.quantity;
      await product.save();

      // 2. Distribute MLM commissions (this handles ALL point distribution including buyer reward and upline commissions)
      await distributeCommissions(order._id as mongoose.Types.ObjectId, user._id as mongoose.Types.ObjectId, product);

      // 4. Update order status
      order.status = 'completed';
      order.adminApprovedBy = adminId;
      order.adminApprovedAt = new Date();
      if (adminNotes) {
        order.adminNotes = adminNotes;
      }
      await order.save();

      res.json({
        success: true,
        message: `Order approved successfully. ${order.pointsEarned} points awarded to ${user.name}.`,
        data: {
          orderId: order._id,
          status: order.status,
          pointsAwarded: order.pointsEarned,
          adminApprovedAt: order.adminApprovedAt,
        },
      });
    } catch (error) {
      // Rollback stock if commission distribution fails
      product.stock += order.quantity;
      await product.save();

      user.totalPoints -= order.pointsEarned;
      await user.save();

      throw error;
    }
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve order',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Reject an order
router.post('/orders/:orderId/reject', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate('userId', 'uniqueUserId name email totalPoints');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'pending_admin_approval') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}. Can only reject pending orders.`,
      });
    }

    // Update order status
    order.status = 'cancelled';
    order.adminApprovedBy = adminId;
    order.adminApprovedAt = new Date();
    order.adminNotes = `Rejected: ${reason}`;
    await order.save();

    res.json({
      success: true,
      message: `Order rejected successfully.`,
      data: {
        orderId: order._id,
        status: order.status,
        rejectionReason: reason,
        adminApprovedAt: order.adminApprovedAt,
      },
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject order',
    });
  }
});

// Admin: Search users
router.get('/search-users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Search by name, email, mobile, or uniqueUserId
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { mobileNumber: { $regex: query, $options: 'i' } },
        { uniqueUserId: { $regex: query, $options: 'i' } },
      ],
    })
      .select('_id name email mobileNumber uniqueUserId totalPoints isActive role')
      .limit(20);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
    });
  }
});

// Admin: Create order for user (auto-approved)
router.post('/purchase-for-user', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { userId, productId, quantity } = req.body;

    // Validate input
    if (!userId || !productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Product ID, and quantity are required',
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User account is not active',
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not active',
      });
    }

    // Calculate totals
    const totalPrice = product.price * quantity;
    const pointsEarned = product.points * quantity;

    // Create order with auto-approved status
    const order = new Order({
      userId: user._id,
      productId: product._id,
      quantity,
      totalPrice,
      pointsEarned,
      status: 'completed', // Auto-approved
      paymentStatus: 'paid',
      adminApprovedBy: req.user._id,
      adminApprovedAt: new Date(),
      adminNotes: 'Order created and approved by admin',
    });

    await order.save();

    // Distribute MLM commissions (this handles ALL point distribution including buyer reward and upline commissions)
    await distributeCommissions(order._id as mongoose.Types.ObjectId, user._id as mongoose.Types.ObjectId, product);

    // Populate order details for response
    await order.populate('productId', 'name price points imageURL');
    await order.populate('userId', 'name email mobileNumber uniqueUserId');

    res.json({
      success: true,
      message: 'Order created and approved successfully',
      data: order,
    });
  } catch (error) {
    console.error('Admin purchase for user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order for user',
    });
  }
});

export default router;