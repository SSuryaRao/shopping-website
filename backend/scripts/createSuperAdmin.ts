import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import User model
import User from '../src/models/User';

async function createSuperAdmin() {
  try {
    console.log('\n👑 CREATE SUPER ADMIN\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line argument or use default
    const email = process.argv[2] || 'chinugaming321@gmail.com';
    console.log(`🔍 Looking for user with email: ${email}\n`);

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // User exists - promote to superadmin
      console.log(`✅ Found existing user: ${user.name} (${user.uniqueUserId})`);
      console.log(`   Current role: ${user.role}`);
      console.log(`   Current isAdmin: ${user.isAdmin}`);
      console.log(`   Current isSuperAdmin: ${user.isSuperAdmin}\n`);

      if (user.isSuperAdmin) {
        console.log('⚠️  User is already a super admin!');
        await mongoose.disconnect();
        return;
      }

      // Update user to superadmin
      user.isSuperAdmin = true;
      user.isAdmin = true;
      user.role = 'customer'; // Keep as customer for normal shopping experience
      user.isActive = true; // Ensure account is active
      await user.save();

      console.log('✅ User promoted to SUPER ADMIN!\n');
      console.log('📊 Updated User Details:\n');
      console.log(`   Name:          ${user.name}`);
      console.log(`   Email:         ${user.email}`);
      console.log(`   User ID:       ${user.uniqueUserId}`);
      console.log(`   Role:          ${user.role}`);
      console.log(`   isAdmin:       ${user.isAdmin}`);
      console.log(`   isSuperAdmin:  ${user.isSuperAdmin}`);
      console.log(`   isActive:      ${user.isActive}\n`);

    } else {
      // User doesn't exist - create new superadmin
      console.log('⚠️  User not found. Creating new super admin account...\n');

      // Generate unique user ID
      const uniqueUserId = 'USR' + nanoid(6).toUpperCase();
      const referralCode = 'REF' + nanoid(6).toUpperCase();

      const newUser = new User({
        email: email.toLowerCase(),
        uniqueUserId,
        name: 'Super Admin',
        profileName: 'Super Admin Account',
        role: 'customer',
        isAdmin: true,
        isSuperAdmin: true,
        isActive: true,
        activatedAt: new Date(),
        totalPoints: 0,
        totalEarnings: 0,
        pendingWithdrawal: 0,
        withdrawnAmount: 0,
        referralCode,
      });

      await newUser.save();

      console.log('✅ Super admin account created successfully!\n');
      console.log('📊 New User Details:\n');
      console.log(`   Name:          ${newUser.name}`);
      console.log(`   Email:         ${newUser.email}`);
      console.log(`   User ID:       ${newUser.uniqueUserId}`);
      console.log(`   Referral Code: ${newUser.referralCode}`);
      console.log(`   Role:          ${newUser.role}`);
      console.log(`   isAdmin:       ${newUser.isAdmin}`);
      console.log(`   isSuperAdmin:  ${newUser.isSuperAdmin}`);
      console.log(`   isActive:      ${newUser.isActive}\n`);

      console.log('⚠️  IMPORTANT: This user needs to sign up via Firebase Authentication first!');
      console.log(`   1. Go to your frontend and sign up with email: ${email}`);
      console.log('   2. Complete the Firebase authentication process');
      console.log('   3. The system will link this account automatically\n');
    }

    console.log('✅ Super admin setup complete!\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
createSuperAdmin();
