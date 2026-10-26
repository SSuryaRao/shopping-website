import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToGCS, getBucket } from './storage';

// Multer config shared by all image upload routes (kept in memory, then saved to GCS or disk)
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // status 400 so the error handler reports it as a bad request, not a server error
      cb(Object.assign(new Error('Only JPEG, PNG, and WebP images are allowed'), { status: 400 }));
    }
  },
});

// Public uploads are served by express.static at /uploads
const uploadsDir = path.join(__dirname, '../../uploads');
// Private uploads (payment screenshots) are NOT served statically - only via admin routes
const privateUploadsDir = path.join(__dirname, '../../private-uploads');

for (const dir of [uploadsDir, privateUploadsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const generateFileName = (file: Express.Multer.File): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2)}.${file.originalname.split('.').pop()}`;

// Helper function to upload file to local storage
const uploadToLocalStorage = async (file: Express.Multer.File, fileName: string): Promise<string> => {
  const filePath = path.join(uploadsDir, fileName);

  await fs.promises.writeFile(filePath, file.buffer);

  // Return URL relative to the server
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${fileName}`;
};

// Upload a public image (products, rewards) to Google Cloud Storage with local fallback
export const uploadToCloudStorage = async (
  file: Express.Multer.File,
  fileName: string,
  folder: string = 'products'
): Promise<string> => {
  const bucket = getBucket();

  // Try Google Cloud Storage first
  if (bucket) {
    try {
      const publicUrl = await uploadToGCS(file.buffer, fileName, file.mimetype, folder);
      console.log(`✅ Uploaded to GCS: ${fileName}`);
      return publicUrl;
    } catch (error) {
      console.warn('Google Cloud Storage upload failed, falling back to local storage:', error);
      return uploadToLocalStorage(file, fileName);
    }
  } else {
    console.log('Google Cloud Storage not configured, using local storage');
    return uploadToLocalStorage(file, fileName);
  }
};

/**
 * Save a private file (e.g. payment screenshot). Returns a storage key, not a URL.
 * Keys look like "gcs:payment-screenshots/abc.png" or "local:abc.png".
 */
export const savePrivateFile = async (file: Express.Multer.File, folder: string): Promise<string> => {
  const fileName = generateFileName(file);
  const bucket = getBucket();

  if (bucket) {
    try {
      const filePath = `${folder}/${fileName}`;
      await bucket.file(filePath).save(file.buffer, { contentType: file.mimetype });
      return `gcs:${filePath}`;
    } catch (error) {
      console.warn('Private GCS upload failed, falling back to local storage:', error);
    }
  }

  await fs.promises.writeFile(path.join(privateUploadsDir, fileName), file.buffer);
  return `local:${fileName}`;
};

const contentTypeFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

// Read a private file saved with savePrivateFile
export const readPrivateFile = async (key: string): Promise<{ buffer: Buffer; contentType: string } | null> => {
  if (key.startsWith('gcs:')) {
    const bucket = getBucket();
    if (!bucket) return null;
    const filePath = key.slice(4);
    const [buffer] = await bucket.file(filePath).download();
    return { buffer, contentType: contentTypeFromName(filePath) };
  }

  if (key.startsWith('local:')) {
    // basename() prevents path traversal out of the private uploads folder
    const fileName = path.basename(key.slice(6));
    const filePath = path.join(privateUploadsDir, fileName);
    if (!fs.existsSync(filePath)) return null;
    return { buffer: await fs.promises.readFile(filePath), contentType: contentTypeFromName(fileName) };
  }

  return null;
};
