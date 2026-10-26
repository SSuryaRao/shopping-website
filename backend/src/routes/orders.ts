import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import Order from '../models/Order';
import Product, { IProduct } from '../models/Product';
import User from '../models/User';
import { imageUpload, savePrivateFile } from '../utils/uploads';

const router = Router();

// UPI details used by the checkout page to build the dynamic payment QR
router.get('/payment-config', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      upiId: process.env.UPI_ID || '',
      payeeName: process.env.UPI_PAYEE_NAME || 'Smart Shoppy',
    },
  });
});

interface OrderItemData {
  product: IProduct;
  quantity: number;
  itemTotal: number;
  itemPoints: number;
}

// Create order (single product or cart)
// Accepts multipart/form-data: items (JSON string), paymentMethod, cashPaidTo, paymentScreenshot (file)
router.post('/', authenticateToken, imageUpload.single('paymentScreenshot'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentMethod } = req.body;
    const pointsToRedeem = Number(req.body.pointsToRedeem) || 0;
    const cashPaidTo = typeof req.body.cashPaidTo === 'string' ? req.body.cashPaidTo.trim() : '';
    let items = req.body.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = null;
      }
    }

    // Validate input - support both single product and cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
      });
    }

    // Validate payment details - admin verifies them before approving the order
    if (paymentMethod !== 'cash' && paymentMethod !== 'qr') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please select a payment method (Cash or QR)',
      });
    }

    if (paymentMethod === 'cash' && !cashPaidTo) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please enter the name of the person you gave the cash to',
      });
    }

    if (paymentMethod === 'qr' && !req.file) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please upload the payment screenshot',
      });
    }

    // Get user for points validation
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate points to redeem
    if (pointsToRedeem > 0 && user.totalPoints < pointsToRedeem) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient points for redemption',
      });
    }

    let subtotal = 0;
    let totalPointsEarned = 0;
    const orderItems: OrderItemData[] = [];

    // Validate each item and calculate totals
    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Invalid item data',
        });
      }

      // Find product
      const product = await Product.findById(productId).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product ${productId} not found`,
        });
      }

      // Check if product is active
      if (!product.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`,
        });
      }

      // Check stock
      if (product.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const itemTotal = product.price * quantity;
      const itemPoints = product.points * quantity;

      subtotal += itemTotal;
      totalPointsEarned += itemPoints;

      orderItems.push({
        product: product as IProduct,
        quantity,
        itemTotal,
        itemPoints,
      });
    }

    // Calculate final total (no payment needed - admin will approve)
    // Points redemption disabled - no discount applied
    const finalTotal = subtotal;

    // Save the payment screenshot privately - only admins can view it
    const paymentScreenshot = paymentMethod === 'qr' && req.file
      ? await savePrivateFile(req.file, 'payment-screenshots')
      : undefined;
    const checkoutId = randomUUID();

    // Create orders for each item
    const createdOrders = [];
    for (const item of orderItems) {
      const order = new Order({
        userId: req.user._id,
        productId: item.product._id,
        quantity: item.quantity,
        totalPrice: item.itemTotal,
        pointsEarned: item.itemPoints,
        status: 'pending_admin_approval', // Requires admin approval
        paymentStatus: 'pending', // Marked paid when admin approves
        paymentMethod,
        cashPaidTo: paymentMethod === 'cash' ? cashPaidTo : undefined,
        paymentScreenshot,
        checkoutId,
        checkoutTotal: finalTotal,
      });

      await order.save({ session });
      createdOrders.push(order);

      // Stock will be reduced when admin approves
      // Points will be awarded when admin approves
    }

    // Don't deduct or award points yet - wait for admin approval
    // Points redemption and MLM commissions will happen after admin approval

    await session.commitTransaction();
    session.endSession();

    // Return order details
    const firstOrder = createdOrders[0];

    res.status(201).json({
      success: true,
      message: 'Order submitted successfully! Awaiting admin approval.',
      requiresApproval: true,
      data: {
        _id: firstOrder._id,
        totalPrice: finalTotal,
        pointsEarned: totalPointsEarned,
        orders: createdOrders.map(o => o._id),
        status: 'pending_admin_approval',
        summary: {
          subtotal,
          pointsRedeemed: 0, // Points redemption disabled
          discount: 0,
          finalTotal,
          pointsEarned: totalPointsEarned,
        },
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// Get order details
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate('productId', 'name imageURL price points')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...order,
        product: order.productId,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;