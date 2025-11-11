import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Order from '../models/Order';

// Load environment variables
dotenv.config();

/**
 * Migration Script: Activate Existing Users
 *
 * This script:
 * 1. Sets isActive = true for all existing users
 * 2. Sets activatedAt = createdAt (retroactive activation)
 * 3. Updates old order statuses to new status values
 *
 * Run this script ONCE after deploying the new activation system
 * to prevent existing users from being locked out.
 */

const migrateUsers = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mydb';

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // ========== MIGRATE USERS ==========
    console.log('\n📋 Starting user migration...');

    const usersToActivate = await User.find({
      $or: [
        { isActive: { $exists: false } },
        { isActive: false }
      ]
    });

    console.log(`Found ${usersToActivate.length} users to activate`);

    let activatedCount = 0;
    for (const user of usersToActivate) {
      await User.findByIdAndUpdate(user._id, {
        isActive: true,
        activatedAt: user.createdAt, // Retroactive activation
        // Note: activatedBy is left null since this is automatic migration
      });
      activatedCount++;

      if (activatedCount % 100 === 0) {
        console.log(`  ✓ Activated ${activatedCount} users...`);
      }
    }

    console.log(`✅ Activated ${activatedCount} users`);

    // ========== MIGRATE ORDERS ==========
    console.log('\n📋 Starting order migration...');

    // Find all orders - use any to bypass TypeScript checks for old statuses
    const ordersToUpdate = await Order.find({}).lean();

    console.log(`Found ${ordersToUpdate.length} orders to check`);

    let updatedOrderCount = 0;
    for (const order of ordersToUpdate) {
      const currentStatus = (order as any).status;
      let newStatus = currentStatus;
      let shouldUpdate = false;

      // Map old statuses to new statuses
      if (currentStatus === 'pending') {
        shouldUpdate = true;
        // If payment is completed, set to completed
        // Otherwise, keep as pending_admin_approval for review
        if (order.paymentStatus === 'paid') {
          newStatus = 'completed';
        } else {
          newStatus = 'pending_admin_approval';
        }
      } else if (currentStatus === 'processing') {
        shouldUpdate = true;
        newStatus = 'admin_approved';
      }
      // completed and cancelled statuses are already valid in new schema

      if (!shouldUpdate) {
        continue; // Skip if no update needed
      }

      await Order.findByIdAndUpdate(order._id, {
        status: newStatus,
        // If the order was already completed, mark it as retroactively approved
        ...(newStatus === 'completed' && {
          adminApprovedAt: order.updatedAt,
          adminNotes: 'Auto-approved during migration (legacy order)'
        })
      });

      updatedOrderCount++;

      if (updatedOrderCount % 100 === 0) {
        console.log(`  ✓ Updated ${updatedOrderCount} orders...`);
      }
    }

    console.log(`✅ Updated ${updatedOrderCount} orders`);

    // ========== SUMMARY ==========
    console.log('\n📊 Migration Summary:');
    console.log(`  • Users activated: ${activatedCount}`);
    console.log(`  • Orders updated: ${updatedOrderCount}`);
    console.log('\n✅ Migration completed successfully!');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
migrateUsers();
