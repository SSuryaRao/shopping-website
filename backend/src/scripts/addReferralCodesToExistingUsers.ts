import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { generateReferralCode } from '../services/mlm.service';

dotenv.config();

async function addReferralCodesToExistingUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydb';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find all users without referral codes
    const usersWithoutCodes = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' },
      ],
    });

    console.log(`\n📊 Found ${usersWithoutCodes.length} users without referral codes`);

    if (usersWithoutCodes.length === 0) {
      console.log('✅ All users already have referral codes!');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const user of usersWithoutCodes) {
      try {
        // Generate unique referral code
        const referralCode = await generateReferralCode();

        // Update user
        user.referralCode = referralCode;

        // Initialize MLM fields if they don't exist
        if (user.totalEarnings === undefined) user.totalEarnings = 0;
        if (user.pendingWithdrawal === undefined) user.pendingWithdrawal = 0;
        if (user.withdrawnAmount === undefined) user.withdrawnAmount = 0;

        await user.save();
        updated++;
        console.log(`✅ Updated user: ${user.email} - Code: ${referralCode}`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to update user: ${user.email}`, error);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Total processed: ${usersWithoutCodes.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addReferralCodesToExistingUsers();
