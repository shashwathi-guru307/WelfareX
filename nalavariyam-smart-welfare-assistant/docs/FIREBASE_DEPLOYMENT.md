# Firebase Deployment Guide — Nalavariyam Smart Welfare Assistant

This guide walks you through deploying the entire application to Firebase.

## Architecture Overview

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Firebase         │     │  Firebase Cloud      │     │  Cloud SQL       │
│  Hosting          │────▶│  Function (API)      │────▶│  (PostgreSQL)    │
│  (React/Vite)     │     │  (Flask 2nd gen)     │     │                  │
│                   │     │                      │     │                  │
│  Static files     │     │  /api/** routes      │     │                  │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
                                                         
         ┌──────────────────────┐
         │  Firebase Storage    │
         │  (Case documents)    │
         └──────────────────────┘
```

**What's on Firebase:**
- **Firebase Hosting** → React frontend (static SPA)
- **Cloud Functions 2nd gen** → Flask API backend
- **Cloud SQL** → PostgreSQL database (managed)
- **Firebase Storage** → Case document uploads (persistent)

---

## Prerequisites

1. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Google Cloud account** with billing enabled

3. **Firebase project** created at [Firebase Console](https://console.firebase.google.com/)

4. **Python 3.11+** and **Node.js 18+**

---

## Step 1: Authenticate with Firebase

```bash
cd nalavariyam-smart-welfare-assistant
firebase login
```

This opens a browser for Google authentication. Grant the requested permissions.

---

## Step 2: Initialize Firebase Project

The project already has `firebase.json` and `.firebaserc` configured. Update `.firebaserc` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

Find your project ID in the [Firebase Console](https://console.firebase.google.com/) → Project Settings → General.

---

## Step 3: Enable Firebase Services

### 3a. Enable Cloud Functions

```bash
firebase experiments:enable webframeworks
```

Or enable in Firebase Console → Build → Functions.

### 3b. Enable Cloud SQL

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **SQL** → **Create Instance** → **PostgreSQL**
4. Configure:
   - Instance name: `nwsa-db`
   - Database version: PostgreSQL 15
   - Region: `asia-south1` (closest to Tamil Nadu)
   - Machine type: `db-f1-micro` (free tier) or `db-g1-small`
   - Storage: 10 GB
5. Set a strong password for the `postgres` user
6. Create a database named `nalavariyam`

### 3c. Enable Firebase Storage

```bash
firebase deploy --only storage
```

Or enable in Firebase Console → Build → Storage.

---

## Step 4: Set Up Cloud SQL Connection

### 4a. Get Your Cloud SQL Connection Name

In Google Cloud Console → SQL → Your Instance → **Connect to this instance**, copy the connection string:

```
your-project-id:asia-south1:nwsa-db
```

### 4b. Configure the Cloud Function to Connect

```bash
# Set environment variables for the Cloud Function
firebase functions:config:set \
  db.url="postgresql://postgres:YOUR_DB_PASSWORD@//cloudsql/your-project-id:asia-south1:nwsa-db/nalavariyam"
```

### 4c. Initialize the Database Schema

You can do this locally or via Cloud Shell:

```bash
# Option A: Via Cloud SQL Proxy (local development)
# Install cloud-sql-proxy: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy

# Start the proxy
cloud-sql-proxy your-project-id:asia-south1:nwsa-db

# In another terminal, apply schema
export DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/nalavariyam"
cd database
python init_db.py

# Initialize user accounts
cd ../backend
python init_users.py
```

```bash
# Option B: Via Cloud Shell (in-browser)
# Open Cloud Shell in Google Cloud Console
gcloud sql connect nalavariyam --user=postgres
# Then paste your SQL schema
```

---

## Step 5: Configure Environment Variables

Set all required environment variables:

```bash
firebase functions:config:set \
  app.secret_key="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
  app.frontend_url="https://your-project-id.web.app" \
  app.document_storage_path="/tmp/uploads/case_documents" \
  app.log_level="INFO" \
  app.admin_email="admin@yourdomain.com" \
  app.admin_password="CHANGE_ME" \
  app.staff_email="staff@yourdomain.com" \
  app.staff_password="CHANGE_ME"
```

Verify the config:

```bash
firebase functions:config:get
```

---

## Step 6: Update Frontend API URL

The frontend needs to know where the API is. In `frontend/vite.config.ts`, the dev proxy handles this. For production, the API is served from the same origin via Firebase Hosting rewrites (see `firebase.json`).

If you need a cross-origin API URL:

```bash
# Set in frontend/.env.production
echo "VITE_API_URL=https://your-project-id.web.app/api" > frontend/.env.production
```

---

## Step 7: Build and Deploy

### Deploy Everything

```bash
# Build the frontend
cd frontend
npm install
npm run build
cd ..

# Deploy to Firebase
firebase deploy
```

### Deploy Individual Components

```bash
# Deploy only the frontend (hosting)
firebase deploy --only hosting

# Deploy only the backend (functions)
firebase deploy --only functions

# Deploy only storage rules
firebase deploy --only storage
```

---

## Step 8: Verify the Deployment

1. **Open your app:**
   ```
   https://your-project-id.web.app
   ```

2. **Test the health endpoint:**
   ```
   https://your-project-id.web.app/api/health
   ```

3. **Log in** with the credentials you configured

4. **Test all modules** (workers, cases, schemes, etc.)

5. **Test document upload** — files are stored in Firebase Storage

---

## Architecture Details

### How the API Routing Works

Firebase Hosting rewrites route `/api/**` requests to the Cloud Function:

```json
{
  "source": "/api/**",
  "function": {
    "functionId": "api"
  }
}
```

The Cloud Function is your Flask app (`backend/main.py` → `create_app()`). The function name matches the Flask blueprint prefix, so all routes work transparently.

### Cloud Function Configuration

| Setting | Value | Why |
|---------|-------|-----|
| Runtime | Python 3.11 | Flask 3.1 compatible |
| Memory | 512 MB | Adequate for API workloads |
| Timeout | 120s | Matches your Gunicorn config |
| Max Instances | 10 | Prevents runaway scaling |
| Min Instances | 0 | Saves cost (cold starts ~2-5s) |
| Ingress | ALLOW_ALL_TRAFFIC | Firebase Hosting routes to it |

### File Storage

**Development:** Local filesystem (`/tmp/uploads/case_documents`)
**Production:** Firebase Storage (persistent, scalable)

The current implementation uses `/tmp` which is ephemeral in Cloud Functions. For production, files should be uploaded to Firebase Storage. The `storage.rules` file is already configured for authenticated access.

> **Note:** For persistent file storage in production, you'll need to modify the document upload route to use Firebase Admin SDK or Cloud Storage client library. The current `/tmp` storage is suitable for development and testing.

---

## Cost Estimate

Firebase has a generous free tier (Spark plan):

| Service | Free Tier | Estimated Cost (100 users) |
|---------|-----------|---------------------------|
| **Hosting** | 10 GB storage, 360 MB/day transfer | Free |
| **Cloud Functions** | 2M invocations/month, 400K GB-sec | Free |
| **Cloud SQL** | No free tier (always charges) | ~$7-15/month (db-f1-micro) |
| **Firebase Storage** | 5 GB, 1 GB/day download | Free |

**Total estimated monthly cost: $7-15** (mostly Cloud SQL).

---

## Troubleshooting

### Cloud Function Won't Start

```bash
# Check function logs
firebase functions:log --only api

# Common issues:
# 1. Missing environment variables → firebase functions:config:set ...
# 2. Import errors → check requirements.txt
# 3. Database connection failed → check Cloud SQL config
```

### Database Connection Refused

```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe nwsa-db

# Check the connection name is correct
firebase functions:config:get

# The DATABASE_URL should use the Unix socket format:
# postgresql://user:password@//cloudsql/PROJECT:REGION:INSTANCE/dbname
```

### CORS Errors

If the frontend can't reach the API:

1. Check `FRONTEND_URL` is set correctly
2. Verify the Firebase Hosting rewrite rules
3. Ensure the Cloud Function is deployed and healthy

### Cold Start Delays

First request after idle may take 2-5 seconds. To mitigate:

```bash
# Set minimum instances (costs more but eliminates cold starts)
firebase functions:config:set api.min_instances=1
```

---

## Rollback

If something goes wrong:

```bash
# List previous function versions
firebase functions:list

# Rollback to a previous version
firebase functions:rollback api

# Or redeploy the previous hosting version
firebase hosting:rollback
```

---

## Security Checklist

- [ ] `SECRET_KEY` is a strong random value (not the default)
- [ ] Database password is strong and unique
- [ ] `ADMIN_PASSWORD` and `STAFF_PASSWORD` are changed from defaults
- [ ] `FLASK_DEBUG=0` in production
- [ ] Firebase Security Rules are deployed (`storage.rules`)
- [ ] HTTPS is enabled (automatic on Firebase Hosting)
- [ ] `.env` files are NOT in version control
- [ ] Cloud SQL has authorized networks configured (or uses Cloud SQL Auth Proxy)
