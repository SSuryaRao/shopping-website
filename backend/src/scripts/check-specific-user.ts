import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Order from '../models/Order';
import User from '../models/User';
import Commission from '../models/Commission';
import Product from '../models/Product';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || '';

async function checkOrder() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('📊 Checking recent orders and commissions...\n');

    // Get Test User 20
    const user20 = await User.findOne({ name: 'Test User 20' });
    if (!user20) {
      console.log('❌ Test User 20 not found');
      return;
    }

    console.log('User Details:');
    console.log('- Name:', user20.name);
    console.log('- ID:', user20._id);
    console.log('- Mobile:', user20.mobileNumber);
    console.log('- Active:', user20.isActive);
    console.log('- Total Points:', user20.totalPoints);
    console.log('- Referred By:', user20.referredBy);
    console.log();

    // Get orders for this user
    const orders = await Order.find({ userId: user20._id })
      .sort({ createdAt: -1 });

    console.log('Orders for Test User 20:', orders.length);
    for (const order of orders) {
      console.log('\n--- Order ---');
      console.log('- Order ID:', order._id);
      console.log('- Product ID:', order.productId);
      console.log('- Quantity:', order.quantity);
      console.log('- Total Price:', order.totalPrice);
      console.log('- Points Earned:', order.pointsEarned);
      console.log('- Status:', order.status);
      console.log('- Created:', order.createdAt);
      console.log('- Approved:', order.adminApprovedAt);

      // Get product details separately
      const product = await Product.findById(order.productId);
      if (product) {
        console.log('- Product Name:', product.name);
        console.log('- Product Buyer Reward:', product.buyerRewardPoints);
        console.log('- Product Commission Structure:', JSON.stringify(product.commissionStructure));
      }

      // Check commissions for this order
      const commissions = await Commission.find({ orderId: order._id });
      console.log('- Commissions Created:', commissions.length);
      for (const comm of commissions) {
        const commUser = await User.findById(comm.userId);
        console.log('  - Level', comm.level + ':', commUser?.name, '-', comm.points, 'points');
      }
    }

    // Check all commissions for user20 (as receiver)
    const allCommissions = await Commission.find({ userId: user20._id });
    console.log('\n📈 Total commissions received by Test User 20:', allCommissions.length);

    // Check commissions where user20 is the buyer (fromUserId)
    const commissionsFromUser20 = await Commission.find({ fromUserId: user20._id });
    console.log('📤 Commissions distributed from Test User 20\'s purchase:', commissionsFromUser20.length);
    for (const comm of commissionsFromUser20) {
      const receiver = await User.findById(comm.userId);
      console.log('  - Level', comm.level + ':', receiver?.name, '-', comm.points, 'points');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrder();
