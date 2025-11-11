import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User';
import { generateReferralCode } from '../services/mlm.service';
import { generateUniqueUserId, hashPassword } from '../utils/userHelpers';

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydb';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Create 3 inactive test users
    const inactiveUsers = [];
    for (let i = 1; i <= 3; i++) {
      const uniqueUserId = await generateUniqueUserId();
      const referralCode = await generateReferralCode();
      const hashedPassword = await hashPassword('password123');

      const user = new User({
        uniqueUserId,
        email: `inactive${i}@test.com`,
        mobileNumber: `+1234567890${i}`,
        name: `Inactive User ${i}`,
        displayName: `Inactive Account ${i}`,
        password: hashedPassword,
        role: 'customer',
        referralCode,
        isActive: false,
        totalPoints: 0,
        totalEarnings: 0,
        pendingWithdrawal: 0,
        withdrawnAmount: 0,
      });

      await user.save();
      inactiveUsers.push(user);
      console.log(`✅ Created inactive user: ${user.name} (${user.uniqueUserId})`);
    }

    // Create 2 active test users
    const activeUsers = [];
    for (let i = 1; i <= 2; i++) {
      const uniqueUserId = await generateUniqueUserId();
      const referralCode = await generateReferralCode();
      const hashedPassword = await hashPassword('password123');

      const user = new User({
        uniqueUserId,
        email: `active${i}@test.com`,
        mobileNumber: `+9876543210${i}`,
        name: `Active User ${i}`,
        displayName: `Active Account ${i}`,
        password: hashedPassword,
        role: 'customer',
        referralCode,
        isActive: true,
        activatedAt: new Date(),
        totalPoints: 100 * i,
        totalEarnings: 50 * i,
        pendingWithdrawal: 0,
        withdrawnAmount: 0,
      });

      await user.save();
      activeUsers.push(user);
      console.log(`✅ Created active user: ${user.name} (${user.uniqueUserId})`);
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\n📋 Summary:');
    console.log(`- ${inactiveUsers.length} inactive users (pending activation)`);
    console.log(`- ${activeUsers.length} active users`);
    console.log('\n🔑 Login credentials for all test users:');
    console.log('   Password: password123');
    console.log('\n📝 Inactive Users (will show in "Pending Users" tab):');
    inactiveUsers.forEach(u => {
      console.log(`   - UID: ${u.uniqueUserId} | Email: ${u.email}`);
    });
    console.log('\n📝 Active Users (will show in "Active Users" tab):');
    activeUsers.forEach(u => {
      console.log(`   - UID: ${u.uniqueUserId} | Email: ${u.email}`);
    });

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
};

createTestUsers();
