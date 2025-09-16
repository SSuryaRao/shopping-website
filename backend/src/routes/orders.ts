import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';

const router = Router();

// Create order (single product or cart)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, pointsToRedeem = 0 } = req.body;

    // Validate input - support both single product and cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
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
    const orderItems = [];

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
        product,
        quantity,
        itemTotal,
        itemPoints,
      });
    }

    // Calculate final total after points redemption (1 point = $0.01)
    const discount = pointsToRedeem * 0.01;
    const finalTotal = Math.max(subtotal - discount, 0);

    // Create orders for each item
    const createdOrders = [];
    for (const item of orderItems) {
      // Calculate proportional discount for this item
      const itemDiscount = finalTotal < subtotal ? (discount * (item.itemTotal / subtotal)) : 0;
      const itemFinalPrice = item.itemTotal - itemDiscount;

      const order = new Order({
        userId: req.user._id,
        productId: item.product._id,
        quantity: item.quantity,
        totalPrice: itemFinalPrice,
        pointsEarned: item.itemPoints,
        status: 'completed', // For simplicity, mark as completed immediately
      });

      await order.save({ session });
      createdOrders.push(order);

      // Update product stock
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    // Update user points (add earned points, subtract redeemed points)
    const pointsChange = totalPointsEarned - pointsToRedeem;
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { totalPoints: pointsChange } },
      { session }
    );

    await session.commitTransaction();

    // Populate product details for response
    const populatedOrders = await Order.find({
      _id: { $in: createdOrders.map(o => o._id) },
    })
      .populate('productId', 'name imageURL price points')
      .lean();

    const responseData = populatedOrders.map(order => ({
      ...order,
      product: order.productId,
    }));

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orders: responseData,
        summary: {
          subtotal,
          pointsRedeemed: pointsToRedeem,
          discount,
          finalTotal,
          pointsEarned: totalPointsEarned,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  } finally {
    session.endSession();
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