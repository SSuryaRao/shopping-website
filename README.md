# Shopping Website - Full Stack Project

A modern e-commerce platform built with Next.js frontend and Node.js backend, featuring Firebase authentication, points system, and admin management.

## 🚀 Tech Stack

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **Firebase Authentication** (Email/Password & Google)
- **Firebase Storage** for images
- Mobile-first responsive design

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **Firebase Admin SDK**
- RESTful API design

## 📁 Project Structure

```
Shopping_Website/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   ├── lib/       # Utilities & Firebase config
│   │   └── types/     # TypeScript types
│   └── public/        # Static assets
│
├── backend/           # Express server
│   ├── src/
│   │   ├── models/    # MongoDB models
│   │   ├── routes/    # API routes
│   │   ├── middleware/# Authentication & validation
│   │   └── utils/     # Helper functions
│   └── uploads/       # File uploads
│
└── README.md
```

## 🔧 Setup Instructions

### Prerequisites
1. Node.js 18+ and npm
2. MongoDB (local or MongoDB Atlas)
3. Firebase project with Authentication and Storage enabled

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd Shopping_Website
```

### 2. Firebase Configuration
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google)
3. Enable Storage
4. Generate service account key for admin SDK
5. Copy configuration values to environment files

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your actual values
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your actual values
npm run dev
```

### 5. Database Setup
- The backend will automatically create MongoDB collections on first run
- No manual database setup required

### 6. Admin User Setup
- Create a user account through the frontend
- Manually set `isAdmin: true` in MongoDB for your user document
- Or modify the User model default value temporarily

## 🌟 Features

- **User Authentication**: Firebase Auth with email/password and Google sign-in
- **Product Catalog**: Browse products with images, prices, and points
- **Points System**: Earn points on purchases, redeem for discounts
- **User Dashboard**: View points balance and order history
- **Admin Panel**: Manage products, set prices and points
- **Mobile-First**: Responsive design optimized for mobile users
- **Secure API**: Protected routes with Firebase token validation

## 🚀 Deployment

### Frontend Deployment (Vercel)
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### Backend Deployment (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Configure environment variables
6. Deploy

### Database Setup (MongoDB Atlas)
1. Create a MongoDB Atlas cluster
2. Create a database user
3. Get connection string
4. Add to backend environment variables

### Production Considerations
- Use environment-specific Firebase projects
- Configure CORS for production domains
- Set up proper logging and monitoring
- Enable rate limiting and security headers

## 🔐 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

## 📱 Pages

- **Home**: Product catalog with search and filters
- **Product**: Detailed product view with purchase option
- **Login/Signup**: Authentication pages
- **Dashboard**: User profile, points, and orders
- **Admin**: Product management and analytics