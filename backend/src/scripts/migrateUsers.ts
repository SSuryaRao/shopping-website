/**
 * Database Migration Script for Multi-Account System
 *
 * This script migrates existing users to the new schema by adding:
 * - uniqueUserId field
 * - displayName field (optional)
 *
 * Run this script ONCE after deploying the new User model
 *
 * Usage: ts-node src/scripts/migrateUsers.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { generateUniqueUserId } from '../utils/userHelpers';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopping-website';

async function migrateUsers() {
  try {
    console.log('🔄 Starting user migration...\n');

    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users without uniqueUserId
    const usersWithoutId = await User.find({
      $or: [
        { uniqueUserId: { $exists: false } },
        { uniqueUserId: null },
        { uniqueUserId: '' }
      ]
    });

    console.log(`📊 Found ${usersWithoutId.length} users to migrate\n`);

    if (usersWithoutId.length === 0) {
      console.log('✅ No users need migration. All users already have uniqueUserId!\n');
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Migrate each user
    for (const user of usersWithoutId) {
      try {
        // Generate unique user ID
        const uniqueUserId = await generateUniqueUserId();

        // Set displayName if not exists
        const displayName = user.displayName || `${user.name}'s Account`;

        // Update user
        user.uniqueUserId = uniqueUserId;
        user.displayName = displayName;

        await user.save();

        console.log(`✅ Migrated: ${user.email || user.firebaseUid} → ${uniqueUserId}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user._id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📝 Total: ${usersWithoutId.length}\n`);

    // Verify migration
    const remainingUsers = await User.countDocuments({
      $or: [
        { uniqueUserId: { $exists: false } },
        { uniqueUserId: null },
        { uniqueUserId: '' }
      ]
    });

    if (remainingUsers === 0) {
      console.log('🎉 Migration completed successfully! All users now have uniqueUserId.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingUsers} users still need migration.\n`);
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
