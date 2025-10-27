import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration Script: Migrate existing users to Firebase-first authentication
 *
 * IMPORTANT: Run this script BEFORE deploying the new auth system
 *
 * What this does:
 * 1. Updates users who already have firebaseUid (Google users)
 * 2. For users with password (mobile/email users):
 *    - They need to login with Firebase first (Google/Phone/Email)
 *    - Then link their existing profile
 *
 * HOW TO RUN:
 * npx ts-node src/scripts/migrateToFirebaseAuth.ts
 */

async function migrateToFirebaseAuth() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find all users
    const allUsers = await User.find({});
    console.log(`📊 Total users found: ${allUsers.length}\n`);

    let googleUsers = 0;
    let passwordUsers = 0;
    let updatedUsers = 0;
    let errorUsers = 0;

    for (const user of allUsers) {
      try {
        // Check if user has firebaseUid (Google users)
        if (user.firebaseUid) {
          googleUsers++;

          // Update to add profileName if missing
          if (!user.profileName) {
            user.profileName = user.displayName || 'Main Account';
            await user.save();
            updatedUsers++;
            console.log(`✅ Updated Google user: ${user.email} - ${user.profileName}`);
          }
        } else {
          passwordUsers++;

          // These users need manual migration
          // They must:
          // 1. Login with Firebase (using their email/phone)
          // 2. System will link their existing profile automatically
          console.log(`⚠️  Password user needs manual migration: ${user.email || user.mobileNumber} (ID: ${user.uniqueUserId})`);
        }
      } catch (error) {
        errorUsers++;
        console.error(`❌ Error processing user ${user.uniqueUserId}:`, error);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Google users (already using Firebase): ${googleUsers}`);
    console.log(`   Users updated with profileName: ${updatedUsers}`);
    console.log(`   Password users (need manual migration): ${passwordUsers}`);
    console.log(`   Errors: ${errorUsers}`);

    if (passwordUsers > 0) {
      console.log('\n⚠️  IMPORTANT: Password users need to:');
      console.log('   1. Login with Firebase (Google/Phone/Email) using the same email/phone');
      console.log('   2. The system will automatically link their existing profile');
      console.log('   3. Or create a new profile and manually merge data');
    }

    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrateToFirebaseAuth()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export default migrateToFirebaseAuth;
