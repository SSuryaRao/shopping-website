# Multi-Account System with Unique User IDs (UID)

## Overview

This application supports **multiple accounts per phone number or email address**, differentiated by a unique **User ID (UID)**. Each account operates independently with its own MLM position, points, role, and settings.

---

## 🔑 How User IDs Work

### What is a User ID?

- **Format**: `USR` + 6 random digits (e.g., `USR123456`, `USR789012`)
- **Generated**: Automatically when you create an account
- **Purpose**: Unique identifier for each account/profile
- **Uniqueness**: Guaranteed to be unique across the entire system

### Why Use User IDs?

1. **Create Multiple Accounts**: Use the same phone number or email for multiple accounts
2. **Quick Login**: Login directly with User ID instead of typing phone/email
3. **Account Selection**: Easily identify which account to use when you have multiple
4. **Profile Switching**: Switch between your accounts without re-authentication

---

## 📱 User Journey

### 1. Registration Flow

#### Step 1: Choose Registration Method
- **Mobile Number**: Register using phone number
- **Email Address**: Register using email
- **User ID Login**: Available after you create your first account

#### Step 2: Fill Registration Form
```
Name: John Doe
Display Name: My Main Account (optional)
Mobile/Email: +1234567890 or john@example.com
Password: ******** (minimum 6 characters)
Role: Customer or Shopkeeper
Referral Code: ABC123 (optional)
```

#### Step 3: Receive Your User ID
After successful registration, you'll see a success screen showing your **unique User ID**:

```
┌─────────────────────────────────┐
│   ✓ Account Created!            │
├─────────────────────────────────┤
│ Your Unique User ID             │
│                                 │
│   ┌───────────────┐             │
│   │  USR123456    │  [Copy]     │
│   └───────────────┘             │
│                                 │
│ Save this User ID!              │
│ • Login directly with User ID   │
│ • Select account if multiple    │
│ • Quick access without email    │
└─────────────────────────────────┘
```

**Important**: Screenshot or write down your User ID!

---

### 2. Login Flow

You have **3 login methods**:

#### Method 1: Login with Mobile Number
```
Mobile: +1234567890
Password: ********
```

**If you have multiple accounts with this mobile:**
- System shows account selection screen
- Each account displays its User ID prominently
- Click on the account you want to use

**If you have only one account:**
- Direct login to dashboard

#### Method 2: Login with Email
```
Email: john@example.com
Password: ********
```

Same multi-account selection as mobile login.

#### Method 3: Login with User ID (Fastest)
```
User ID: USR123456
Password: ********
```

**Always direct login** - no account selection needed!

---

### 3. Multiple Accounts Example

**Scenario**: You want separate personal and business accounts

#### Registration Process:

**Account 1 - Personal:**
```
Mobile: +1234567890
Password: mypassword123
Name: John Doe
Display Name: Personal Account
Role: Customer

→ Assigned User ID: USR111222
```

**Account 2 - Business:**
```
Mobile: +1234567890  (SAME PHONE!)
Password: mypassword123 (SAME PASSWORD!)
Name: John Doe
Display Name: Business Account
Role: Shopkeeper

→ Assigned User ID: USR333444
```

#### Login Process:

**Option A: Login via Mobile**
```
1. Enter: +1234567890 + password
2. System shows selection screen:

   ┌────────────────────────────────────┐
   │ Select Your Account (2)            │
   ├────────────────────────────────────┤
   │                                    │
   │ ┌─ USR111222 ──────────────────┐  │
   │ │ Personal Account              │  │
   │ │ John Doe • Customer • 500 pts │  │
   │ └───────────────────────────────┘  │
   │                                    │
   │ ┌─ USR333444 ──────────────────┐  │
   │ │ Business Account              │  │
   │ │ John Doe • Shopkeeper • 0 pts │  │
   │ └───────────────────────────────┘  │
   │                                    │
   └────────────────────────────────────┘

3. Click the account you want to use
```

**Option B: Direct Login via User ID**
```
1. Enter: USR333444 + password
2. Instant login to Business Account
   (No selection screen - goes straight to dashboard)
```

---

## 🎯 Key Features

### Account Limits
- **Maximum 5 accounts** per phone number
- **Maximum 5 accounts** per email address
- Limit enforced during registration
- Clear error message when limit reached

### Password Policy
**Important**: All accounts sharing the same phone/email should use the **same password**.

**Why?** When you login with phone/email and password, the system validates the password once, then shows all accounts with that identifier.

**Best Practice**:
- Use the same password for all accounts on the same phone/email
- Or use User ID login for accounts with different passwords

### Account Isolation
Each User ID has **completely separate**:
- ✅ MLM Tree Position
- ✅ Points Balance
- ✅ Earnings & Withdrawals
- ✅ Role (Customer/Shopkeeper)
- ✅ Admin Permissions
- ✅ Order History
- ✅ Referral Code

**Switching accounts** gives you a fresh session with that account's data.

---

## 🔄 Account Switching

### While Logged In

If you're logged in and want to switch to another account:

**Desktop/Web:**
1. Click your profile picture/name in header
2. Dropdown shows all your accounts
3. Click the account you want to switch to
4. Page reloads with new account data

**Account Switcher UI:**
```
┌─────────────────────────────────┐
│ 👤 Personal Account             │
│    USR111222 • 500 pts          │
├─────────────────────────────────┤
│ Switch Profile (2/5)            │
│                                 │
│ ✓ USR111222 Personal Account   │
│   Customer • 500 pts            │
│                                 │
│   USR333444 Business Account    │
│   Shopkeeper • 0 pts            │
│                                 │
│ + Create New Profile            │
│                                 │
│ Sign Out                        │
└─────────────────────────────────┘
```

---

## 🛡️ Security Features

### Token-Based Authentication
- JWT tokens expire after **7 days**
- Temporary selection tokens expire after **5 minutes**
- Each account switch generates a new token

### Access Validation
- Cannot switch to accounts with different phone/email
- Selection token validates identifier ownership
- Password verification before account access

### Data Privacy
- Each account's data is completely isolated
- No cross-account data leakage
- Separate MLM trees prevent referral conflicts

---

## 💡 Use Cases

### Personal Use Case: Multiple Roles
```
Account 1 (USR111111): Personal Shopping (Customer)
Account 2 (USR222222): Side Business (Shopkeeper)
Account 3 (USR333333): Testing Account (Customer)
```

### Business Use Case: Team Management
```
Manager Phone: +9876543210

Account 1 (USR444444): Main Business Account (Shopkeeper)
Account 2 (USR555555): Backup Admin Account (Shopkeeper)
Account 3 (USR666666): Sales Tracking (Customer)
```

### Family Use Case: Shared Device
```
Family Email: family@example.com

Account 1 (USR777777): Dad's Account
Account 2 (USR888888): Mom's Account
Account 3 (USR999999): Kid's Account
```

---

## 📋 API Endpoints

### Registration
```
POST /api/auth/register/new
Body: {
  "registrationType": "mobile" | "email",
  "mobileNumber": "+1234567890" (if mobile),
  "email": "user@example.com" (if email),
  "password": "securepass123",
  "name": "John Doe",
  "displayName": "My Account",
  "role": "customer" | "shopkeeper",
  "referralCode": "ABC123" (optional)
}

Response: {
  "success": true,
  "user": {
    "uniqueUserId": "USR123456",
    "name": "John Doe",
    ...
  },
  "token": "jwt-token-here"
}
```

### Login Endpoints

**Mobile Login:**
```
POST /api/auth/login/mobile
Body: {
  "mobileNumber": "+1234567890",
  "password": "securepass123"
}

Response (Single Account):
{
  "success": true,
  "token": "jwt-token",
  "user": { ... }
}

Response (Multiple Accounts):
{
  "success": true,
  "requiresSelection": true,
  "accounts": [
    {
      "uniqueUserId": "USR111111",
      "displayName": "Personal",
      "role": "customer",
      "totalPoints": 500,
      "isAdmin": false
    },
    {
      "uniqueUserId": "USR222222",
      "displayName": "Business",
      "role": "shopkeeper",
      "totalPoints": 0,
      "isAdmin": true
    }
  ],
  "tempToken": "temp-jwt-5min-expiry"
}
```

**Email Login:**
```
POST /api/auth/login/email
Body: {
  "email": "user@example.com",
  "password": "securepass123"
}

Response: Same as mobile login
```

**User ID Login:**
```
POST /api/auth/login/userid
Body: {
  "uniqueUserId": "USR123456",
  "password": "securepass123"
}

Response: Always single account
{
  "success": true,
  "token": "jwt-token",
  "user": { ... }
}
```

**Account Selection:**
```
POST /api/auth/select-account
Body: {
  "uniqueUserId": "USR123456",
  "tempToken": "temp-token-from-login"
}

Response: {
  "success": true,
  "token": "jwt-token",
  "user": { ... }
}
```

**Account Switching (Authenticated):**
```
POST /api/auth/switch-account
Headers: {
  "Authorization": "Bearer jwt-token"
}
Body: {
  "uniqueUserId": "USR222222"
}

Response: {
  "success": true,
  "token": "new-jwt-token",
  "user": { ... }
}
```

---

## 🔧 Technical Implementation

### Database Schema
```javascript
{
  firebaseUid: String (unique, sparse),
  uniqueUserId: String (unique, required),  // USR123456
  email: String (indexed, NOT unique),
  mobileNumber: String (indexed, NOT unique),
  password: String (hashed, select: false),
  name: String,
  displayName: String,
  role: 'customer' | 'shopkeeper' | 'pending',
  totalPoints: Number,
  referralCode: String (unique),
  // ... MLM fields
}
```

### Compound Indexes
```javascript
// Optimize multi-account queries
{ firebaseUid: 1, uniqueUserId: 1 }
{ mobileNumber: 1, uniqueUserId: 1 }
{ email: 1, uniqueUserId: 1 }
```

### UID Generation Algorithm
```javascript
// Format: USR + 6 random digits
async function generateUniqueUserId() {
  let uniqueId;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    uniqueId = `USR${randomNum}`;

    // Check database for collision
    const user = await User.findOne({ uniqueUserId });
    exists = !!user;
  }

  return uniqueId; // e.g., USR738291
}
```

---

## ❓ FAQ

### Q: Can I change my User ID?
**A:** No, User IDs are permanent and cannot be changed once assigned.

### Q: What if I forget my User ID?
**A:** Login using your phone number or email. Your User ID will be displayed in the account selection screen or in your profile after login.

### Q: Can two different people use the same phone number?
**A:** Yes, but they'll see each other's accounts during login. For security, each person should verify their phone number (OTP - to be implemented).

### Q: Do I need different passwords for each account?
**A:** Best practice is to use the same password for all accounts on the same phone/email. If you use different passwords, login via User ID directly.

### Q: Can I delete an account?
**A:** Contact support to delete an account. This action is irreversible.

### Q: What happens to my MLM tree if I have multiple accounts?
**A:** Each account has its own independent MLM tree. They don't share referrals or earnings.

### Q: Can I transfer points between my accounts?
**A:** No, accounts are completely isolated. Points cannot be transferred.

### Q: Is there a limit to how many accounts I can create?
**A:** Yes, maximum 5 accounts per phone number or email address.

---

## 🚀 Getting Started

### For New Users

1. **Sign Up**
   - Go to signup page
   - Choose mobile or email registration
   - Fill in your details
   - **Save your User ID** when displayed!

2. **Login**
   - Use User ID for fastest login
   - Or use mobile/email and select account if multiple

3. **Explore**
   - Each account is independent
   - Shop, earn points, refer friends
   - Switch accounts anytime from profile menu

### For Existing Users

If you already have an account and want to create another:

1. **Logout** from current account
2. **Sign Up** again with the **same phone/email**
3. System will create a new account with a new User ID
4. Next login will show both accounts for selection

---

## 📞 Support

If you encounter issues with User IDs or multi-account functionality:

1. Check this guide first
2. Ensure you're using the correct User ID format (USR + 6 digits)
3. Verify password is correct
4. Contact support with your User ID (not password!)

---

## 🔄 Version History

**v1.0** - Initial multi-account system with User IDs
- Random UID generation (USR + 6 digits)
- Support for 5 accounts per identifier
- Mobile/Email/UserID login methods
- Account selection UI
- Profile switching functionality

---

**Last Updated**: 2025-10-26
**System Status**: ✅ Production Ready
