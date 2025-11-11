import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || '';

async function setPasswordForTestUser() {
  try {
    console.log('🔐 Setting password for Test User 20...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Test User 20
    const user = await User.findOne({ uniqueUserId: 'MLM463313' });

    if (!user) {
      console.error('❌ Test User 20 (MLM463313) not found!');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.uniqueUserId})`);
    console.log(`   Mobile: ${user.mobileNumber}\n`);

    // Set password to "password123"
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password set successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Mobile Number: ' + user.mobileNumber);
    console.log('   Password: password123');
    console.log('   User ID: ' + user.uniqueUserId);
    console.log('\n✨ You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error setting password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
setPasswordForTestUser();
