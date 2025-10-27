# Multi-Account Authentication API - Testing Guide

## 🚀 Quick Start

### 1. Setup Environment Variables

Add to your `.env` file:
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_TEMP_SECRET=your-temporary-token-secret-key-minimum-32-characters
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Run Migration (For Existing Users)

```bash
cd backend
npx ts-node src/scripts/migrateUsers.ts
```

### 3. Start Server

```bash
npm run dev
```

---

## 📋 API Endpoints Reference

### Base URL
```
http://localhost:5000/api/auth
```

---

## 1️⃣ **REGISTRATION ENDPOINTS**

### A. Register with Mobile Number

**Endpoint:** `POST /api/auth/register/new`

**Request:**
```json
{
  "registrationType": "mobile",
  "mobileNumber": "+919876543210",
  "password": "SecurePass123",
  "name": "John Doe",
  "displayName": "John's Main Account",
  "role": "customer",
  "referralCode": "ABC12345"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "status": "approved",
  "isAdmin": false,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6...",
    "uniqueUserId": "USR123456",
    "name": "John Doe",
    "displayName": "John's Main Account",
    "email": null,
    "mobileNumber": "+919876543210",
    "role": "customer",
    "totalPoints": 0,
    "referralCode": "XYZ98765",
    "isAdmin": false,
    "isSuperAdmin": false
  }
}
```

**Notes:**
- `displayName` is optional, defaults to "{name}'s Account"
- `referralCode` is optional
- `role` defaults to "customer", can be "shopkeeper" (requires approval)
- Maximum 5 accounts per mobile number

### B. Register with Email

Same as mobile registration, but use:
```json
{
  "registrationType": "email",
  "email": "john@example.com",
  "password": "SecurePass123",
  ...
}
```

---

## 2️⃣ **LOGIN ENDPOINTS**

### A. Login with Mobile Number

**Endpoint:** `POST /api/auth/login/mobile`

**Request:**
```json
{
  "mobileNumber": "+919876543210",
  "password": "SecurePass123"
}
```

**Response (Single Account - 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6...",
    "uniqueUserId": "USR123456",
    "name": "John Doe",
    "displayName": "John's Main Account",
    "email": null,
    "mobileNumber": "+919876543210",
    "role": "customer",
    "totalPoints": 150,
    "isAdmin": false,
    "isSuperAdmin": false,
    "referralCode": "XYZ98765"
  }
}
```

**Response (Multiple Accounts - 200):**
```json
{
  "success": true,
  "requiresSelection": true,
  "accounts": [
    {
      "uniqueUserId": "USR123456",
      "displayName": "John's Main Account",
      "name": "John Doe",
      "role": "customer",
      "totalPoints": 150,
      "isAdmin": false
    },
    {
      "uniqueUserId": "USR789012",
      "displayName": "John's Business",
      "name": "John Doe",
      "role": "shopkeeper",
      "totalPoints": 500,
      "isAdmin": true
    }
  ],
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**
- If multiple accounts exist, user must select one using `/select-account`
- `tempToken` expires in 5 minutes

### B. Login with User ID

**Endpoint:** `POST /api/auth/login/userid`

**Request:**
```json
{
  "uniqueUserId": "USR123456",
  "password": "SecurePass123"
}
```

**Response:**
Same as single account login response above.

**Notes:**
- Direct login, no account selection needed
- User ID is case-insensitive

### C. Login with Email

**Endpoint:** `POST /api/auth/login/email`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
Same as mobile login (can return single account or multiple accounts).

---

## 3️⃣ **ACCOUNT SELECTION**

### Select Account (After Multi-Account Detection)

**Endpoint:** `POST /api/auth/select-account`

**Request:**
```json
{
  "uniqueUserId": "USR123456",
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6...",
    "uniqueUserId": "USR123456",
    "name": "John Doe",
    "displayName": "John's Main Account",
    ...
  }
}
```

**Error (401 - Token Expired):**
```json
{
  "success": false,
  "message": "Invalid or expired token. Please login again."
}
```

---

## 4️⃣ **ACCOUNT MANAGEMENT**

### A. Get Switchable Accounts

**Endpoint:** `GET /api/auth/switchable-accounts`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "accounts": [
    {
      "uniqueUserId": "USR789012",
      "displayName": "John's Business",
      "name": "John Doe",
      "role": "shopkeeper",
      "totalPoints": 500,
      "isAdmin": true
    }
  ]
}
```

**Notes:**
- Returns other accounts that share same mobile/email
- Excludes current account

### B. Switch Account

**Endpoint:** `POST /api/auth/switch-account`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request:**
```json
{
  "uniqueUserId": "USR789012"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6...",
    "uniqueUserId": "USR789012",
    "name": "John Doe",
    "displayName": "John's Business",
    ...
  }
}
```

**Error (403):**
```json
{
  "success": false,
  "message": "Cannot switch to this account"
}
```

### C. Check Existing Accounts

**Endpoint:** `POST /api/auth/check-accounts`

**Request:**
```json
{
  "identifier": "+919876543210",
  "type": "mobile"
}
```

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "hasAccounts": true,
  "canCreateMore": true,
  "remainingSlots": 3
}
```

**Notes:**
- `type` can be "mobile" or "email"
- Useful for showing UI feedback during registration

---

## 5️⃣ **EXISTING ENDPOINTS (Firebase/Google)**

### Register with Google (Original)

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Authorization: Bearer <firebase-token>
```

**Request:**
```json
{
  "role": "customer",
  "profile": {
    "name": "John Doe",
    "displayName": "John's Account"
  },
  "referralCode": "ABC12345"
}
```

**Response:**
Same structure as new registration endpoint.

**Notes:**
- Still works for Google OAuth users
- Now also generates `uniqueUserId`

---

## 🧪 **TESTING SCENARIOS**

### Scenario 1: New User Registration (Mobile)

1. **Register First Account:**
```bash
POST /api/auth/register/new
{
  "registrationType": "mobile",
  "mobileNumber": "+919876543210",
  "password": "Test@123",
  "name": "Test User",
  "role": "customer"
}
```

Expected: Returns `uniqueUserId` (e.g., USR123456)

2. **Login with Mobile:**
```bash
POST /api/auth/login/mobile
{
  "mobileNumber": "+919876543210",
  "password": "Test@123"
}
```

Expected: Direct login (single account)

3. **Register Second Account (Same Mobile):**
```bash
POST /api/auth/register/new
{
  "registrationType": "mobile",
  "mobileNumber": "+919876543210",
  "password": "Test@123",
  "name": "Test User",
  "displayName": "Business Account",
  "role": "customer"
}
```

Expected: New account with different `uniqueUserId`

4. **Login Again:**
```bash
POST /api/auth/login/mobile
{
  "mobileNumber": "+919876543210",
  "password": "Test@123"
}
```

Expected: Returns account selector with 2 accounts

---

### Scenario 2: Multi-Account Login Flow

1. **Login with Mobile:**
```bash
POST /api/auth/login/mobile
{
  "mobileNumber": "+919876543210",
  "password": "Test@123"
}
```

2. **Select Account:**
```bash
POST /api/auth/select-account
{
  "uniqueUserId": "USR123456",
  "tempToken": "<token-from-step-1>"
}
```

3. **Access Protected Route:**
```bash
GET /api/user/profile
Headers: Authorization: Bearer <token-from-step-2>
```

---

### Scenario 3: Account Switching

1. **Get Switchable Accounts:**
```bash
GET /api/auth/switchable-accounts
Headers: Authorization: Bearer <current-token>
```

2. **Switch to Another Account:**
```bash
POST /api/auth/switch-account
{
  "uniqueUserId": "USR789012"
}
Headers: Authorization: Bearer <current-token>
```

3. **Use New Token:**
```bash
GET /api/user/profile
Headers: Authorization: Bearer <new-token-from-step-2>
```

---

### Scenario 4: User ID Login

1. **Login Directly with User ID:**
```bash
POST /api/auth/login/userid
{
  "uniqueUserId": "USR123456",
  "password": "Test@123"
}
```

Expected: Direct login, no account selection

---

### Scenario 5: Account Limits

1. **Create 5 Accounts:**
Repeat registration 5 times with same mobile number.

2. **Try Creating 6th Account:**
```bash
POST /api/auth/register/new
{
  "registrationType": "mobile",
  "mobileNumber": "+919876543210",
  "password": "Test@123",
  "name": "Test User",
  "role": "customer"
}
```

Expected Error (400):
```json
{
  "success": false,
  "message": "Maximum account limit (5) reached for this mobile number"
}
```

---

### Scenario 6: Self-Referral Prevention

1. **Register First Account:**
```bash
POST /api/auth/register/new
{
  "registrationType": "mobile",
  "mobileNumber": "+919876543210",
  "password": "Test@123",
  "name": "Test User",
  "role": "customer"
}
```

Note the `referralCode` returned (e.g., XYZ98765)

2. **Try Referring Second Account to First:**
```bash
POST /api/auth/register/new
{
  "registrationType": "mobile",
  "mobileNumber": "+919876543210",
  "password": "Test@123",
  "name": "Test User",
  "displayName": "Second Account",
  "role": "customer",
  "referralCode": "XYZ98765"
}
```

Expected: Registration succeeds but referral is silently ignored (MLM tree not updated)

---

## 📊 **Error Codes Reference**

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created (Registration) |
| 400 | Bad Request (Validation error, account limit) |
| 401 | Unauthorized (Invalid credentials, expired token) |
| 403 | Forbidden (Cannot switch account) |
| 404 | Not Found (Account not found) |
| 500 | Server Error |

---

## 🔐 **Security Notes**

1. **Passwords:**
   - Minimum 6 characters
   - Hashed with bcrypt (10 rounds)
   - Never returned in API responses

2. **Tokens:**
   - JWT tokens expire in 7 days
   - Temp tokens expire in 5 minutes
   - Store securely on client side

3. **Account Limits:**
   - Max 5 accounts per mobile/email
   - Prevents abuse

4. **Self-Referral:**
   - Automatically blocked in MLM system
   - Checked by mobile/email

---

## 🐛 **Troubleshooting**

### Issue: "User must have at least one identifier"
**Solution:** Ensure you provide either `mobileNumber` or `email` during registration.

### Issue: "Invalid or expired token"
**Solution:** Check if:
- JWT_SECRET matches in .env
- Token hasn't expired (7 days for main, 5 mins for temp)
- Token is sent in Authorization header as "Bearer {token}"

### Issue: "Firebase token verification failed"
**Solution:** For Google login users, ensure Firebase is properly configured.

### Issue: Migration script fails
**Solution:** Check MongoDB connection string in .env

---

## 📝 **Postman Collection**

Import this JSON to Postman for quick testing:

```json
{
  "info": {
    "name": "Multi-Account Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register (Mobile)",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/register/new",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"registrationType\": \"mobile\",\n  \"mobileNumber\": \"+919876543210\",\n  \"password\": \"Test@123\",\n  \"name\": \"Test User\",\n  \"displayName\": \"My Account\",\n  \"role\": \"customer\"\n}"
        }
      }
    },
    {
      "name": "Login (Mobile)",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login/mobile",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"mobileNumber\": \"+919876543210\",\n  \"password\": \"Test@123\"\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    }
  ]
}
```

---

**Happy Testing! 🚀**
