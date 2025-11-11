# Deployment Guide

## Backend Deployment to Google Cloud Run

### Prerequisites
- Google Cloud SDK (`gcloud`) installed and configured
- Docker installed (optional - Cloud Build can build for you)
- Access to a GCP project with billing enabled

### Setup Steps

#### 1. Configure Google Cloud
```bash
# Login to gcloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  containerregistry.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

#### 2. Create Service Account Key (if needed)
```bash
# Create a service account key for Google Cloud Storage
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com

# Note: This file is git-ignored for security
```

#### 3. Configure Environment Variables
```bash
# Copy the template
cp backend/env-vars.yaml.example backend/env-vars.yaml

# Edit env-vars.yaml with your actual credentials
# DO NOT commit this file - it's git-ignored
```

#### 4. Build and Deploy

##### Option A: Using Cloud Build (Recommended)
```bash
cd backend

# Build the image
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/backend-repo/backend:latest

# Deploy to Cloud Run
gcloud run deploy backend \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/backend-repo/backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --env-vars-file=env-vars.yaml
```

##### Option B: Using Docker locally
```bash
cd backend

# Build locally
docker build -t backend:latest .

# Tag for GCR
docker tag backend:latest gcr.io/YOUR_PROJECT_ID/backend:latest

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/backend:latest

# Deploy
gcloud run deploy backend \
  --image=gcr.io/YOUR_PROJECT_ID/backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated
```

#### 5. Update Environment Variables (After Initial Deployment)
```bash
gcloud run services update backend \
  --region=us-central1 \
  --env-vars-file=backend/env-vars.yaml
```

### Security Notes

**NEVER commit these files:**
- `.env`
- `env-vars.yaml`
- `gcs-key.json`
- Any file containing credentials

These are protected by `.gitignore`.

### MongoDB Atlas Configuration

If MongoDB shows as "disconnected", you may need to:

1. Go to MongoDB Atlas Dashboard
2. Navigate to Network Access
3. Add `0.0.0.0/0` to allow Cloud Run IPs (or use Cloud NAT for specific IPs)

### Frontend Configuration

Update your frontend's environment variable:
```
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE-URL.run.app/api
```

### Monitoring

Check service health:
```bash
curl https://YOUR-SERVICE-URL.run.app/api/health
```

View logs:
```bash
gcloud run services logs read backend --region=us-central1
```

### Updating the Service

When you make code changes:

1. Build new image:
```bash
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/backend-repo/backend:latest
```

2. Cloud Run will automatically deploy the new revision

Or force a new deployment:
```bash
gcloud run deploy backend \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/backend-repo/backend:latest \
  --region=us-central1
```

### Cost Optimization

- Min instances: 0 (scales to zero when not in use)
- Max instances: 10 (adjust based on traffic)
- Memory: 512Mi (increase if needed)
- CPU: 1 (increase for heavy workloads)

Cloud Run charges only for actual usage (request time + idle time).

### Troubleshooting

1. **Service won't start:**
   - Check logs: `gcloud run services logs read backend`
   - Verify environment variables are set correctly

2. **MongoDB connection fails:**
   - Check MongoDB Atlas network access settings
   - Verify MONGO_URI is correct

3. **Image build fails:**
   - Ensure `package-lock.json` is in sync: `npm install`
   - Check Dockerfile syntax

4. **Permission errors:**
   - Ensure your account has necessary IAM roles
   - Service account needs Storage Admin role for GCS
