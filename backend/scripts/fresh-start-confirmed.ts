import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import all models
import User from '../src/models/User';
import Order from '../src/models/Order';
import Commission from '../src/models/Commission';
import Product from '../src/models/Product';
import InviteToken from '../src/models/InviteToken';
import ShopkeeperRequest from '../src/models/ShopkeeperRequest';

async function freshStartConfirmed(keepProducts: boolean = false) {
  try {
    console.log('\n🔥 DATABASE FRESH START - EXECUTING NOW 🔥\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Show current counts
    console.log('📊 Current Database Status:\n');
    const commissionCount = await Commission.countDocuments();
    const orderCount = await Order.countDocuments();
    const shopkeeperRequestCount = await ShopkeeperRequest.countDocuments();
    const inviteTokenCount = await InviteToken.countDocuments();
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();

    console.log(`   Commissions:        ${commissionCount}`);
    console.log(`   Orders:             ${orderCount}`);
    console.log(`   Shopkeeper Requests: ${shopkeeperRequestCount}`);
    console.log(`   Invite Tokens:      ${inviteTokenCount}`);
    console.log(`   Users:              ${userCount}`);
    console.log(`   Products:           ${productCount}`);

    const totalRecords = commissionCount + orderCount + shopkeeperRequestCount +
                        inviteTokenCount + userCount + productCount;
    console.log(`\n   TOTAL RECORDS:      ${totalRecords}\n`);

    if (totalRecords === 0) {
      console.log('✅ Database is already empty! Nothing to delete.');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 What will be deleted:\n');
    console.log(`   ❌ ${commissionCount} Commissions`);
    console.log(`   ❌ ${orderCount} Orders`);
    console.log(`   ❌ ${shopkeeperRequestCount} Shopkeeper Requests`);
    console.log(`   ❌ ${inviteTokenCount} Invite Tokens`);
    console.log(`   ❌ ${userCount} Users`);
    if (keepProducts) {
      console.log(`   ✅ ${productCount} Products (WILL BE KEPT)`);
    } else {
      console.log(`   ❌ ${productCount} Products`);
    }

    console.log('\n🗑️  Starting deletion process in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete in correct order (child data first, then parent data)

    // 1. Delete Commissions
    console.log('🗑️  Deleting Commissions...');
    const deletedCommissions = await Commission.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCommissions.deletedCount} commissions`);

    // 2. Delete Orders
    console.log('🗑️  Deleting Orders...');
    const deletedOrders = await Order.deleteMany({});
    console.log(`   ✅ Deleted ${deletedOrders.deletedCount} orders`);

    // 3. Delete Shopkeeper Requests
    console.log('🗑️  Deleting Shopkeeper Requests...');
    const deletedShopkeeperRequests = await ShopkeeperRequest.deleteMany({});
    console.log(`   ✅ Deleted ${deletedShopkeeperRequests.deletedCount} shopkeeper requests`);

    // 4. Delete Invite Tokens
    console.log('🗑️  Deleting Invite Tokens...');
    const deletedInviteTokens = await InviteToken.deleteMany({});
    console.log(`   ✅ Deleted ${deletedInviteTokens.deletedCount} invite tokens`);

    // 5. Delete Users
    console.log('🗑️  Deleting Users...');
    const deletedUsers = await User.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUsers.deletedCount} users`);

    // 6. Delete Products (optional)
    let deletedProductsCount = 0;
    if (!keepProducts) {
      console.log('🗑️  Deleting Products...');
      const deletedProducts = await Product.deleteMany({});
      deletedProductsCount = deletedProducts.deletedCount;
      console.log(`   ✅ Deleted ${deletedProductsCount} products`);
    }

    // Show final summary
    console.log('\n✅ DATABASE FRESH START COMPLETED!\n');
    console.log('📊 Deletion Summary:\n');
    console.log(`   ❌ Commissions:        ${deletedCommissions.deletedCount}`);
    console.log(`   ❌ Orders:             ${deletedOrders.deletedCount}`);
    console.log(`   ❌ Shopkeeper Requests: ${deletedShopkeeperRequests.deletedCount}`);
    console.log(`   ❌ Invite Tokens:      ${deletedInviteTokens.deletedCount}`);
    console.log(`   ❌ Users:              ${deletedUsers.deletedCount}`);
    if (!keepProducts) {
      console.log(`   ❌ Products:           ${deletedProductsCount}`);
    } else {
      console.log(`   ✅ Products:           ${await Product.countDocuments()} (kept)`);
    }

    const totalDeleted = deletedCommissions.deletedCount + deletedOrders.deletedCount +
                         deletedShopkeeperRequests.deletedCount + deletedInviteTokens.deletedCount +
                         deletedUsers.deletedCount + deletedProductsCount;
    console.log(`\n   TOTAL DELETED:      ${totalDeleted} records\n`);

    // Verify database is clean
    const remainingCommissions = await Commission.countDocuments();
    const remainingOrders = await Order.countDocuments();
    const remainingShopkeeperRequests = await ShopkeeperRequest.countDocuments();
    const remainingInviteTokens = await InviteToken.countDocuments();
    const remainingUsers = await User.countDocuments();
    const remainingProducts = await Product.countDocuments();

    console.log('🔍 Verification (Remaining Records):\n');
    console.log(`   Commissions:        ${remainingCommissions}`);
    console.log(`   Orders:             ${remainingOrders}`);
    console.log(`   Shopkeeper Requests: ${remainingShopkeeperRequests}`);
    console.log(`   Invite Tokens:      ${remainingInviteTokens}`);
    console.log(`   Users:              ${remainingUsers}`);
    console.log(`   Products:           ${remainingProducts}\n`);

    if (remainingCommissions === 0 && remainingOrders === 0 &&
        remainingShopkeeperRequests === 0 && remainingInviteTokens === 0 &&
        remainingUsers === 0 && (keepProducts || remainingProducts === 0)) {
      console.log('✅ Database is now clean and ready for a fresh start!\n');
    } else {
      console.log('⚠️  Warning: Some records may still remain. Please check manually.\n');
    }

    console.log('📝 Next Steps:');
    console.log('   1. Run "npm run create-superadmin" to create a new super admin');
    if (!keepProducts) {
      console.log('   2. Add products to your store');
    }
    console.log('   3. Users can start registering fresh');
    console.log('   4. MLM tree will build from scratch\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error during fresh start:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get command line argument for keeping products
const args = process.argv.slice(2);
const keepProducts = args.includes('--keep-products');

// Run the fresh start
freshStartConfirmed(keepProducts);
