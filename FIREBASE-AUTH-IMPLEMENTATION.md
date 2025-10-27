# Firebase-First Authentication Implementation

## ✅ Completed Steps

### 1. Backend Changes

#### User Model Updated (`backend/src/models/User.ts`)
- **firebaseUid**: Now required (was optional)
- **profileName**: Added for multi-profile support
- **Removed**: password field (Firebase handles authentication)
- **Indexes**: Updated to support multiple profiles per Firebase user

#### New Auth Routes Created (`backend/src/routes/authNew.ts`)
New endpoints at `/api/v2/auth/*`:
- `POST /firebase-login` - Main login endpoint
- `POST /select-profile` - Select profile from multiple options
- `POST /create-profile` - Create new profile for authenticated user
- `GET /my-profiles` - Get all profiles for current user
- `POST /switch-profile` - Switch between profiles
- `POST /verify` - Verify JWT token

#### Server Updated (`backend/src/index.ts`)
- Added new auth routes at `/api/v2/auth`
- Old routes kept at `/api/auth` for backwards compatibility

### 2. Frontend Changes

#### API Client Updated (`frontend/src/lib/api.ts`)
- Added Firebase token storage
- Added JWT token persistence in localStorage
- New methods:
  - `firebaseLogin()`
  - `selectProfile()`
  - `createProfile()`
  - `switchProfile()`
  - `getMyProfiles()`

#### Types Updated (`frontend/src/types/index.ts`)
- Updated User interface with `firebaseUid` and `profileName`
- Added `ProfileOption` interface

#### New Auth Context (`frontend/src/lib/auth-context-new.tsx`)
- Unified Firebase authentication
- Session persistence
- Profile management
- Methods:
  - `signInWithGoogle()`
  - `signInWithEmail()`
  - `signUpWithEmail()`
  - `selectProfile()`
  - `createProfile()`
  - `switchProfile()`

#### New Login Page (`frontend/src/app/login-new/page.tsx`)
- Google Sign-in
- Email/Password Sign-in
- Profile selector UI

### 3. Migration Script

Created `backend/src/scripts/migrateToFirebaseAuth.ts` to migrate existing users.

---

## 🚧 Remaining Steps

### 4. Complete UI Pages (Status: Pending)

#### A. Create Signup Page
File: `frontend/src/app/signup-new/page.tsx`

Should include:
- Google Sign-up button
- Email/Password registration
- Automatic redirect to profile creation

#### B. Create Profile Creation Page
File: `frontend/src/app/create-profile/page.tsx`

Features needed:
- Name input
- Profile name input (e.g., "Main Account", "Business")
- Role selection (Customer/Shopkeeper)
- Invite token input (for shopkeepers)
- Referral code input
- Success message with unique User ID display

#### C. Create Profile Switcher Component
File: `frontend/src/components/ProfileSwitcher.tsx`

Features needed:
- Dropdown showing all profiles
- Current profile indicator
- Quick switch functionality
- "Create New Profile" button
- Profile count indicator (e.g., "3/5 profiles")

### 5. Update Layout to Use New Auth Context

File: `frontend/src/app/layout.tsx`

Change:
```typescript
import { AuthProvider } from '@/lib/auth-context';
```

To:
```typescript
import { AuthProvider } from '@/lib/auth-context-new';
```

### 6. Update All Components Using Auth

Search for components importing `@/lib/auth-context` and update to use new context:
- Dashboard pages
- Admin pages
- Profile pages
- Navigation components

### 7. Add Phone Authentication (Optional but Recommended)

Firebase supports phone authentication with SMS OTP. Add:
- Phone number input with country code selector
- SMS verification code input
- Backend support for phone auth

---

## 🔧 How to Deploy

### Step 1: Run Migration Script

```bash
cd backend
npx ts-node src/scripts/migrateToFirebaseAuth.ts
```

This will:
- Update existing Google users with profileName
- Identify users that need manual migration

### Step 2: Update Environment Variables

Ensure all Firebase credentials are set in `.env`:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Step 3: Deploy Backend

```bash
cd backend
npm run build
npm start
```

### Step 4: Update Frontend Routes

Temporarily redirect old routes to new ones:

In `frontend/src/app/login/page.tsx`:
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login-new');
  }, [router]);
  return <div>Redirecting...</div>;
}
```

### Step 5: Deploy Frontend

```bash
cd frontend
npm run build
npm start
```

---

## 📋 Testing Checklist

### Authentication Flow
- [ ] Google Sign-in works
- [ ] Email/Password Sign-in works
- [ ] Email/Password Sign-up works
- [ ] New users are prompted to create profile
- [ ] Profile creation succeeds
- [ ] Multiple profiles show selector
- [ ] Profile selection works
- [ ] Session persists on page refresh
- [ ] Logout clears session

### Multi-Profile Features
- [ ] Can create up to 5 profiles per Firebase account
- [ ] Profile names are unique per user
- [ ] Each profile has its own:
  - Unique User ID
  - Points balance
  - MLM position
  - Role (customer/shopkeeper)
- [ ] Can switch between profiles
- [ ] Profile switcher shows all profiles
- [ ] Current profile is highlighted

### Shopkeeper Features
- [ ] Shopkeeper registration with invite token works
- [ ] Shopkeeper request pending approval works
- [ ] Admin can approve/reject requests
- [ ] Approved shopkeepers get admin access

### MLM Features
- [ ] Referral code works during signup
- [ ] Each profile has separate MLM position
- [ ] Commissions are profile-specific
- [ ] Can't refer own profiles

---

## 🐛 Known Issues to Fix

### 1. User Profile Endpoint
The `/api/user/profile` endpoint needs updating to work with JWT auth (not Firebase token).

Current issue: Auth context tries to call this endpoint after Firebase login.

**Fix**: Update `backend/src/routes/user.ts` to accept JWT from new auth system.

### 2. Admin Routes
Admin routes may still expect Firebase tokens. Need to verify they work with new JWT system.

### 3. Old Accounts Migration
Users with password-based accounts need manual migration:
1. They must login with Firebase (using same email/phone)
2. System should detect and link their old profile
3. Or provide a "link account" flow

---

## 🚀 Future Enhancements

### 1. Phone Authentication
Add Firebase Phone Auth with SMS OTP for better mobile experience.

### 2. Account Linking
Allow users to link multiple authentication methods (Google + Email + Phone) to same Firebase account.

### 3. Profile Pictures
Add profile pictures for each profile using Firebase Storage.

### 4. Profile Settings
Allow users to:
- Rename profiles
- Delete profiles (with confirmation)
- Set default profile
- Transfer data between profiles

### 5. Admin Dashboard
Add admin view to:
- See all Firebase accounts
- See profiles per account
- Merge duplicate accounts
- Handle account issues

---

## 📞 Support

If you encounter issues:

1. Check Firebase Console for authentication errors
2. Check backend logs for API errors
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
5. Ensure MongoDB connection is working

---

## 🎉 Benefits of This Architecture

✅ **Multiple profiles per phone/email** - Each profile has separate MLM position, points, etc.
✅ **Unified authentication** - Firebase handles all auth complexity
✅ **Session persistence** - Works across page refreshes
✅ **Better security** - Firebase's battle-tested auth system
✅ **Easy to extend** - Can add more auth providers easily
✅ **Better UX** - Passwordless login options (Google, Phone OTP)
✅ **No password management** - Firebase handles password reset, etc.

---

Last Updated: {{TODAY}}
Implementation Status: 70% Complete
