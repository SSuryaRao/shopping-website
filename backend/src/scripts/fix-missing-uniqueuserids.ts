import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Generate a random unique user ID
function generateUniqueUserId(): string {
  const prefix = 'BRI';
  const randomNum = Math.floor(Math.random() * 1000000);
  return `${prefix}${randomNum.toString().padStart(6, '0')}`;
}

async function fixMissingUniqueUserIds() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB\n');

    // Find all users without uniqueUserId or with undefined
    const usersWithoutId = await User.find({
      $or: [
        { uniqueUserId: { $exists: false } },
        { uniqueUserId: null },
        { uniqueUserId: 'undefined' }
      ]
    });

    console.log(`Found ${usersWithoutId.length} users without valid uniqueUserId\n`);

    if (usersWithoutId.length === 0) {
      console.log('All users already have valid uniqueUserId!');
      return;
    }

    let updatedCount = 0;
    const existingIds = new Set();

    // Get all existing uniqueUserIds to avoid duplicates
    const allUsers = await User.find({}).select('uniqueUserId');
    allUsers.forEach(user => {
      if (user.uniqueUserId && user.uniqueUserId !== 'undefined') {
        existingIds.add(user.uniqueUserId);
      }
    });

    for (const user of usersWithoutId) {
      let newId = generateUniqueUserId();

      // Ensure uniqueness
      while (existingIds.has(newId)) {
        newId = generateUniqueUserId();
      }

      existingIds.add(newId);

      console.log(`Updating user: ${user.name} (${user.email || user.mobileNumber || user._id})`);
      console.log(`  Old uniqueUserId: ${user.uniqueUserId}`);
      console.log(`  New uniqueUserId: ${newId}`);

      user.uniqueUserId = newId;
      await user.save();

      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users!`);

    // Verify the fix
    const stillMissing = await User.countDocuments({
      $or: [
        { uniqueUserId: { $exists: false } },
        { uniqueUserId: null },
        { uniqueUserId: 'undefined' }
      ]
    });

    console.log(`\n📊 Verification:`);
    console.log(`  Users still missing uniqueUserId: ${stillMissing}`);
    console.log(`  Total users in database: ${await User.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

fixMissingUniqueUserIds();
