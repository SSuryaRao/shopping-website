import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import Product from '../models/Product';
import { getStorage } from '../utils/firebase';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to upload file to Firebase Storage with local fallback
const uploadToFirebaseStorage = async (file: Express.Multer.File, fileName: string): Promise<string> => {
  const storage = getStorage();

  // Try Firebase Storage first
  if (storage && process.env.FIREBASE_STORAGE_BUCKET) {
    try {
      const bucket = storage.bucket();
      const firebaseFile = bucket.file(`products/${fileName}`);

      const stream = firebaseFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.warn('Firebase Storage upload failed, falling back to local storage:', error.message);
          // Fallback to local storage
          uploadToLocalStorage(file, fileName)
            .then(resolve)
            .catch(reject);
        });
        stream.on('finish', async () => {
          try {
            await firebaseFile.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/products/${fileName}`;
            resolve(publicUrl);
          } catch (error) {
            console.warn('Firebase Storage make public failed, falling back to local storage:', error);
            // Fallback to local storage
            uploadToLocalStorage(file, fileName)
              .then(resolve)
              .catch(reject);
          }
        });
        stream.end(file.buffer);
      });
    } catch (error) {
      console.warn('Firebase Storage not available, using local storage:', error);
      return uploadToLocalStorage(file, fileName);
    }
  } else {
    console.log('Firebase Storage not configured, using local storage');
    return uploadToLocalStorage(file, fileName);
  }
};

// Helper function to upload file to local storage
const uploadToLocalStorage = async (file: Express.Multer.File, fileName: string): Promise<string> => {
  const filePath = path.join(uploadsDir, fileName);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, file.buffer, (error) => {
      if (error) {
        reject(error);
      } else {
        // Return URL relative to the server
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const publicUrl = `${baseUrl}/uploads/${fileName}`;
        resolve(publicUrl);
      }
    });
  });
};

// Get all products (admin)
router.get('/products', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 100, page = 1, search } = req.query;

    let query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const limitNum = Math.min(parseInt(limit as string), 100);
    const pageNum = Math.max(parseInt(page as string), 1);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    const totalProducts = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalProducts,
        pages: Math.ceil(totalProducts / limitNum),
      },
    });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Create product
router.post('/products', authenticateToken, requireAdmin, upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, price, points, stock, category, isActive } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (!name || !description || !price || !points || !stock || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Product image is required',
      });
    }

    // Upload image to Firebase Storage (with local fallback)
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${imageFile.originalname.split('.').pop()}`;
    let imageURL;
    try {
      imageURL = await uploadToFirebaseStorage(imageFile, fileName);
    } catch (uploadError) {
      console.error('Image upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image. Please try again.',
      });
    }

    // Create product
    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      points: parseInt(points),
      imageURL,
      stock: parseInt(stock),
      category: category.trim().toLowerCase(),
      isActive: isActive === 'true' || isActive === true,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Update product
router.put('/products/:id', authenticateToken, requireAdmin, upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, price, points, stock, category, isActive } = req.body;
    const imageFile = req.file;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Update fields if provided
    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (points !== undefined) product.points = parseInt(points);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (category !== undefined) product.category = category.trim().toLowerCase();
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;

    // Update image if new one provided
    if (imageFile) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${imageFile.originalname.split('.').pop()}`;
      try {
        const imageURL = await uploadToFirebaseStorage(imageFile, fileName);
        product.imageURL = imageURL;
      } catch (uploadError) {
        console.error('Image upload failed during product update:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new image. Please try again.',
        });
      }
    }

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Delete product
router.delete('/products/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Instead of hard delete, mark as inactive
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;