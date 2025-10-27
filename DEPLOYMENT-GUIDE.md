# Firebase Authentication Deployment Guide

## 🚀 Quick Start (For Testing the New System)

### Option 1: Test New System Alongside Old System

This is the **recommended approach** for testing without breaking existing functionality.

#### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```

#### 2. Verify New Routes Are Active
Check that both old and new auth routes are running:
- Old routes: `http://localhost:5000/api/auth/*`
- New routes: `http://localhost:5000/api/v2/auth/*`

#### 3. Update Frontend to Use New Auth Context

**Temporary Testing Setup** (without breaking existing code):

Create a test layout file:
```bash
# In frontend/src/app/
mkdir test-auth
```

Create `frontend/src/app/test-auth/layout.tsx`:
```typescript
import { AuthProvider } from '@/lib/auth-context-new';

export default function TestAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

Then move the new pages into this folder:
```bash
mv frontend/src/app/login-new frontend/src/app/test-auth/login
mv frontend/src/app/signup-new frontend/src/app/test-auth/signup
mv frontend/src/app/create-profile frontend/src/app/test-auth/create-profile
```

#### 4. Test the New Flow

1. Navigate to `http://localhost:3000/test-auth/signup`
2. Sign up with Google or Email
3. Create your first profile
4. Test profile switching (once you create multiple profiles)

---

## 📦 Full Deployment (Replace Old System)

### Prerequisites

- [x] MongoDB is running
- [x] Firebase project is configured
- [x] Environment variables are set
- [x] You've tested the new system thoroughly

### Step 1: Backup Current Database

```bash
# Create a backup of your MongoDB database
mongodump --uri="YOUR_MONGODB_URI" --out=./backup-$(date +%Y%m%d)
```

### Step 2: Run Migration Script

```bash
cd backend
npx ts-node src/scripts/migrateToFirebaseAuth.ts
```

**What this does:**
- Updates existing Google users with `profileName` field
- Identifies users with passwords that need manual migration
- Shows summary of what needs to be done

**Expected Output:**
```
✅ Connected to MongoDB
📊 Total users found: 25

✅ Updated Google user: user@example.com - Main Account
⚠️  Password user needs manual migration: mobile@example.com (ID: USR001)

📈 Migration Summary:
   Google users (already using Firebase): 20
   Users updated with profileName: 20
   Password users (need manual migration): 5
   Errors: 0
```

### Step 3: Update Frontend App Layout

Replace the auth provider in your main layout:

**File: `frontend/src/app/layout.tsx`**

Find:
```typescript
import { AuthProvider } from '@/lib/auth-context';
```

Replace with:
```typescript
import { AuthProvider } from '@/lib/auth-context-new';
```

### Step 4: Update Route Redirects

**Option A: Gradual Migration (Recommended)**

Keep both old and new pages, redirect users to new pages:

**File: `frontend/src/app/login/page.tsx`**
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Show a message for 2 seconds before redirecting
    const timer = setTimeout(() => {
      router.replace('/login-new');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          We've upgraded our authentication!
        </h2>
        <p className="text-gray-600 mb-4">
          Redirecting you to the new login page...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    </div>
  );
}
```

**File: `frontend/src/app/signup/page.tsx`**
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/signup-new');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div>Redirecting...</div>
    </div>
  );
}
```

**Option B: Full Replacement**

Delete old pages and rename new ones:
```bash
# In frontend/src/app/
rm -rf login signup
mv login-new login
mv signup-new signup
```

### Step 5: Update Navigation Components

Find all components that have login/signup links and update them:

Search for: `/login` and `/signup`
Replace with: `/login-new` and `/signup-new` (if using gradual migration)

Or keep as is if using Option B (full replacement).

### Step 6: Deploy Backend

```bash
cd backend
npm run build
npm start

# Or if using PM2
pm2 restart backend

# Or if using Docker
docker-compose up -d --build backend
```

### Step 7: Deploy Frontend

```bash
cd frontend
npm run build
npm start

# Or if using Vercel
vercel --prod

# Or if using Docker
docker-compose up -d --build frontend
```

---

## 🧪 Testing Checklist

### Authentication Flow

- [ ] **Google Sign-in**
  - [ ] New user → Redirects to profile creation
  - [ ] Existing user with 1 profile → Auto-logs in
  - [ ] Existing user with multiple profiles → Shows profile selector

- [ ] **Email/Password Sign-in**
  - [ ] Can sign in with existing account
  - [ ] Shows profile selector if multiple profiles
  - [ ] Shows error for wrong password

- [ ] **Email/Password Sign-up**
  - [ ] Creates Firebase account
  - [ ] Redirects to profile creation
  - [ ] Validates password strength (min 6 chars)
  - [ ] Shows error if email already exists

- [ ] **Profile Creation**
  - [ ] Can create profile with name and profile name
  - [ ] Customer role works
  - [ ] Shopkeeper role with invite token works
  - [ ] Shopkeeper without invite shows pending status
  - [ ] Referral code works (joins MLM network)
  - [ ] Redirects to dashboard after creation

### Multi-Profile Features

- [ ] **Profile Selector**
  - [ ] Shows all profiles for user
  - [ ] Displays profile name, role, points
  - [ ] Current profile is highlighted
  - [ ] Can switch between profiles

- [ ] **Profile Switcher Component**
  - [ ] Shows current profile info
  - [ ] Dropdown lists all profiles
  - [ ] "Create New Profile" button works
  - [ ] Disables when 5 profiles reached
  - [ ] Sign out button works

- [ ] **Profile Limits**
  - [ ] Can create up to 5 profiles
  - [ ] Shows error when limit reached
  - [ ] Each profile has unique User ID

- [ ] **Profile Isolation**
  - [ ] Each profile has separate points
  - [ ] Each profile has separate MLM position
  - [ ] Switching profiles shows correct data
  - [ ] Can't refer own profiles

### Session Management

- [ ] **Session Persistence**
  - [ ] Login persists on page refresh
  - [ ] JWT token stored in localStorage
  - [ ] Firebase token stored in localStorage
  - [ ] Session expires after 7 days

- [ ] **Logout**
  - [ ] Clears all tokens
  - [ ] Redirects to login page
  - [ ] Can't access protected routes

### Shopkeeper Features

- [ ] **With Invite Token**
  - [ ] Immediately approved as shopkeeper
  - [ ] Has admin access
  - [ ] Can access admin pages

- [ ] **Without Invite Token**
  - [ ] Account status is "pending"
  - [ ] Request created in database
  - [ ] Admin can see and approve request
  - [ ] After approval, gets admin access

### MLM Features

- [ ] **Referral System**
  - [ ] Referral code from URL works (?ref=CODE)
  - [ ] Manual referral code input works
  - [ ] Each profile has unique referral code
  - [ ] Can refer others to any profile
  - [ ] Can't self-refer

- [ ] **Multi-Profile MLM**
  - [ ] Each profile has separate MLM tree
  - [ ] Profile 1 and Profile 2 can be in different positions
  - [ ] Commissions go to correct profile
  - [ ] Can view separate MLM trees per profile

---

## 🐛 Troubleshooting

### Issue: "FirebaseUid is required" Error

**Cause:** Trying to create user without Firebase authentication

**Fix:** Ensure user is authenticated with Firebase before creating profile

### Issue: Profile Selector Not Showing

**Cause:** Multiple profiles exist but selector doesn't appear

**Fix:**
1. Check browser console for errors
2. Verify `firebaseLogin` API is returning `requiresSelection: true`
3. Check that auth context is setting `profileOptions` state

### Issue: Session Lost on Refresh

**Cause:** JWT token not being saved to localStorage

**Fix:**
1. Check that `apiClient.setAuthToken()` is being called
2. Verify localStorage is accessible (not in incognito mode)
3. Check browser console for localStorage errors

### Issue: Can't Switch Profiles

**Cause:** `/switch-profile` endpoint failing

**Fix:**
1. Check that current JWT token is valid
2. Verify target profile belongs to same firebaseUid
3. Check backend logs for error details

### Issue: Old Users Can't Login

**Cause:** Users with password-based accounts not migrated

**Fix:**
1. These users need to use "Forgot Password" with Firebase
2. Or create new account with same email (Google login)
3. Or run manual account linking process

---

## 🔄 Rollback Plan

If something goes wrong, here's how to rollback:

### 1. Restore Database Backup
```bash
mongorestore --uri="YOUR_MONGODB_URI" ./backup-YYYYMMDD
```

### 2. Revert Frontend Changes

```bash
cd frontend
git checkout HEAD~1 src/app/layout.tsx
git checkout HEAD~1 src/app/login/
git checkout HEAD~1 src/app/signup/
```

### 3. Restart Services

```bash
# Backend
pm2 restart backend

# Frontend
pm2 restart frontend
```

---

## 📞 Support

If you encounter issues during deployment:

1. **Check Logs:**
   ```bash
   # Backend
   pm2 logs backend

   # Frontend
   pm2 logs frontend
   ```

2. **Verify Environment Variables:**
   ```bash
   # Backend
   cd backend
   cat .env | grep FIREBASE

   # Frontend
   cd frontend
   cat .env.local | grep NEXT_PUBLIC
   ```

3. **Test API Endpoints:**
   ```bash
   # Health check
   curl http://localhost:5000/api/health

   # New auth endpoint
   curl http://localhost:5000/api/v2/auth/firebase-login
   ```

4. **Check Firebase Console:**
   - Go to Firebase Console → Authentication
   - Check if users are being created
   - Verify authentication methods are enabled

---

## 🎉 Post-Deployment

After successful deployment:

1. **Monitor for Issues:**
   - Check error logs for first 24 hours
   - Monitor user complaints/support tickets
   - Watch for authentication failures

2. **User Communication:**
   - Send email about new authentication system
   - Explain multi-profile feature
   - Provide help documentation

3. **Clean Up Old Code:**
   - After 2 weeks of stable operation
   - Remove old auth routes (`/api/auth`)
   - Remove old auth context (`auth-context.tsx`)
   - Remove password-related fields from User model

4. **Performance Monitoring:**
   - Track login success rate
   - Monitor API response times
   - Check Firebase usage quotas

---

Last Updated: {{TODAY}}
Deployment Status: Ready for Testing
