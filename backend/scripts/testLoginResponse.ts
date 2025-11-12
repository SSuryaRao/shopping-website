import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import User model
import User from '../src/models/User';

async function testLoginResponse() {
  try {
    console.log('\n🔍 TEST LOGIN RESPONSE\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const mobileNumber = '7008479571';
    console.log(`🔍 Testing login for mobile: ${mobileNumber}\n`);

    // Find user by mobile number
    const accounts = await User.find({ mobileNumber }).select('+password');

    if (!accounts || accounts.length === 0) {
      console.log('❌ No account found with this mobile number!');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found ${accounts.length} account(s)\n`);

    const firstAccount = accounts[0];

    console.log('📊 User Data from Database:\n');
    console.log(`   _id:           ${firstAccount._id}`);
    console.log(`   uniqueUserId:  ${firstAccount.uniqueUserId}`);
    console.log(`   name:          ${firstAccount.name}`);
    console.log(`   mobileNumber:  ${firstAccount.mobileNumber}`);
    console.log(`   email:         ${firstAccount.email || 'N/A'}`);
    console.log(`   role:          ${firstAccount.role}`);
    console.log(`   isAdmin:       ${firstAccount.isAdmin}`);
    console.log(`   isSuperAdmin:  ${firstAccount.isSuperAdmin || false}`);
    console.log(`   isActive:      ${firstAccount.isActive}`);
    console.log(`   totalPoints:   ${firstAccount.totalPoints}`);
    console.log(`   hasPassword:   ${firstAccount.password ? 'Yes' : 'No'}\n`);

    // Simulate what the login endpoint returns
    console.log('📤 What the API would return:\n');
    const apiResponse = {
      success: true,
      token: 'JWT_TOKEN_HERE',
      user: {
        id: firstAccount._id,
        uniqueUserId: firstAccount.uniqueUserId,
        name: firstAccount.name,
        displayName: firstAccount.displayName,
        email: firstAccount.email,
        mobileNumber: firstAccount.mobileNumber,
        role: firstAccount.role,
        totalPoints: firstAccount.totalPoints,
        isAdmin: firstAccount.isAdmin,
        isSuperAdmin: firstAccount.isSuperAdmin,
        referralCode: firstAccount.referralCode,
      },
    };

    console.log(JSON.stringify(apiResponse, null, 2));
    console.log('\n');

    // Test getUserProfile response
    console.log('📤 What /user/profile endpoint would return:\n');
    const profileResponse = {
      success: true,
      data: {
        id: firstAccount._id,
        uniqueUserId: firstAccount.uniqueUserId,
        email: firstAccount.email,
        mobileNumber: firstAccount.mobileNumber,
        name: firstAccount.name,
        role: firstAccount.role,
        totalPoints: firstAccount.totalPoints,
        isAdmin: firstAccount.isAdmin,
        isSuperAdmin: firstAccount.isSuperAdmin,
        isActive: firstAccount.isActive,
        referralCode: firstAccount.referralCode,
        referredBy: firstAccount.referredBy,
        totalEarnings: firstAccount.totalEarnings,
        pendingWithdrawal: firstAccount.pendingWithdrawal,
        withdrawnAmount: firstAccount.withdrawnAmount,
        createdAt: firstAccount.createdAt,
      },
    };

    console.log(JSON.stringify(profileResponse, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
testLoginResponse();
