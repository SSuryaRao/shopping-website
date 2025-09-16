import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../utils/firebase';
import User from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if Firebase is initialized
    const auth = getAuth();
    console.log('Firebase Auth status:', auth ? 'Available' : 'Not available');
    if (!auth) {
      console.log('Firebase Admin SDK not initialized when auth middleware called');
      res.status(500).json({
        success: false,
        message: 'Authentication service not configured',
      });
      return;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);

    // Find user in database (don't auto-create here - let registration endpoint handle it)
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not registered. Please complete registration first.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  next();
};

export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Check if user is super admin based on environment variable or database flag
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const isSuperAdminByEmail = superAdminEmail && req.user.email === superAdminEmail;
  const isSuperAdminByFlag = req.user.isSuperAdmin;

  if (!isSuperAdminByEmail && !isSuperAdminByFlag) {
    res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
    return;
  }

  next();
};