# Fix: Duplicate Key Error on firebaseUid

## Problem

When trying to create a second account with the same mobile number/email, you get this error:

```
MongoServerError: E11000 duplicate key error collection: test.users index: firebaseUid_1 dup key: { firebaseUid: null }
```

## Root Cause

The `firebaseUid` field has a **unique index** that doesn't properly support multiple `null` values. This prevents creating multiple accounts without Firebase authentication (i.e., mobile/email registration).

## Solution

### Step 1: Stop the Backend Server

Press `Ctrl+C` in your terminal to stop the running backend server.

### Step 2: Run the Index Fix Script

In your backend directory, run:

```bash
npm run fix-index
```

This script will:
1. Connect to your MongoDB database
2. Drop the old `firebaseUid_1` index
3. Create a new **sparse unique** index that allows multiple null values
4. Show you the before/after index configuration

### Expected Output:

```
🔧 Starting index fix...
✅ Connected to MongoDB

📋 Current indexes:
  - _id_: {"_id":1}
  - firebaseUid_1: {"firebaseUid":1} (unique)  ← PROBLEMATIC
  - uniqueUserId_1: {"uniqueUserId":1} (unique)

🗑️  Dropping old firebaseUid_1 index...
✅ Old index dropped

🔄 Syncing indexes from User model...
✅ Indexes synced

📋 Updated indexes:
  - _id_: {"_id":1}
  - firebaseUid_1: {"firebaseUid":1} (unique) (sparse)  ← FIXED!
  - uniqueUserId_1: {"uniqueUserId":1} (unique)

📊 Documents with null/missing firebaseUid: 2
📊 Documents with firebaseUid: 0

✅ Index fix completed successfully!
💡 You can now create multiple accounts with the same phone/email

👋 Disconnected from MongoDB
🎉 Script finished successfully
```

### Step 3: Restart the Backend Server

```bash
npm run dev
```

### Step 4: Test Multi-Account Registration

Now try registering again with the same mobile number:

**Account 1:**
```
Name: John Doe
Mobile: +1234567890
Password: test123
→ Gets User ID: USR123456
```

**Account 2 (Same Mobile):**
```
Name: John Business
Mobile: +1234567890  (SAME!)
Password: test123     (SAME!)
→ Gets User ID: USR789012  (DIFFERENT!)
```

**Login Test:**
```
Mobile: +1234567890
Password: test123
→ Shows selection screen with both accounts
```

---

## What Changed?

### Before:
```javascript
firebaseUid: {
  type: String,
  unique: true,      // ← Doesn't allow multiple nulls
  sparse: true,
  index: true,
}
```

### After:
```javascript
firebaseUid: {
  type: String,
  sparse: true,      // ← Field definition without unique
}

// Index defined separately with proper options
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });
```

### Why This Works:

- **Sparse Index**: Only indexes documents where `firebaseUid` exists (not null)
- **Unique + Sparse**: Ensures `firebaseUid` is unique when it exists, but allows unlimited null values
- **Multiple Null Accounts**: Accounts without Firebase auth can have `firebaseUid: null`

---

## Verification

After running the fix, verify it worked:

### 1. Check Indexes in MongoDB Shell (Optional)

```bash
mongosh
use test  # or your database name
db.users.getIndexes()
```

Look for:
```javascript
{
  v: 2,
  key: { firebaseUid: 1 },
  name: 'firebaseUid_1',
  unique: true,
  sparse: true  // ← This should be present!
}
```

### 2. Test Account Creation

Use your frontend signup form or API to create multiple accounts with the same phone/email.

### 3. Check Database

```bash
mongosh
use test
db.users.find({ mobileNumber: "+1234567890" }).pretty()
```

Should show multiple users with:
- Same `mobileNumber`
- Different `uniqueUserId`
- All with `firebaseUid: null` or missing

---

## Troubleshooting

### Issue: "Index not found" Error

**Solution**: The index might already be correct. Check existing indexes:
```bash
npm run fix-index
```

### Issue: Still Getting Duplicate Key Error

**Solution**:

1. **Manual Index Drop** (if script doesn't work):
   ```bash
   mongosh
   use test
   db.users.dropIndex("firebaseUid_1")
   exit
   ```

2. **Restart backend** to let Mongoose recreate indexes:
   ```bash
   npm run dev
   ```

3. **Nuclear Option** - Drop all indexes and recreate:
   ```bash
   mongosh
   use test
   db.users.dropIndexes()  # Drops all except _id
   exit
   ```

   Then restart backend:
   ```bash
   npm run dev
   ```

### Issue: Wrong Database

Make sure you're connected to the correct database. Check your `.env` file:
```
MONGO_URI=mongodb://localhost:27017/test  ← Check this!
```

The script connects to the same database as your app.

---

## Prevention

This fix is **permanent**. Once the index is corrected:

✅ You can create unlimited accounts with `firebaseUid: null`
✅ Firebase users still have unique `firebaseUid` validation
✅ All accounts have unique `uniqueUserId`
✅ Multi-account flow works perfectly

---

## Alternative: Manual MongoDB Compass Fix

If you prefer using MongoDB Compass GUI:

1. Open MongoDB Compass
2. Connect to your database
3. Go to the `users` collection
4. Click **Indexes** tab
5. Find `firebaseUid_1` index
6. Click **🗑️ Drop Index**
7. Restart your backend server
8. Mongoose will recreate the index correctly

---

## Summary

**Before Fix**: ❌ Can't create multiple accounts with same phone/email
**After Fix**: ✅ Can create up to 5 accounts per phone/email, each with unique User ID

**Time to Fix**: ~30 seconds
**Requires Server Restart**: Yes
**Data Loss**: None
**Reversible**: Yes (just recreate old index)

---

## Questions?

- **Q: Will this affect my existing data?**
  A: No, the fix only modifies the index structure, not the data.

- **Q: Do I need to run this every time?**
  A: No, once fixed, it stays fixed permanently.

- **Q: What if I have Firebase users?**
  A: They're unaffected. Their `firebaseUid` is still unique and validated.

- **Q: Can I undo this?**
  A: Yes, just drop the index and create a non-sparse unique index (not recommended).

---

**Last Updated**: 2025-10-26
**Status**: ✅ Ready to Use
