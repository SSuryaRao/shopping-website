import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import Order from '../models/Order';
import Payment from '../models/Payment';
import Product from '../models/Product';
import User from '../models/User';

const router = express.Router();

// Initialize Razorpay (only if credentials are properly configured)
let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id_here' &&
    process.env.RAZORPAY_KEY_SECRET !== 'your_secret_key_here') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized successfully');
} else {
  console.log('⚠️  Razorpay not initialized - missing or placeholder credentials');
}

// Create Razorpay order
router.post('/create-order', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please contact administrator.',
      });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    // Find the order
    const order = await Order.findById(orderId).populate('productId');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify order belongs to user
    if (order.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order',
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment && existingPayment.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order',
      });
    }

    // Create Razorpay order
    const razorpayOrderOptions = {
      amount: Math.round(order.totalPrice * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${orderId}_${Date.now()}`,
      notes: {
        orderId: orderId.toString(),
        userId: req.user?.firebaseUid,
        productName: (order.productId as any).name,
      },
    };

    const razorpayOrder = await razorpay.orders.create(razorpayOrderOptions);

    // Create payment record in database
    const payment = new Payment({
      orderId,
      userId: req.user?._id,
      razorpayOrderId: razorpayOrder.id,
      amount: order.totalPrice,
      currency: 'INR',
      status: 'created',
      description: `Payment for order ${orderId}`,
      notes: razorpayOrderOptions.notes,
    });

    await payment.save();

    // Update order with payment reference
    order.paymentId = payment._id as any;
    await order.save();

    return res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      notes: razorpayOrder.notes,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
    });
  }
});

// Verify payment
router.post('/verify-payment', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters',
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'captured';
    await payment.save();

    // Update order status
    const order = await Order.findById(payment.orderId).populate('productId userId');
    if (order) {
      order.paymentStatus = 'paid';
      order.status = 'processing';
      await order.save();

      // Update product stock
      const product = await Product.findById(order.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - order.quantity);
        await product.save();
      }

      // Update user points
      const user = await User.findById(order.userId);
      if (user) {
        user.totalPoints += order.pointsEarned;
        await user.save();
      }
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
    });
  }
});

// Handle payment failure
router.post('/payment-failed', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { razorpay_order_id, error } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    // Find and update payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (payment) {
      payment.status = 'failed';
      payment.failureReason = error?.description || 'Payment failed';
      await payment.save();

      // Update order status
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
      }
    }

    return res.json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    console.error('Payment failure error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record payment failure',
    });
  }
});

// Get payment status
router.get('/status/:orderId', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify order belongs to user
    if (order.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order',
      });
    }

    const payment = await Payment.findOne({ orderId });

    return res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      payment: payment ? {
        id: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
    });
  }
});

// Webhook handler for Razorpay events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = req.body;

    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Webhook signature missing',
      });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(webhookBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = JSON.parse(webhookBody.toString());
    console.log('Webhook event:', event.event, event.payload);

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

// Helper functions for webhook events
async function handlePaymentCaptured(paymentData: any) {
  try {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentData.order_id
    });

    if (payment) {
      payment.razorpayPaymentId = paymentData.id;
      payment.status = 'captured';
      payment.method = paymentData.method;
      await payment.save();

      // Update order
      const order = await Order.findById(payment.orderId);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        await order.save();

        // Update stock and user points
        await updateStockAndPoints(order);
      }
    }
  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
}

async function handlePaymentFailed(paymentData: any) {
  try {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentData.order_id
    });

    if (payment) {
      payment.status = 'failed';
      payment.failureReason = paymentData.error_description || 'Payment failed';
      await payment.save();

      // Update order
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
      }
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

async function handleOrderPaid(orderData: any) {
  try {
    console.log('Order paid webhook:', orderData);
    // Additional logic for order.paid event if needed
  } catch (error) {
    console.error('Handle order paid error:', error);
  }
}

async function updateStockAndPoints(order: any) {
  try {
    // Update product stock
    const product = await Product.findById(order.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - order.quantity);
      await product.save();
    }

    // Update user points
    const user = await User.findById(order.userId);
    if (user) {
      user.totalPoints += order.pointsEarned;
      await user.save();
    }
  } catch (error) {
    console.error('Update stock and points error:', error);
  }
}

export default router;