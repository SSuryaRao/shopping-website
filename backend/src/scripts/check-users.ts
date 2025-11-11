import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Commission from '../models/Commission';
import Order from '../models/Order';
import Product from '../models/Product';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkCommissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('🔍 Checking commissions for iPhone 16 purchase by Test User 20...\n');

    // Get the iPhone 16 order
    const user20 = await User.findOne({ name: 'Test User 20' });
    if (!user20) {
      console.log('❌ Test User 20 not found');
      return;
    }

    const order = await Order.findOne({
      userId: user20._id,
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (!order) {
      console.log('❌ No completed orders found for Test User 20');
      return;
    }

    const product = await Product.findById(order.productId);

    console.log('📦 Order Details:');
    console.log('- Order ID:', order._id);
    console.log('- Product:', product?.name);
    console.log('- Total Price:', order.totalPrice);
    console.log('- Points Earned:', order.pointsEarned);
    console.log('- Status:', order.status);
    console.log('- Approved At:', order.adminApprovedAt);
    console.log();

    // Get all commissions for this order
    const commissions = await Commission.find({ orderId: order._id })
      .sort({ level: 1 });

    console.log('💰 Commissions Created:', commissions.length);
    console.log('\n--- Commission Distribution ---\n');

    for (const comm of commissions) {
      const user = await User.findById(comm.userId);

      console.log(`Level ${comm.level}: ${user?.name || 'Unknown'}`);
      console.log(`  - User ID: ${user?.uniqueUserId || 'N/A'}`);
      console.log(`  - Points Awarded: ${comm.points}`);
      console.log(`  - Current Total Points: ${user?.totalPoints || 0}`);
      console.log(`  - Status: ${comm.status}`);
      console.log(`  - Commission ID: ${comm._id}`);
      console.log();
    }

    // Summary by user
    console.log('\n📊 Summary of Points Received:\n');

    const userPointsMap = new Map();
    for (const comm of commissions) {
      const user = await User.findById(comm.userId);
      if (user) {
        const existing = userPointsMap.get(user._id.toString()) || {
          name: user.name,
          uniqueUserId: user.uniqueUserId,
          points: 0,
          totalPoints: user.totalPoints
        };
        existing.points += comm.points;
        userPointsMap.set(user._id.toString(), existing);
      }
    }

    for (const [userId, data] of userPointsMap) {
      console.log(`${data.name} (${data.uniqueUserId})`);
      console.log(`  - Received from this order: ${data.points} points`);
      console.log(`  - Total account points: ${data.totalPoints} points`);
      console.log();
    }

    // Check Test User 19 specifically (should be Level 1)
    console.log('\n🎯 Checking Test User 19 (Level 1 upline):');
    const user19 = await User.findOne({ name: 'Test User 19' });
    if (user19) {
      console.log('- Name:', user19.name);
      console.log('- User ID:', user19.uniqueUserId);
      console.log('- Total Points:', user19.totalPoints);
      console.log('- Is Active:', user19.isActive);

      const user19Commissions = await Commission.find({
        userId: user19._id,
        orderId: order._id
      });
      console.log('- Commissions from this order:', user19Commissions.length);
      if (user19Commissions.length > 0) {
        console.log('  ✅ Received:', user19Commissions[0].points, 'points');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCommissions();
