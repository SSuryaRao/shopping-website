import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import User model
import User from '../src/models/User';

async function makeUserAdmin() {
  try {
    console.log('\n👑 MAKE USER ADMIN\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get identifier from command line argument
    const identifier = process.argv[2];

    if (!identifier) {
      console.log('❌ Please provide a user identifier (email, mobile, or uniqueUserId)');
      console.log('   Usage: npm run make-admin <identifier>');
      console.log('   Examples:');
      console.log('     npm run make-admin 7008479571');
      console.log('     npm run make-admin user@example.com');
      console.log('     npm run make-admin BRI726582\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`🔍 Looking for user with identifier: ${identifier}\n`);

    // Try to find user by email, mobile, or uniqueUserId
    let user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobileNumber: identifier },
        { uniqueUserId: identifier.toUpperCase() }
      ]
    });

    if (!user) {
      console.log('❌ User not found with that identifier!\n');
      await mongoose.disconnect();
      return;
    }

    // User exists - display current info
    console.log(`✅ Found user: ${user.name} (${user.uniqueUserId})`);
    console.log(`   Email:           ${user.email || 'N/A'}`);
    console.log(`   Mobile:          ${user.mobileNumber || 'N/A'}`);
    console.log(`   Current role:    ${user.role}`);
    console.log(`   Current isAdmin: ${user.isAdmin || false}`);
    console.log(`   Current isActive: ${user.isActive || false}\n`);

    if (user.isAdmin) {
      console.log('⚠️  User is already an admin!');
      await mongoose.disconnect();
      return;
    }

    // Update user to admin
    user.isAdmin = true;
    user.isActive = true; // Ensure account is active
    await user.save();

    console.log('✅ User promoted to ADMIN!\n');
    console.log('📊 Updated User Details:\n');
    console.log(`   Name:          ${user.name}`);
    console.log(`   Email:         ${user.email || 'N/A'}`);
    console.log(`   Mobile:        ${user.mobileNumber || 'N/A'}`);
    console.log(`   User ID:       ${user.uniqueUserId}`);
    console.log(`   Role:          ${user.role}`);
    console.log(`   isAdmin:       ${user.isAdmin}`);
    console.log(`   isActive:      ${user.isActive}\n`);

    console.log('✅ User can now access the admin panel!\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error making user admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
makeUserAdmin();
