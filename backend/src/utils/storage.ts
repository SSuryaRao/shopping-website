import { Storage } from '@google-cloud/storage';
import admin from 'firebase-admin';

let storage: Storage | null = null;

// Initialize Google Cloud Storage
export const initializeStorage = () => {
  const requiredEnvVars = ['GCS_PROJECT_ID', 'GCS_PRIVATE_KEY', 'GCS_CLIENT_EMAIL', 'GCS_BUCKET_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('⚠️  Google Cloud Storage not initialized');
    console.log('   Missing environment variables:', missingVars.join(', '));
    console.log('   Storage operations will fall back to local storage');
    return false;
  }

  try {
    const projectId = process.env.GCS_PROJECT_ID;
    const clientEmail = process.env.GCS_CLIENT_EMAIL;
    const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('GCS_PROJECT_ID, GCS_CLIENT_EMAIL, or GCS_PRIVATE_KEY is missing');
    }

    storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    console.log('✅ Google Cloud Storage initialized successfully');
    console.log(`   Bucket: ${process.env.GCS_BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Google Cloud Storage:', error instanceof Error ? error.message : error);
    return false;
  }
};

// Get Google Cloud Storage instance
export const getStorage = () => {
  return storage;
};

// Get bucket instance
export const getBucket = () => {
  if (!storage || !process.env.GCS_BUCKET_NAME) {
    return null;
  }
  return storage.bucket(process.env.GCS_BUCKET_NAME);
};

// Upload file to Google Cloud Storage
export const uploadToGCS = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'products'
): Promise<string> => {
  const bucket = getBucket();

  if (!bucket) {
    throw new Error('Google Cloud Storage is not initialized');
  }

  const filePath = `${folder}/${fileName}`;
  const file = bucket.file(filePath);

  // Upload the file
  await file.save(fileBuffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Make the file publicly accessible
  await file.makePublic();

  // Return the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  return publicUrl;
};

// Delete file from Google Cloud Storage
export const deleteFromGCS = async (fileUrl: string): Promise<boolean> => {
  const bucket = getBucket();

  if (!bucket) {
    console.warn('Google Cloud Storage is not initialized');
    return false;
  }

  try {
    // Extract the file path from the URL
    const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${bucket.name}/(.+)`);
    const match = fileUrl.match(urlPattern);

    if (!match || !match[1]) {
      console.warn('Invalid GCS URL format:', fileUrl);
      return false;
    }

    const filePath = match[1];
    await bucket.file(filePath).delete();
    console.log(`✅ Deleted file from GCS: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    return false;
  }
};

// Export Firebase Auth helper (keep for authentication)
export const getAuth = () => {
  try {
    return admin.apps.length > 0 ? admin.auth() : null;
  } catch (error) {
    console.error('Error getting Firebase Auth:', error);
    return null;
  }
};

export default { initializeStorage, getStorage, getBucket, uploadToGCS, deleteFromGCS, getAuth };
