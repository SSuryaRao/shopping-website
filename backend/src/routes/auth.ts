import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { getAuth } from '../utils/firebase';
import User from '../models/User';
import ShopkeeperRequest from '../models/ShopkeeperRequest';
import { isValidInviteToken, markTokenAsUsed, setFirebaseCustomClaims } from '../utils/auth';
import { generateReferralCode, addUserToMLMTree } from '../services/mlm.service';

const router = Router();

// User registration endpoint
router.post('/register', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Verify Firebase token
    const auth = getAuth();
    if (!auth) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service not configured',
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const { role = 'customer', inviteToken, profile = {}, referralCode: referralCodeFromSignup } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ firebaseUid: decodedToken.uid });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already registered',
        data: {
          role: existingUser.role,
          isAdmin: existingUser.isAdmin,
        },
      });
    }

    // Generate unique referral code for new user
    const userReferralCode = await generateReferralCode();

    const userData = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email!,
      name: profile.name || decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
      totalPoints: 0,
      totalEarnings: 0,
      pendingWithdrawal: 0,
      withdrawnAmount: 0,
      referralCode: userReferralCode,
      role: 'customer', // Default, will be updated based on logic below
      isAdmin: false,
      isSuperAdmin: false,
    };

    // Check if user should be super admin based on email
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail && userData.email === superAdminEmail) {
      userData.role = 'shopkeeper';
      userData.isAdmin = true;
      userData.isSuperAdmin = true;
    }

    if (role === 'shopkeeper' && !userData.isSuperAdmin) {
      // Handle shopkeeper registration
      if (inviteToken) {
        // Validate invite token
        const { valid, tokenDoc } = await isValidInviteToken(inviteToken);

        if (valid && tokenDoc) {
          // Valid invite token - approve immediately
          userData.role = 'shopkeeper';
          userData.isAdmin = true;

          // Create user
          const user = new User(userData);
          await user.save();

          // Mark token as used
          await markTokenAsUsed(tokenDoc, user.firebaseUid);

          // Set Firebase custom claims
          await setFirebaseCustomClaims(user.firebaseUid, { isAdmin: true });

          // Add to MLM tree if referral code provided
          if (referralCodeFromSignup) {
            await addUserToMLMTree(user._id as mongoose.Types.ObjectId, referralCodeFromSignup);
          }

          return res.json({
            success: true,
            status: 'approved',
            isAdmin: true,
            message: 'Shopkeeper account created successfully',
            data: {
              userId: user._id,
              role: user.role,
              isAdmin: user.isAdmin,
              referralCode: user.referralCode,
            },
          });
        } else {
          // Invalid invite token - create pending request
          userData.role = 'pending';
          const user = new User(userData);
          await user.save();

          // Create shopkeeper request
          const request = new ShopkeeperRequest({
            firebaseUid: user.firebaseUid,
            name: user.name,
            email: user.email,
            message: profile.message || 'Applied with invalid invite token',
          });
          await request.save();

          return res.json({
            success: true,
            status: 'pending',
            isAdmin: false,
            message: 'Invalid invite token. Your shopkeeper request is pending approval.',
            data: {
              userId: user._id,
              requestId: request._id,
              role: user.role,
              isAdmin: user.isAdmin,
            },
          });
        }
      } else {
        // No invite token - create pending request
        userData.role = 'pending';
        const user = new User(userData);
        await user.save();

        // Create shopkeeper request
        const request = new ShopkeeperRequest({
          firebaseUid: user.firebaseUid,
          name: user.name,
          email: user.email,
          message: profile.message || 'Applied to become a shopkeeper',
        });
        await request.save();

        return res.json({
          success: true,
          status: 'pending',
          isAdmin: false,
          message: 'Your shopkeeper request is pending approval. You will be notified when reviewed.',
          data: {
            userId: user._id,
            requestId: request._id,
            role: user.role,
            isAdmin: user.isAdmin,
          },
        });
      }
    } else {
      // Customer registration or super admin
      const user = new User(userData);
      await user.save();

      // Set Firebase custom claims if admin
      if (userData.isAdmin) {
        await setFirebaseCustomClaims(user.firebaseUid, { isAdmin: true, isSuperAdmin: userData.isSuperAdmin });
      }

      // Add to MLM tree if referral code provided
      if (referralCodeFromSignup) {
        await addUserToMLMTree(user._id as mongoose.Types.ObjectId, referralCodeFromSignup);
      }

      return res.json({
        success: true,
        status: 'approved',
        isAdmin: userData.isAdmin,
        message: `${userData.role === 'customer' ? 'Customer' : 'Admin'} account created successfully`,
        data: {
          userId: user._id,
          role: user.role,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          referralCode: user.referralCode,
        },
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
    });
  }
});

// Verify token endpoint
router.post('/verify', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdminByEmail = superAdminEmail && req.user.email === superAdminEmail;
    const isSuperAdminByFlag = req.user.isSuperAdmin;

    return res.json({
      success: true,
      message: 'Token verified',
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        totalPoints: req.user.totalPoints,
        isAdmin: req.user.isAdmin,
        isSuperAdmin: isSuperAdminByEmail || isSuperAdminByFlag,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;