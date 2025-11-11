import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../utils/firebase';
import User from '../models/User';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    // Try to verify as JWT first (for mobile/email login)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; uniqueUserId: string };

      // Find user by MongoDB ID
      const user = await User.findById(decoded.userId);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      req.user = user;
      next();
      return;
    } catch (jwtError) {
      // If JWT verification fails, try Firebase token
      console.log('JWT verification failed, trying Firebase token...');
    }

    // Fallback to Firebase token verification (for Google login)
    const auth = getAuth();
    if (!auth) {
      console.log('Firebase Admin SDK not initialized');
      res.status(500).json({
        success: false,
        message: 'Authentication service not configured',
      });
      return;
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);

      // Find user in database by Firebase UID
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
    } catch (firebaseError) {
      console.error('Firebase token verification failed:', firebaseError);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }
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

export const requireActiveAccount = (
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

  if (!req.user.isActive) {
    res.status(403).json({
      success: false,
      message: 'Account not activated',
      error: 'Your account is pending admin activation. Please contact support.',
    });
    return;
  }

  next();
};

// Export verifyToken as alias for authenticateToken
export const verifyToken = authenticateToken;