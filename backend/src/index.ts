import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';

import authRoutes from './routes/auth';
import authNewRoutes from './routes/authNew'; // New Firebase-first auth
import productRoutes from './routes/products';
import userRoutes from './routes/user';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import inviteRoutes from './routes/invite';
import mlmRoutes from './routes/mlm';
import { initializeStorage } from './utils/storage';

console.log('🚀 Starting server...');

// Initialize Firebase after environment variables are loaded
const initializeFirebase = () => {
  const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('⚠️  Firebase Admin SDK not initialized');
    console.log('   Missing environment variables:', missingVars.join(', '));
    console.log('   Firebase authentication features will be disabled');
    return false;
  }

  try {
    // Import Firebase initialization only after env vars are loaded
    const admin = require('firebase-admin');

    if (!admin.apps.length) {
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
      };

      const appConfig: any = {
        credential: admin.credential.cert(serviceAccount),
      };

      if (process.env.FIREBASE_STORAGE_BUCKET) {
        appConfig.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
      }

      admin.initializeApp(appConfig);
    }

    console.log('✅ Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error instanceof Error ? error.message : error);
    return false;
  }
};

const firebaseInitialized = initializeFirebase();

// Initialize Google Cloud Storage
const storageInitialized = initializeStorage();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - required for Cloud Run and other reverse proxies
app.set('trust proxy', true);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://shopping-website-frontend-one.vercel.app'
  ],
  credentials: true,
}));

// Rate limiting with proper key generator for Cloud Run
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Validate that we're intentionally using trust proxy
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// MongoDB connection with fallback
const connectToMongoDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  const fallbackURI = 'mongodb://localhost:27017/mydb';

  if (mongoURI) {
    console.log('🔌 Connecting to MongoDB Atlas...');
    try {
      await mongoose.connect(mongoURI);
      console.log('✅ Connected to MongoDB Atlas');
      return;
    } catch (error) {
      console.error('❌ MongoDB Atlas connection failed:', error instanceof Error ? error.message : error);
      console.log('🔄 Attempting fallback to local MongoDB...');
    }
  } else {
    console.log('ℹ️  No MONGO_URI found, using local MongoDB...');
  }

  try {
    await mongoose.connect(fallbackURI);
    console.log('✅ Connected to local MongoDB');
  } catch (error) {
    console.error('❌ Local MongoDB connection failed:', error instanceof Error ? error.message : error);
    console.error('💡 Make sure MongoDB is running locally or provide a valid MONGO_URI');
    process.exit(1);
  }
};

connectToMongoDB();

// Routes
app.use('/api/auth', authRoutes); // Legacy auth routes (will be deprecated)
app.use('/api/v2/auth', authNewRoutes); // New Firebase-first auth routes
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', inviteRoutes);
app.use('/api/mlm', mlmRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      firebase: firebaseInitialized ? 'initialized' : 'not initialized',
      storage: storageInitialized ? 'initialized' : 'not initialized',
    },
  });
});

// Error handling middleware
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Server Error:', error);

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry found',
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors,
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.listen(PORT, () => {
  console.log('🎉 Server started successfully!');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});