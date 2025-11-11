import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { getAuth } from '../utils/firebase';
import User from '../models/User';
import ShopkeeperRequest from '../models/ShopkeeperRequest';
import { isValidInviteToken, markTokenAsUsed, setFirebaseCustomClaims } from '../utils/auth';
import { generateReferralCode, addUserToMLMTree } from '../services/mlm.service';
import jwt from 'jsonwebtoken';
import {
  generateUniqueUserId,
  hashPassword,
  comparePassword,
  validatePassword,
  validateMobileNumber,
  validateEmail,
  checkAccountLimits,
} from '../utils/userHelpers';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_TEMP_SECRET = process.env.JWT_TEMP_SECRET || 'temp-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId: string, uniqueUserId: string): string => {
  return jwt.sign({ userId, uniqueUserId }, JWT_SECRET, { expiresIn: '7d' });
};

// Generate temporary token (5 minutes) for account selection
const generateTempToken = (identifier: string, type: 'mobile' | 'email' | 'google'): string => {
  return jwt.sign({ identifier, type }, JWT_TEMP_SECRET, { expiresIn: '5m' });
};

// Verify temporary token
const verifyTempToken = (token: string): { identifier: string; type: string } | null => {
  try {
    return jwt.verify(token, JWT_TEMP_SECRET) as { identifier: string; type: string };
  } catch (error) {
    return null;
  }
};

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

    // Generate unique referral code and user ID for new user
    const userReferralCode = await generateReferralCode();
    const uniqueUserId = await generateUniqueUserId();

    const userData = {
      firebaseUid: decodedToken.uid,
      uniqueUserId,
      email: decodedToken.email!,
      name: profile.name || decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
      displayName: profile.displayName || `${profile.name || 'User'}'s Account`,
      totalPoints: 0,
      totalEarnings: 0,
      pendingWithdrawal: 0,
      withdrawnAmount: 0,
      referralCode: userReferralCode,
      role: 'customer', // Default, will be updated based on logic below
      isAdmin: false,
      isSuperAdmin: false,
      isActive: false, // Default: inactive, requires admin activation
      activatedAt: undefined as Date | undefined,
    };

    // Check if user should be super admin based on email
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail && userData.email === superAdminEmail) {
      userData.role = 'shopkeeper';
      userData.isAdmin = true;
      userData.isSuperAdmin = true;
      userData.isActive = true; // Auto-activate super admin
      userData.activatedAt = new Date();
    }

    if (role === 'shopkeeper' && !userData.isSuperAdmin) {
      // Handle shopkeeper registration
      if (inviteToken) {
        // Validate invite token
        const { valid, tokenDoc } = await isValidInviteToken(inviteToken);

        if (valid && tokenDoc) {
          // Valid invite token - approve immediately as shopkeeper/admin but NOT activate account
          userData.role = 'shopkeeper';
          userData.isAdmin = true;

          // Create user
          const user = new User(userData);
          await user.save();

          // Mark token as used
          await markTokenAsUsed(tokenDoc, user.firebaseUid!);

          // Set Firebase custom claims
          await setFirebaseCustomClaims(user.firebaseUid!, { isAdmin: true });

          // NOTE: MLM tree joining is BLOCKED until account is activated by admin
          // User must wait for admin activation before accessing referral features

          return res.json({
            success: true,
            status: 'approved',
            isAdmin: true,
            message: 'Shopkeeper account created successfully. Awaiting admin activation for full access.',
            requiresActivation: !user.isActive,
            data: {
              userId: user._id,
              uniqueUserId: user.uniqueUserId,
              role: user.role,
              isAdmin: user.isAdmin,
              isActive: user.isActive,
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
              uniqueUserId: user.uniqueUserId,
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
            uniqueUserId: user.uniqueUserId,
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
        await setFirebaseCustomClaims(user.firebaseUid!, { isAdmin: true, isSuperAdmin: userData.isSuperAdmin });
      }

      // NOTE: MLM tree joining is BLOCKED until account is activated
      // Super admin is auto-activated, regular customers must wait for admin activation
      // Only add to MLM tree if account is active (i.e., super admin)
      if (referralCodeFromSignup && user.isActive) {
        await addUserToMLMTree(user._id as mongoose.Types.ObjectId, referralCodeFromSignup);
      }

      const statusMessage = user.isActive
        ? `${userData.role === 'customer' ? 'Customer' : 'Admin'} account created and activated successfully`
        : `${userData.role === 'customer' ? 'Customer' : 'User'} account created. Awaiting admin activation for full access.`;

      return res.json({
        success: true,
        status: user.isActive ? 'activated' : 'pending_activation',
        isAdmin: userData.isAdmin,
        requiresActivation: !user.isActive,
        message: statusMessage,
        data: {
          userId: user._id,
          uniqueUserId: user.uniqueUserId,
          role: user.role,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          isActive: user.isActive,
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
        uniqueUserId: req.user.uniqueUserId,
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

/**
 * NEW AUTHENTICATION ENDPOINTS FOR MULTI-ACCOUNT SUPPORT
 */

// Login with Mobile Number + Password
router.post('/login/mobile', async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and password are required',
      });
    }

    const mobileValidation = validateMobileNumber(mobileNumber);
    if (!mobileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: mobileValidation.message,
      });
    }

    const accounts = await User.find({ mobileNumber }).select('+password');

    if (!accounts || accounts.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this mobile number',
      });
    }

    const firstAccount = accounts[0];
    if (!firstAccount.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google login. Please login with Google.',
      });
    }

    const isPasswordValid = await comparePassword(password, firstAccount.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    await User.updateMany(
      { mobileNumber },
      { $set: { lastLoginAt: new Date() } }
    );

    if (accounts.length === 1) {
      const token = generateToken((firstAccount._id as mongoose.Types.ObjectId).toString(), firstAccount.uniqueUserId);
      return res.json({
        success: true,
        token,
        user: {
          id: firstAccount._id,
          uniqueUserId: firstAccount.uniqueUserId,
          name: firstAccount.name,
          displayName: firstAccount.displayName,
          email: firstAccount.email,
          mobileNumber: firstAccount.mobileNumber,
          role: firstAccount.role,
          totalPoints: firstAccount.totalPoints,
          isAdmin: firstAccount.isAdmin,
          isSuperAdmin: firstAccount.isSuperAdmin,
          referralCode: firstAccount.referralCode,
        },
      });
    }

    const tempToken = generateTempToken(mobileNumber, 'mobile');
    return res.json({
      success: true,
      requiresSelection: true,
      accounts: accounts.map(acc => ({
        uniqueUserId: acc.uniqueUserId,
        displayName: acc.displayName || acc.name,
        name: acc.name,
        role: acc.role,
        totalPoints: acc.totalPoints,
        isAdmin: acc.isAdmin,
      })),
      tempToken,
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// Login with Unique User ID + Password
router.post('/login/userid', async (req, res) => {
  try {
    const { uniqueUserId, password } = req.body;

    if (!uniqueUserId || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID and password are required',
      });
    }

    const user = await User.findOne({
      uniqueUserId: uniqueUserId.toUpperCase().trim()
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid User ID or password',
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google login. Please login with Google.',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid User ID or password',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken((user._id as mongoose.Types.ObjectId).toString(), user.uniqueUserId);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        uniqueUserId: user.uniqueUserId,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('User ID login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// Login with Email + Password
router.post('/login/email', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message,
      });
    }

    const accounts = await User.find({ email: email.toLowerCase() }).select('+password');

    if (!accounts || accounts.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email',
      });
    }

    const firstAccount = accounts[0];
    if (!firstAccount.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google login. Please login with Google.',
      });
    }

    const isPasswordValid = await comparePassword(password, firstAccount.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    await User.updateMany(
      { email: email.toLowerCase() },
      { $set: { lastLoginAt: new Date() } }
    );

    if (accounts.length === 1) {
      const token = generateToken((firstAccount._id as mongoose.Types.ObjectId).toString(), firstAccount.uniqueUserId);
      return res.json({
        success: true,
        token,
        user: {
          id: firstAccount._id,
          uniqueUserId: firstAccount.uniqueUserId,
          name: firstAccount.name,
          displayName: firstAccount.displayName,
          email: firstAccount.email,
          mobileNumber: firstAccount.mobileNumber,
          role: firstAccount.role,
          totalPoints: firstAccount.totalPoints,
          isAdmin: firstAccount.isAdmin,
          isSuperAdmin: firstAccount.isSuperAdmin,
          referralCode: firstAccount.referralCode,
        },
      });
    }

    const tempToken = generateTempToken(email.toLowerCase(), 'email');
    return res.json({
      success: true,
      requiresSelection: true,
      accounts: accounts.map(acc => ({
        uniqueUserId: acc.uniqueUserId,
        displayName: acc.displayName || acc.name,
        name: acc.name,
        role: acc.role,
        totalPoints: acc.totalPoints,
        isAdmin: acc.isAdmin,
      })),
      tempToken,
    });
  } catch (error) {
    console.error('Email login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// Select Account (after multi-account detection)
router.post('/select-account', async (req, res) => {
  try {
    const { uniqueUserId, tempToken } = req.body;

    if (!uniqueUserId || !tempToken) {
      return res.status(400).json({
        success: false,
        message: 'Account ID and temporary token are required',
      });
    }

    const tokenData = verifyTempToken(tempToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.',
      });
    }

    const user = await User.findOne({ uniqueUserId: uniqueUserId.toUpperCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    if (tokenData.type === 'mobile' && user.mobileNumber !== tokenData.identifier) {
      return res.status(403).json({
        success: false,
        message: 'Account does not belong to this mobile number',
      });
    } else if (tokenData.type === 'email' && user.email !== tokenData.identifier) {
      return res.status(403).json({
        success: false,
        message: 'Account does not belong to this email',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken((user._id as mongoose.Types.ObjectId).toString(), user.uniqueUserId);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        uniqueUserId: user.uniqueUserId,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        totalPoints: user.totalPoints,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('Select account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Register with Mobile/Email (New comprehensive endpoint)
router.post('/register/new', async (req, res) => {
  try {
    const {
      registrationType, // 'mobile' or 'email'
      mobileNumber,
      email,
      password,
      name,
      displayName,
      role,
      referralCode: referralCodeFromSignup,
    } = req.body;

    // Validate required fields
    if (!registrationType || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Registration type, name, and password are required',
      });
    }

    if (!['customer', 'shopkeeper'].includes(role || 'customer')) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either customer or shopkeeper',
      });
    }

    let userEmail: string | undefined;
    let userMobile: string | undefined;

    // Handle different registration types
    if (registrationType === 'mobile') {
      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required',
        });
      }

      const mobileValidation = validateMobileNumber(mobileNumber);
      if (!mobileValidation.valid) {
        return res.status(400).json({
          success: false,
          message: mobileValidation.message,
        });
      }

      // Check account limits
      const limitCheck = await checkAccountLimits(mobileNumber, 'mobile');
      if (!limitCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: limitCheck.message,
        });
      }

      userMobile = mobileNumber;
    } else if (registrationType === 'email') {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      // Check account limits
      const limitCheck = await checkAccountLimits(email, 'email');
      if (!limitCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: limitCheck.message,
        });
      }

      userEmail = email.toLowerCase();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration type. Use "mobile" or "email"',
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Generate unique user ID and referral code
    const uniqueUserId = await generateUniqueUserId();
    const userReferralCode = await generateReferralCode();
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = new User({
      uniqueUserId,
      email: userEmail,
      mobileNumber: userMobile,
      name: name.trim(),
      displayName: displayName?.trim() || `${name.trim()}'s Account`,
      password: hashedPassword,
      role: role === 'shopkeeper' ? 'pending' : 'customer',
      referralCode: userReferralCode,
      pendingReferralCode: referralCodeFromSignup, // Store the referral code for later MLM tree placement
      isAdmin: false,
      isSuperAdmin: false,
      isActive: false, // Requires admin activation
      totalPoints: 0,
      totalEarnings: 0,
      pendingWithdrawal: 0,
      withdrawnAmount: 0,
    });

    await newUser.save();

    // NOTE: MLM tree joining is BLOCKED until account is activated by admin
    // When admin activates this account, they should manually add user to MLM tree using referredBy code
    // User must wait for admin activation before accessing referral features

    // Generate token
    const token = generateToken((newUser._id as mongoose.Types.ObjectId).toString(), newUser.uniqueUserId);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending admin activation for full access.',
      status: 'pending_activation',
      requiresActivation: true,
      isAdmin: false,
      token,
      user: {
        id: newUser._id,
        uniqueUserId: newUser.uniqueUserId,
        name: newUser.name,
        displayName: newUser.displayName,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber,
        role: newUser.role,
        totalPoints: newUser.totalPoints,
        referralCode: newUser.referralCode,
        isAdmin: newUser.isAdmin,
        isSuperAdmin: newUser.isSuperAdmin,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

// Get switchable accounts (logged in users can see their other accounts)
router.get('/switchable-accounts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;

    // Find all accounts with same mobile or email
    const query: any = {
      _id: { $ne: currentUser._id }, // Exclude current account
    };

    // Build OR condition for same mobile or email
    const orConditions: any[] = [];
    if (currentUser.mobileNumber) {
      orConditions.push({ mobileNumber: currentUser.mobileNumber });
    }
    if (currentUser.email) {
      orConditions.push({ email: currentUser.email });
    }

    if (orConditions.length === 0) {
      return res.json({
        success: true,
        accounts: [],
      });
    }

    query.$or = orConditions;

    const accounts = await User.find(query).select('uniqueUserId name displayName role totalPoints isAdmin');

    return res.json({
      success: true,
      accounts: accounts.map(acc => ({
        uniqueUserId: acc.uniqueUserId,
        displayName: acc.displayName || acc.name,
        name: acc.name,
        role: acc.role,
        totalPoints: acc.totalPoints,
        isAdmin: acc.isAdmin,
      })),
    });
  } catch (error) {
    console.error('Get switchable accounts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Switch account (when already logged in)
router.post('/switch-account', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uniqueUserId } = req.body;
    const currentUser = req.user;

    if (!uniqueUserId) {
      return res.status(400).json({
        success: false,
        message: 'Account ID is required',
      });
    }

    // Find the target account
    const targetAccount = await User.findOne({
      uniqueUserId: uniqueUserId.toUpperCase().trim()
    });

    if (!targetAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Verify both accounts share same mobile or email
    const canSwitch =
      (currentUser.mobileNumber && targetAccount.mobileNumber === currentUser.mobileNumber) ||
      (currentUser.email && targetAccount.email === currentUser.email);

    if (!canSwitch) {
      return res.status(403).json({
        success: false,
        message: 'Cannot switch to this account',
      });
    }

    // Update last login time
    targetAccount.lastLoginAt = new Date();
    await targetAccount.save();

    // Generate new token for target account
    const token = generateToken((targetAccount._id as mongoose.Types.ObjectId).toString(), targetAccount.uniqueUserId);

    return res.json({
      success: true,
      token,
      user: {
        id: targetAccount._id,
        uniqueUserId: targetAccount.uniqueUserId,
        name: targetAccount.name,
        displayName: targetAccount.displayName,
        email: targetAccount.email,
        mobileNumber: targetAccount.mobileNumber,
        role: targetAccount.role,
        totalPoints: targetAccount.totalPoints,
        isAdmin: targetAccount.isAdmin,
        isSuperAdmin: targetAccount.isSuperAdmin,
        referralCode: targetAccount.referralCode,
      },
    });
  } catch (error) {
    console.error('Switch account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Check if identifier has existing accounts (for UI feedback)
router.post('/check-accounts', async (req, res) => {
  try {
    const { identifier, type } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and type are required',
      });
    }

    const query = type === 'mobile'
      ? { mobileNumber: identifier }
      : { email: identifier.toLowerCase() };

    const count = await User.countDocuments(query);

    return res.json({
      success: true,
      count,
      hasAccounts: count > 0,
      canCreateMore: count < 5,
      remainingSlots: Math.max(5 - count, 0),
    });
  } catch (error) {
    console.error('Check accounts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;