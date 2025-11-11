import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);

    const products = await Product.find({}).select('name price buyerRewardPoints commissionStructure');

    console.log('📦 Products with MLM Configuration:\n');

    for (const product of products) {
      console.log('Product:', product.name);
      console.log('  Price: ₹', product.price);
      console.log('  Buyer Reward:', product.buyerRewardPoints || 0, 'points');
      console.log('  Commission Levels:', product.commissionStructure?.length || 0);
      if (product.commissionStructure && product.commissionStructure.length > 0) {
        console.log('  ✅ Has MLM rewards configured');
      } else {
        console.log('  ❌ NO MLM rewards configured');
      }
      console.log();
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProducts();
