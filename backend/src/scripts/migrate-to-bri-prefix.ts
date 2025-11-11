import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Generate a random unique user ID with BRI prefix
function generateBRIUserId(): string {
  const prefix = 'BRI';
  const randomNum = Math.floor(Math.random() * 1000000);
  return `${prefix}${randomNum.toString().padStart(6, '0')}`;
}

async function migrateUserIdsToBRI() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with USR or MLM prefix
    const usersToUpdate = await User.find({
      uniqueUserId: {
        $regex: /^(USR|MLM)/
      }
    });

    console.log(`📊 Found ${usersToUpdate.length} users with USR or MLM prefix\n`);

    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have BRI prefix!');
      await mongoose.connection.close();
      return;
    }

    let updatedCount = 0;
    const existingIds = new Set<string>();

    // Get all existing uniqueUserIds to avoid duplicates
    const allUsers = await User.find({}).select('uniqueUserId');
    allUsers.forEach(user => {
      if (user.uniqueUserId) {
        existingIds.add(user.uniqueUserId);
      }
    });

    console.log('🔄 Updating user IDs to BRI prefix...\n');

    for (const user of usersToUpdate) {
      const oldId = user.uniqueUserId;
      let newId = generateBRIUserId();

      // Ensure uniqueness
      while (existingIds.has(newId)) {
        newId = generateBRIUserId();
      }

      existingIds.add(newId);
      existingIds.delete(oldId); // Remove old ID from the set

      console.log(`👤 User: ${user.name}`);
      console.log(`   Old ID: ${oldId}`);
      console.log(`   New ID: ${newId}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Mobile: ${user.mobileNumber || 'N/A'}`);
      console.log('');

      user.uniqueUserId = newId;
      await user.save();

      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users!`);

    // Verify the migration
    const stillWrongPrefix = await User.countDocuments({
      uniqueUserId: { $regex: /^(USR|MLM)/ }
    });

    const briCount = await User.countDocuments({
      uniqueUserId: { $regex: /^BRI/ }
    });

    const totalUsers = await User.countDocuments();

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Users with BRI prefix: ${briCount}`);
    console.log(`   ❌ Users with USR/MLM prefix: ${stillWrongPrefix}`);
    console.log(`   📈 Total users: ${totalUsers}`);

    if (stillWrongPrefix === 0) {
      console.log('\n🎉 Migration completed successfully! All users now have BRI prefix.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

migrateUserIdsToBRI();
