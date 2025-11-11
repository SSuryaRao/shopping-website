import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || '';

// Helper function to generate unique user ID
function generateUniqueUserId(): string {
  const prefix = 'BRI';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomNum}`;
}

// Helper function to generate referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to generate random mobile number
function generateMobileNumber(): string {
  const firstDigit = Math.floor(6 + Math.random() * 4); // 6-9
  const remaining = Math.floor(100000000 + Math.random() * 900000000);
  return `${firstDigit}${remaining}`;
}

async function create20TestUsers() {
  try {
    console.log('🚀 Starting script to create 20 test users...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the root user BRI158094
    const rootUser = await User.findOne({ uniqueUserId: 'BRI158094' });

    if (!rootUser) {
      console.error('❌ Root user BRI158094 not found!');
      process.exit(1);
    }

    console.log(`✅ Found root user: ${rootUser.name} (${rootUser.uniqueUserId})`);
    console.log(`   Referral Code: ${rootUser.referralCode}\n`);

    const createdUsers: any[] = [];
    let previousUser = rootUser;

    // Create 20 users in a chain
    for (let i = 1; i <= 20; i++) {
      console.log(`Creating User ${i}...`);

      // Generate unique identifiers
      let uniqueUserId = generateUniqueUserId();
      let referralCode = generateReferralCode();

      // Ensure uniqueness
      let existingUser = await User.findOne({ uniqueUserId });
      while (existingUser) {
        uniqueUserId = generateUniqueUserId();
        existingUser = await User.findOne({ uniqueUserId });
      }

      let existingCode = await User.findOne({ referralCode });
      while (existingCode) {
        referralCode = generateReferralCode();
        existingCode = await User.findOne({ referralCode });
      }

      // Create the user
      const newUser = new User({
        uniqueUserId,
        name: `Test User ${i}`,
        mobileNumber: generateMobileNumber(),
        password: '$2b$10$defaultHashedPasswordForTesting', // Dummy hashed password
        role: 'customer',
        isActive: true, // ACTIVATED
        activatedAt: new Date(),
        activatedBy: rootUser._id, // Activated by root user (admin)
        referralCode,
        referredBy: previousUser._id, // Referred by previous user in chain
        totalPoints: 0,
        totalEarnings: 0,
        pendingWithdrawal: 0,
        withdrawnAmount: 0,
      });

      await newUser.save();

      // Add this user as the left child of the previous user
      // (Creating a vertical chain by always adding to left)
      if (!previousUser.leftChild) {
        previousUser.leftChild = newUser._id;
        await previousUser.save();
        console.log(`   ✅ Added as LEFT child of ${previousUser.uniqueUserId}`);
      } else if (!previousUser.rightChild) {
        previousUser.rightChild = newUser._id;
        await previousUser.save();
        console.log(`   ✅ Added as RIGHT child of ${previousUser.uniqueUserId}`);
      } else {
        // If both children exist, just set referredBy relationship
        console.log(`   ✅ Set as referral of ${previousUser.uniqueUserId}`);
      }

      console.log(`   User ID: ${uniqueUserId}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Mobile: ${newUser.mobileNumber}`);
      console.log(`   Referral Code: ${referralCode}`);
      console.log(`   Active: ${newUser.isActive}`);
      console.log(`   Referred By: ${previousUser.uniqueUserId}`);
      console.log('');

      createdUsers.push(newUser);
      previousUser = newUser; // Next user will be under this one
    }

    console.log('\n🎉 Successfully created 20 test users!\n');
    console.log('📊 Summary:');
    console.log(`   Root: ${rootUser.uniqueUserId} (${rootUser.name})`);
    console.log(`   Total users created: ${createdUsers.length}`);
    console.log(`   All users are ACTIVE ✅`);
    console.log(`   MLM Tree depth: 20 levels\n`);

    console.log('🔗 Chain Structure:');
    console.log(`   ${rootUser.uniqueUserId} (${rootUser.name})`);
    createdUsers.forEach((user, index) => {
      const indent = '   ' + '  '.repeat(index + 1);
      console.log(`${indent}└─ ${user.uniqueUserId} (${user.name})`);
    });

    console.log('\n✨ All done!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
create20TestUsers();
