import express from 'express';
import { authenticateToken, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth';
import { createInviteToken } from '../utils/auth';
import InviteToken from '../models/InviteToken';
import ShopkeeperRequest from '../models/ShopkeeperRequest';
import User from '../models/User';
import { setFirebaseCustomClaims } from '../utils/auth';

const router = express.Router();

// Generate invite token (super admin only)
router.post('/invites', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { expiresInHours = 72, note } = req.body;

    if (expiresInHours <= 0 || expiresInHours > 168) { // Max 7 days
      return res.status(400).json({
        success: false,
        message: 'Expiry hours must be between 1 and 168 (7 days)',
      });
    }

    const { token, tokenDoc } = await createInviteToken(
      req.user!.firebaseUid,
      expiresInHours,
      note
    );

    return res.json({
      success: true,
      data: {
        token, // Only returned once
        tokenId: tokenDoc._id,
        expiresAt: tokenDoc.expiresAt,
        note: tokenDoc.note,
      },
      message: 'Invite token generated successfully. Save this token as it will not be shown again.',
    });
  } catch (error) {
    console.error('Error generating invite token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate invite token',
    });
  }
});

// List invite tokens (super admin only)
router.get('/invites', authenticateToken, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const tokens = await InviteToken.find()
      .populate('createdBy', 'name email')
      .populate('usedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: tokens.map(token => ({
        id: token._id,
        createdBy: token.createdBy,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        used: token.used,
        usedBy: token.usedBy,
        usedAt: token.usedAt,
        note: token.note,
        isExpired: token.expiresAt < new Date(),
      })),
    });
  } catch (error) {
    console.error('Error fetching invite tokens:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invite tokens',
    });
  }
});

// List pending shopkeeper requests (super admin only)
router.get('/shopkeeper-requests', authenticateToken, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const requests = await ShopkeeperRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching shopkeeper requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shopkeeper requests',
    });
  }
});

// Approve shopkeeper request (super admin only)
router.post('/approve-shopkeeper', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required',
      });
    }

    const request = await ShopkeeperRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shopkeeper request not found',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed',
      });
    }

    // Find the user if they exist
    let user = null;
    if (request.firebaseUid) {
      user = await User.findOne({ firebaseUid: request.firebaseUid });
    }

    if (user) {
      // Update user role and admin status
      user.role = 'shopkeeper';
      user.isAdmin = true;
      await user.save();

      // Set Firebase custom claims
      if (user.firebaseUid) {
        await setFirebaseCustomClaims(user.firebaseUid, { isAdmin: true });
      }
    }

    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user!.firebaseUid;
    request.reviewedAt = new Date();
    await request.save();

    return res.json({
      success: true,
      message: 'Shopkeeper request approved successfully',
      data: {
        requestId: request._id,
        userUpdated: !!user,
      },
    });
  } catch (error) {
    console.error('Error approving shopkeeper request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve shopkeeper request',
    });
  }
});

// Reject shopkeeper request (super admin only)
router.post('/reject-shopkeeper', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { requestId, reason } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required',
      });
    }

    const request = await ShopkeeperRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shopkeeper request not found',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed',
      });
    }

    // Update request status
    request.status = 'rejected';
    request.reviewedBy = req.user!.firebaseUid;
    request.reviewedAt = new Date();
    request.rejectionReason = reason;
    await request.save();

    return res.json({
      success: true,
      message: 'Shopkeeper request rejected',
      data: {
        requestId: request._id,
      },
    });
  } catch (error) {
    console.error('Error rejecting shopkeeper request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject shopkeeper request',
    });
  }
});

// Get all requests (with pagination, super admin only)
router.get('/all-requests', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const query: any = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const requests = await ShopkeeperRequest.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await ShopkeeperRequest.countDocuments(query);

    return res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching all requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
    });
  }
});

export default router;