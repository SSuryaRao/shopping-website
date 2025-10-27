import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

/**
 * Script to fix the firebaseUid index issue
 * This script drops the old firebaseUid index and recreates it as sparse
 */
async function fixFirebaseUidIndex() {
  try {
    console.log('🔧 Starting index fix...');

    // Connect to MongoDB
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydb';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get the User collection
    const collection = mongoose.connection.collection('users');

    // List existing indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key),
        index.unique ? '(unique)' : '',
        index.sparse ? '(sparse)' : '');
    });

    // Drop the problematic firebaseUid index if it exists
    try {
      console.log('\n🗑️  Dropping old firebaseUid_1 index...');
      await collection.dropIndex('firebaseUid_1');
      console.log('✅ Old index dropped');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('ℹ️  Index firebaseUid_1 not found (already dropped or never existed)');
      } else {
        console.error('⚠️  Error dropping index:', error.message);
      }
    }

    // Ensure all model indexes are synced (this will create the new sparse index)
    console.log('\n🔄 Syncing indexes from User model...');
    await User.syncIndexes();
    console.log('✅ Indexes synced');

    // List new indexes
    console.log('\n📋 Updated indexes:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key),
        index.unique ? '(unique)' : '',
        index.sparse ? '(sparse)' : '');
    });

    // Count documents with null firebaseUid
    const nullFirebaseUidCount = await User.countDocuments({
      $or: [
        { firebaseUid: null },
        { firebaseUid: { $exists: false } }
      ]
    });
    console.log(`\n📊 Documents with null/missing firebaseUid: ${nullFirebaseUidCount}`);

    // Count documents with non-null firebaseUid
    const withFirebaseUidCount = await User.countDocuments({
      firebaseUid: { $exists: true, $ne: null }
    });
    console.log(`📊 Documents with firebaseUid: ${withFirebaseUidCount}`);

    console.log('\n✅ Index fix completed successfully!');
    console.log('💡 You can now create multiple accounts with the same phone/email');

  } catch (error) {
    console.error('❌ Error fixing index:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
fixFirebaseUidIndex()
  .then(() => {
    console.log('\n🎉 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
