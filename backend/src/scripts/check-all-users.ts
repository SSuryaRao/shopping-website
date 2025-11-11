import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkAllUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB\n');

    // Get total user count
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}\n`);

    // Get active users
    const activeUsers = await User.find({ isActive: true }).select('uniqueUserId name email mobileNumber role isActive totalPoints');
    console.log(`Active users (${activeUsers.length}):`);
    activeUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.uniqueUserId} - ${user.name} - ${user.role} - Points: ${user.totalPoints || 0}`);
      console.log(`   Email: ${user.email || 'N/A'}, Mobile: ${user.mobileNumber || 'N/A'}`);
    });

    console.log('\n');

    // Get inactive users
    const inactiveUsers = await User.find({ isActive: false }).select('uniqueUserId name email mobileNumber role isActive createdAt');
    console.log(`Inactive users (${inactiveUsers.length}):`);
    inactiveUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.uniqueUserId} - ${user.name} - ${user.role} - Created: ${user.createdAt}`);
      console.log(`   Email: ${user.email || 'N/A'}, Mobile: ${user.mobileNumber || 'N/A'}`);
    });

    console.log('\n=== Summary ===');
    console.log(`Total: ${totalUsers}`);
    console.log(`Active: ${activeUsers.length}`);
    console.log(`Inactive: ${inactiveUsers.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

checkAllUsers();
