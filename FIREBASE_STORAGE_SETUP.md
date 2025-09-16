# Firebase Storage Setup Guide

This guide explains how to fix the Firebase Storage bucket error and configure proper image uploads for products.

## Problem

You're getting this error when creating products:
```
"The specified bucket does not exist."
```

This happens because the Firebase Storage bucket `shopping-website-fdda2.appspot.com` either doesn't exist or isn't properly configured.

## Solution Options

### Option 1: Fix Firebase Storage Bucket (Recommended)

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `shopping-website-fdda2` (or your project name)
3. **Enable Storage**:
   - Navigate to "Storage" in the sidebar
   - Click "Get Started"
   - Choose "Start in production mode" or "Start in test mode"
   - Select your storage location (choose closest to your users)

4. **Configure Storage Rules** (for development):
   ```javascript
   // Allow read/write access for all users (DEVELOPMENT ONLY)
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```

5. **Get your bucket name**:
   - In Storage tab, you'll see your bucket name
   - Usually: `your-project-id.appspot.com`

6. **Update your `.env` file**:
   ```bash
   FIREBASE_STORAGE_BUCKET=your-actual-bucket-name.appspot.com
   ```

### Option 2: Use Local File Storage (Current Fallback)

The system now automatically falls back to local storage if Firebase Storage fails:

1. **Files are stored in**: `backend/uploads/`
2. **Accessible via**: `http://localhost:5000/uploads/filename`
3. **No additional setup needed**

## Configuration Steps

### 1. Update Backend Environment Variables

In your `backend/.env` file:

```bash
# Firebase Storage Configuration
FIREBASE_STORAGE_BUCKET=shopping-website-fdda2.appspot.com
# or whatever your actual bucket name is

# Base URL for local fallback
BASE_URL=http://localhost:5000
```

### 2. Test the Configuration

1. **Start the backend**: `cd backend && npm run dev`
2. **Check console logs** for storage initialization
3. **Try creating a product** with an image
4. **Check if image uploads successfully**

## Verification

### Success Indicators:
- ✅ **Firebase Storage**: Images uploaded to `https://storage.googleapis.com/your-bucket/products/filename`
- ✅ **Local Storage**: Images uploaded to `http://localhost:5000/uploads/filename`
- ✅ **Product creation works** without 500 errors

### Console Logs to Look For:
```bash
# Success
✅ Firebase Admin SDK initialized successfully
✅ Image uploaded to Firebase Storage: https://storage.googleapis.com/...

# Fallback (still works)
⚠️  Firebase Storage not available, using local storage
✅ Image uploaded to local storage: http://localhost:5000/uploads/...
```

## Troubleshooting

### Issue: "Firebase Storage not configured"
**Solution**: Add `FIREBASE_STORAGE_BUCKET` to your `.env` file

### Issue: "Permission denied"
**Solution**: Update Firebase Storage rules (see Option 1, step 4)

### Issue: "Bucket still doesn't exist"
**Solution**:
1. Double-check bucket name in Firebase Console
2. Ensure Storage is enabled in Firebase Console
3. Verify `.env` file is loaded correctly

### Issue: Images not displaying
**Solution**:
- **Firebase Storage**: Check if files are public (Firebase Console > Storage > File > Make public)
- **Local Storage**: Verify `http://localhost:5000/uploads/filename` is accessible

## Current Behavior

The system now handles storage gracefully:

1. **Try Firebase Storage first** (if configured)
2. **Fall back to local storage** if Firebase fails
3. **Return appropriate URLs** for both storage types
4. **Log warnings** for debugging

This means **product creation will work** regardless of Firebase Storage configuration!

## Production Deployment

For production:

1. **Use Firebase Storage** (recommended for scalability)
2. **Configure proper CORS** if serving from different domain
3. **Set up CDN** for better performance
4. **Use production storage rules**:
   ```javascript
   // Production rules (authenticated users only)
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /products/{allPaths=**} {
         allow read: if true;  // Anyone can read
         allow write: if request.auth != null;  // Only authenticated users can write
       }
     }
   }
   ```

The product creation should now work with either Firebase Storage or local storage fallback!