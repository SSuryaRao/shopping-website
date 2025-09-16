# Role-Based Approval System Documentation

This document outlines the secure role/approval system implementation for the Shopping Website project, which prevents unauthorized admin access through an invite + approval workflow.

## Overview

The system implements a three-tier role system:
- **Customer**: Regular users who can shop and earn points
- **Shopkeeper**: Admin users who can manage products and orders
- **Super Admin**: Users who can generate invite tokens and approve shopkeeper requests

## Architecture

### Backend Components

#### Models
- **User**: Enhanced with `role`, `isSuperAdmin` fields
- **InviteToken**: Stores hashed invite tokens with expiration
- **ShopkeeperRequest**: Tracks pending shopkeeper applications

#### Authentication Flow
1. Firebase handles authentication (email/password, Google)
2. Custom registration endpoint processes role assignments
3. Firebase custom claims set for approved admins
4. Middleware enforces role-based access control

#### Security Features
- Tokens are cryptographically hashed using bcrypt
- Invite tokens have configurable expiration (max 7 days)
- Single-use token system
- Super admin designation via environment variable or database flag

### Frontend Components

#### Enhanced Signup Flow
- Role selector (Customer/Shopkeeper)
- Conditional invite token field for shopkeepers
- Optional application message
- Status-aware redirects based on approval state

#### Admin Dashboard
- Super admin invite token generation
- Pending request management
- Token usage tracking
- Approval/rejection workflow

## Setup Instructions

### 1. Environment Configuration

Add to your `.env` file:
```bash
SUPER_ADMIN_EMAIL=admin@yourdomain.com
```

### 2. Database Migration

The system automatically handles new model fields. Existing users will need manual role assignment.

### 3. Creating the First Super Admin

Option A - Environment Variable:
- Set `SUPER_ADMIN_EMAIL` to your email
- Sign up normally - you'll automatically get super admin privileges

Option B - Manual Database Update:
```javascript
// In MongoDB shell or your preferred admin tool
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { isSuperAdmin: true, isAdmin: true, role: "shopkeeper" } }
)
```

## Usage Workflow

### For Super Admins

1. **Generate Invite Tokens**:
   - Navigate to `/admin/invites`
   - Click "Generate Token" tab
   - Set expiration time (1-168 hours)
   - Add optional note
   - Copy token immediately (shown only once)

2. **Approve Shopkeeper Requests**:
   - Check "Pending Requests" tab
   - Review applicant information
   - Approve or reject with optional reason
   - System automatically sets Firebase custom claims

### For New Shopkeepers

#### With Invite Token:
1. Go to signup page
2. Select "Shopkeeper" role
3. Enter valid invite token
4. Complete registration → Immediate approval

#### Without Invite Token:
1. Go to signup page
2. Select "Shopkeeper" role
3. Fill optional application message
4. Submit → Pending approval status
5. Wait for super admin review

### For Customers
1. Select "Customer" role
2. Complete standard signup
3. Immediate access to shopping features

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with role selection
- `POST /api/auth/verify` - Token verification with role information

### Super Admin Only
- `POST /api/admin/invites` - Generate invite token
- `GET /api/admin/invites` - List all invite tokens
- `GET /api/admin/shopkeeper-requests` - Get pending requests
- `POST /api/admin/approve-shopkeeper` - Approve shopkeeper request
- `POST /api/admin/reject-shopkeeper` - Reject shopkeeper request
- `GET /api/admin/all-requests` - Get all requests (paginated)

## Security Considerations

### Token Security
- Invite tokens are 64-character cryptographically secure random strings
- Only hashed versions stored in database
- Automatic expiration cleanup
- Single-use enforcement

### Access Control
- Middleware validates Firebase tokens and database roles
- Super admin checks both environment variable and database flag
- Protected routes enforce appropriate access levels
- Firebase custom claims sync with database state

### Best Practices
- Never log plain text tokens
- Use HTTPS in production
- Regularly audit invite token usage
- Monitor failed approval attempts
- Set appropriate token expiration times

## Testing Examples

### cURL Examples

Generate invite token:
```bash
curl -X POST http://localhost:5000/api/admin/invites \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresInHours": 72, "note": "For John Doe"}'
```

Register with invite token:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "shopkeeper",
    "inviteToken": "generated_token_here",
    "profile": {"name": "John Doe", "message": "Experienced retailer"}
  }'
```

Approve shopkeeper request:
```bash
curl -X POST http://localhost:5000/api/admin/approve-shopkeeper \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requestId": "request_id_here"}'
```

## Troubleshooting

### Common Issues

1. **Firebase Custom Claims Not Working**:
   - Check Firebase Admin SDK initialization
   - Verify service account permissions
   - Force token refresh: `user.getIdToken(true)`

2. **Super Admin Access Denied**:
   - Verify `SUPER_ADMIN_EMAIL` environment variable
   - Check user email matches exactly
   - Confirm database `isSuperAdmin` flag

3. **Invite Token Invalid**:
   - Check token hasn't expired
   - Verify token hasn't been used
   - Ensure exact token match (case-sensitive)

4. **Registration Failing**:
   - Verify Firebase token validity
   - Check network connectivity to backend
   - Review server logs for specific errors

### Database Queries

Check user roles:
```javascript
db.users.find({}, {email: 1, role: 1, isAdmin: 1, isSuperAdmin: 1})
```

Check pending requests:
```javascript
db.shopkeeper_requests.find({status: "pending"})
```

Check active invite tokens:
```javascript
db.invite_tokens.find({used: false, expiresAt: {$gt: new Date()}})
```

## Deployment Considerations

### Environment Variables
- Set `SUPER_ADMIN_EMAIL` in production
- Use strong Firebase credentials
- Configure appropriate CORS origins

### Database Indexes
The system automatically creates necessary indexes:
- `users.firebaseUid` (unique)
- `users.email` (unique)
- `invite_tokens.tokenHash` (unique)
- `shopkeeper_requests.email` + `status`

### Monitoring
- Monitor invite token generation/usage
- Track approval/rejection rates
- Log authentication failures
- Alert on suspicious activity patterns

This system provides enterprise-grade security while maintaining usability for legitimate users. The invite token system allows controlled onboarding while the approval workflow provides a fallback for users without tokens.