import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { getAuth } from '../utils/firebase';
import User from '../models/User';
import ShopkeeperRequest from '../models/ShopkeeperRequest';
import { isValidInviteToken, markTokenAsUsed, setFirebaseCustomClaims } from '../utils/auth';
import { generateReferralCode, addUserToMLMTree } from '../services/mlm.service';
import jwt from 'jsonwebtoken';
import { generateUniqueUserId } from '../utils/userHelpers';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token for a specific profile
const generateToken = (userId: string, uniqueUserId: string, firebaseUid: string): string => {
  return jwt.sign({ userId, uniqueUserId, firebaseUid }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * POST /auth/firebase-login
 * Main login endpoint - handles Firebase authentication and profile management
 */
router.post('/firebase-login', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Firebase token required',
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
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;
    const phoneNumber = decodedToken.phone_number;

    // Find all profiles for this Firebase user
    const profiles = await User.find({ firebaseUid }).sort({ lastLoginAt: -1 });

    if (profiles.length === 0) {
      // No profiles found - user needs to create first profile
      return res.json({
        success: true,
        needsProfileCreation: true,
        firebaseUid,
        email,
        phoneNumber,
        message: 'Welcome! Please create your first profile.',
      });
    }

    if (profiles.length === 1) {
      // Single profile - auto login
      const user = profiles[0];
      user.lastLoginAt = new Date();
      await user.save();

      const jwtToken = generateToken(
        (user._id as mongoose.Types.ObjectId).toString(),
        user.uniqueUserId,
        firebaseUid
      );

      // Check if user is super admin
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      const isSuperAdmin = superAdminEmail && user.email === superAdminEmail;

      return res.json({
        success: true,
        token: jwtToken,
        user: {
          id: user._id,
          uniqueUserId: user.uniqueUserId,
          firebaseUid: user.firebaseUid,
          email: user.email,
          mobileNumber: user.mobileNumber,
          name: user.name,
          profileName: user.profileName,
          role: user.role,
          totalPoints: user.totalPoints,
          isAdmin: user.isAdmin,
          isSuperAdmin: isSuperAdmin || user.isSuperAdmin,
          referralCode: user.referralCode,
          totalEarnings: user.totalEarnings,
          pendingWithdrawal: user.pendingWithdrawal,
          withdrawnAmount: user.withdrawnAmount,
        },
      });
    }

    // Multiple profiles - return list for selection
    return res.json({
      success: true,
      requiresSelection: true,
      profiles: profiles.map(profile => ({
        uniqueUserId: profile.uniqueUserId,
        profileName: profile.profileName,
        name: profile.name,
        role: profile.role,
        totalPoints: profile.totalPoints,
        isAdmin: profile.isAdmin,
      })),
      firebaseUid,
    });

  } catch (error) {
    console.error('Firebase login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate',
    });
  }
});

/**
 * POST /auth/select-profile
 * Select a specific profile from multiple profiles
 */
router.post('/select-profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const { uniqueUserId } = req.body;

    if (!token || !uniqueUserId) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token and profile ID required',
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
    const firebaseUid = decodedToken.uid;

    // Find the profile and verify it belongs to this Firebase user
    const user = await User.findOne({
      uniqueUserId: uniqueUserId.toUpperCase().trim(),
      firebaseUid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you',
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const jwtToken = generateToken(
      (user._id as mongoose.Types.ObjectId).toString(),
      user.uniqueUserId,
      firebaseUid
    );

    // Check if user is super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdmin = superAdminEmail && user.email === superAdminEmail;

    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        uniqueUserId: user.uniqueUserId,
        firebaseUid: user.firebaseUid,
        email: user.email,
        mobileNumber: user.mobileNumber,
        name: user.name,
        profileName: user.profileName,
        role: user.role,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin,
        isSuperAdmin: isSuperAdmin || user.isSuperAdmin,
        referralCode: user.referralCode,
        totalEarnings: user.totalEarnings,
        pendingWithdrawal: user.pendingWithdrawal,
        withdrawnAmount: user.withdrawnAmount,
      },
    });

  } catch (error) {
    console.error('Profile selection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to select profile',
    });
  }
});

/**
 * POST /auth/create-profile
 * Create a new profile for the authenticated Firebase user
 */
router.post('/create-profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Firebase token required',
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
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;
    const phoneNumber = decodedToken.phone_number;

    const {
      name,
      profileName,
      role = 'customer',
      inviteToken,
      referralCode: referralCodeFromSignup,
    } = req.body;

    if (!name || !profileName) {
      return res.status(400).json({
        success: false,
        message: 'Name and profile name are required',
      });
    }

    // Check profile limit (max 5 profiles per Firebase user)
    const existingProfiles = await User.countDocuments({ firebaseUid });
    if (existingProfiles >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 profiles allowed per account',
      });
    }

    // Generate unique identifiers
    const uniqueUserId = await generateUniqueUserId();
    const userReferralCode = await generateReferralCode();

    // Check if user should be super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdminByEmail = superAdminEmail && email === superAdminEmail;

    const userData: any = {
      firebaseUid, // Required for new auth system
      uniqueUserId,
      email: email || undefined,
      mobileNumber: phoneNumber || undefined,
      name: name.trim(),
      profileName: profileName.trim(),
      displayName: profileName.trim(), // Also set displayName for backwards compatibility
      totalPoints: 0,
      totalEarnings: 0,
      pendingWithdrawal: 0,
      withdrawnAmount: 0,
      referralCode: userReferralCode,
      role: 'customer',
      isAdmin: false,
      isSuperAdmin: false,
    };

    // Handle super admin
    if (isSuperAdminByEmail) {
      userData.role = 'shopkeeper';
      userData.isAdmin = true;
      userData.isSuperAdmin = true;
    }

    // Handle shopkeeper registration
    if (role === 'shopkeeper' && !isSuperAdminByEmail) {
      if (inviteToken) {
        const { valid, tokenDoc } = await isValidInviteToken(inviteToken);

        if (valid && tokenDoc) {
          // Valid invite token - approve immediately
          userData.role = 'shopkeeper';
          userData.isAdmin = true;

          const user = new User(userData);
          await user.save();

          if (user.firebaseUid) {
            await markTokenAsUsed(tokenDoc, user.firebaseUid);
            await setFirebaseCustomClaims(user.firebaseUid, { isAdmin: true });
          }

          // Add to MLM tree if referral code provided
          if (referralCodeFromSignup) {
            await addUserToMLMTree(user._id as mongoose.Types.ObjectId, referralCodeFromSignup);
          }

          const jwtToken = generateToken(
            (user._id as mongoose.Types.ObjectId).toString(),
            user.uniqueUserId,
            firebaseUid
          );

          return res.status(201).json({
            success: true,
            status: 'approved',
            isAdmin: true,
            message: 'Shopkeeper profile created successfully',
            token: jwtToken,
            user: {
              id: user._id,
              uniqueUserId: user.uniqueUserId,
              firebaseUid: user.firebaseUid,
              email: user.email,
              mobileNumber: user.mobileNumber,
              name: user.name,
              profileName: user.profileName,
              role: user.role,
              isAdmin: user.isAdmin,
              referralCode: user.referralCode,
            },
          });
        }
      }

      // No invite token or invalid - create pending request
      userData.role = 'pending';
      const user = new User(userData);
      await user.save();

      const request = new ShopkeeperRequest({
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
      });
      await request.save();

      const jwtToken = generateToken(
        (user._id as mongoose.Types.ObjectId).toString(),
        user.uniqueUserId,
        firebaseUid
      );

      return res.status(201).json({
        success: true,
        status: 'pending',
        isAdmin: false,
        message: 'Shopkeeper request pending approval',
        token: jwtToken,
        user: {
          id: user._id,
          uniqueUserId: user.uniqueUserId,
          firebaseUid: user.firebaseUid,
          email: user.email,
          mobileNumber: user.mobileNumber,
          name: user.name,
          profileName: user.profileName,
          role: user.role,
          isAdmin: user.isAdmin,
        },
      });
    }

    // Customer profile
    const user = new User(userData);
    await user.save();

    // Set Firebase custom claims if admin
    if (userData.isAdmin && user.firebaseUid) {
      await setFirebaseCustomClaims(user.firebaseUid, {
        isAdmin: true,
        isSuperAdmin: userData.isSuperAdmin,
      });
    }

    // Add to MLM tree if referral code provided
    if (referralCodeFromSignup) {
      await addUserToMLMTree(user._id as mongoose.Types.ObjectId, referralCodeFromSignup);
    }

    const jwtToken = generateToken(
      (user._id as mongoose.Types.ObjectId).toString(),
      user.uniqueUserId,
      firebaseUid
    );

    return res.status(201).json({
      success: true,
      status: 'approved',
      isAdmin: userData.isAdmin,
      message: 'Profile created successfully',
      token: jwtToken,
      user: {
        id: user._id,
        uniqueUserId: user.uniqueUserId,
        firebaseUid: user.firebaseUid,
        email: user.email,
        mobileNumber: user.mobileNumber,
        name: user.name,
        profileName: user.profileName,
        role: user.role,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        referralCode: user.referralCode,
      },
    });

  } catch (error) {
    console.error('Profile creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create profile',
    });
  }
});

/**
 * GET /auth/my-profiles
 * Get all profiles for the authenticated Firebase user
 */
router.get('/my-profiles', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    const profiles = await User.find({ firebaseUid: currentUser.firebaseUid })
      .select('uniqueUserId name profileName role totalPoints isAdmin')
      .sort({ lastLoginAt: -1 });

    return res.json({
      success: true,
      profiles: profiles.map(profile => ({
        uniqueUserId: profile.uniqueUserId,
        profileName: profile.profileName,
        name: profile.name,
        role: profile.role,
        totalPoints: profile.totalPoints,
        isAdmin: profile.isAdmin,
        isCurrent: profile.uniqueUserId === currentUser.uniqueUserId,
      })),
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profiles',
    });
  }
});

/**
 * POST /auth/switch-profile
 * Switch to a different profile (requires authentication)
 */
router.post('/switch-profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uniqueUserId } = req.body;
    const currentUser = req.user;

    if (!uniqueUserId) {
      return res.status(400).json({
        success: false,
        message: 'Profile ID is required',
      });
    }

    // Find the target profile and verify it belongs to same Firebase user
    const targetProfile = await User.findOne({
      uniqueUserId: uniqueUserId.toUpperCase().trim(),
      firebaseUid: currentUser.firebaseUid,
    });

    if (!targetProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you',
      });
    }

    // Update last login
    targetProfile.lastLoginAt = new Date();
    await targetProfile.save();

    // Ensure firebaseUid exists for profile switching
    if (!targetProfile.firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'This profile cannot be switched to (missing Firebase authentication)',
      });
    }

    const token = generateToken(
      (targetProfile._id as mongoose.Types.ObjectId).toString(),
      targetProfile.uniqueUserId,
      targetProfile.firebaseUid
    );

    // Check if user is super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdmin = superAdminEmail && targetProfile.email === superAdminEmail;

    return res.json({
      success: true,
      token,
      user: {
        id: targetProfile._id,
        uniqueUserId: targetProfile.uniqueUserId,
        firebaseUid: targetProfile.firebaseUid,
        email: targetProfile.email,
        mobileNumber: targetProfile.mobileNumber,
        name: targetProfile.name,
        profileName: targetProfile.profileName,
        role: targetProfile.role,
        totalPoints: targetProfile.totalPoints,
        isAdmin: targetProfile.isAdmin,
        isSuperAdmin: isSuperAdmin || targetProfile.isSuperAdmin,
        referralCode: targetProfile.referralCode,
        totalEarnings: targetProfile.totalEarnings,
        pendingWithdrawal: targetProfile.pendingWithdrawal,
        withdrawnAmount: targetProfile.withdrawnAmount,
      },
    });
  } catch (error) {
    console.error('Profile switch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to switch profile',
    });
  }
});

/**
 * POST /auth/verify
 * Verify JWT token and return user info
 */
router.post('/verify', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSuperAdmin = superAdminEmail && req.user.email === superAdminEmail;

    return res.json({
      success: true,
      message: 'Token verified',
      user: {
        id: req.user._id,
        uniqueUserId: req.user.uniqueUserId,
        firebaseUid: req.user.firebaseUid,
        email: req.user.email,
        mobileNumber: req.user.mobileNumber,
        name: req.user.name,
        profileName: req.user.profileName,
        role: req.user.role,
        totalPoints: req.user.totalPoints,
        isAdmin: req.user.isAdmin,
        isSuperAdmin: isSuperAdmin || req.user.isSuperAdmin,
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
