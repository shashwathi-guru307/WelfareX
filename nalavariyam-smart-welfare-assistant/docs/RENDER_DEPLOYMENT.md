# Render Deployment Guide — Nalavariyam Smart Welfare Assistant

Deploy the **full stack** (Frontend + Backend + Database) on Render.

## Architecture

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Render Static Site  │────▶│  Render Web Service  │────▶│  Render PostgreSQL│
│  (React + Vite)      │     │  (Flask + Gunicorn)  │     │  (Free tier)     │
│                      │     │                      │     │                  │
│  nwsa-frontend       │     │  nwsa-backend        │     │  nwsa-database   │
│  .onrender.com       │     │  .onrender.com       │     │                  │
└──────────────────────┘     └──────────────────────┘     └──────────────────┘
         │                            │
         └──── /api/** proxy ─────────┘
```

**What's deployed:**
- **Frontend** → React SPA (static files, free)
- **Backend** → Flask API on Gunicorn (free tier: spins down after 15 min idle)
- **Database** → PostgreSQL (free tier: 90 days, then $7/month)

---

## Prerequisites

1. A [Render account](https://render.com/) (free tier works)
2. Your code pushed to a **GitHub repository**

---

## Step 1: Push Code to GitHub

If you haven't already:

```bash
cd nalavariyam-smart-welfare-assistant
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/nalavariyam-smart-welfare-assistant.git
git push -u origin main
```

---

## Step 2: Create PostgreSQL Database

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   - **Name:** `nwsa-database`
   - **Database:** `nalavariyam`
   - **Region:** `Singapore (Singapore)` or `Mumbai (India)` — closest to Tamil Nadu
   - **Plan:** Free (or Starter for production)
4. Click **"Create Database"**
5. Wait for it to become **Available** (green status)
6. Copy the **Internal Database URL** — you'll need it for the backend

---

## Step 3: Initialize Database Schema

Once the database is created:

### Option A: Render Shell (Recommended)
1. Go to your `nwsa-database` service → **Shell** tab
2. Run the schema:
   ```bash
   # The shell connects to psql directly
   # Copy-paste the contents of database/schema/schema_pg.sql
   ```

### Option B: Connect Locally
1. Get the **External Database URL** from Render dashboard
2. Run locally:
   ```bash
   export DATABASE_URL="postgresql://nwsa_database_XXXXX:YOUR_PASSWORD@YOUR_HOST:5432/nalavariyam"
   cd database
   python init_pg.py --seed
   ```

### Option C: Render Cron Job (Automated)
You can also create a one-off cron job to run `init_pg.py --seed` (see Step 5).

---

## Step 4: Create Backend Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your **GitHub repository**
3. Fill in:
   - **Name:** `nwsa-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```
     gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
     ```
   - **Plan:** Free

4. Add **Environment Variables** (click "Advanced" → "Add Environment Variable"):

   | Key | Value |
   |-----|-------|
   | `PYTHON_VERSION` | `3.11` |
   | `SECRET_KEY` | *(click "Generate" for a random value)* |
   | `FLASK_DEBUG` | `0` |
   | `LOG_LEVEL` | `INFO` |
   | `FRONTEND_URL` | `https://nwsa-frontend.onrender.com` *(update after frontend is deployed)* |
   | `DATABASE_URL` | *(paste the Internal Database URL from Step 2)* |
   | `DOCUMENT_STORAGE_PATH` | `/tmp/uploads/case_documents` |

5. Click **"Create Web Service"**
6. Wait for the build to succeed — check the **Logs** tab

---

## Step 5: Create Frontend Static Site

1. Click **"New +"** → **"Static Site"**
2. Connect your **GitHub repository**
3. Fill in:
   - **Name:** `nwsa-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:**
     ```
     npm install && npm run build
     ```
   - **Publish Directory:** `dist`
   - **Plan:** Free

4. Add **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `/api` |

5. Add **Rewrites** (Routes) — under "Rewrites and Redirects":
   - **Source:** `/api/**`
   - **Destination:** `https://nwsa-backend.onrender.com/api/**`
   - **Type:** `Rewrite`

6. Click **"Create Static Site"**
7. Wait for build — your site will be live at `https://nwsa-frontend.onrender.com`

---

## Step 6: Update Backend CORS

After the frontend is deployed, update the backend:

1. Go to `nwsa-backend` service → **Environment** tab
2. Update `FRONTEND_URL` to your actual frontend URL:
   ```
   https://nwsa-frontend.onrender.com
   ```
3. The service will auto-redeploy

---

## Step 7: Initialize User Accounts

The database has schema + scheme seed data, but you need admin/staff users:

1. Go to `nwsa-backend` → **Shell** tab (or use Render Shell)
2. Run:
   ```bash
   cd /opt/render/project/src
   python init_users.py
   ```
   
   Or add this as a **Start Command** override temporarily:
   ```
   python init_users.py && gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
   ```

**Default credentials** (change in `init_users.py` before deploying):
- Admin: `admin` / `admin123`
- Staff: `staff` / `staff123`

---

## Step 8: Verify Everything

1. **Frontend:** Open `https://nwsa-frontend.onrender.com`
2. **Backend health check:** Open `https://nwsa-backend.onrender.com/api/health`
3. **Login:** Use the default credentials
4. **Test all features:** Workers, cases, schemes, etc.

---

## Environment Variables Reference

| Variable | Where | Value |
|----------|-------|-------|
| `SECRET_KEY` | Backend | Random hex string (auto-generate) |
| `DATABASE_URL` | Backend | Render PostgreSQL Internal URL |
| `FRONTEND_URL` | Backend | `https://nwsa-frontend.onrender.com` |
| `FLASK_DEBUG` | Backend | `0` |
| `LOG_LEVEL` | Backend | `INFO` |
| `VITE_API_URL` | Frontend | `/api` |

---

## Important Notes

### Free Tier Limitations
- **Web Services:** Spin down after 15 min of inactivity (first request takes ~30s to wake up)
- **Database:** Free PostgreSQL expires after **90 days** — upgrade to Starter ($7/mo) for production
- **Static Sites:** No spin-down issue — always available

### First Request Delay
The backend sleeps after 15 min idle. The first request will take 20-30 seconds. Subsequent requests are fast.

To keep it always awake (costs ~$7/month):
- Upgrade to **Starter** plan, or
- Use a cron ping service like [UptimeRobot](https://uptimerobot.com/) to ping `/api/health` every 5 minutes

### File Uploads
Files uploaded to `/tmp/uploads/case_documents` are **ephemeral** — they disappear when the service restarts. For persistent storage, consider:
- **Cloudinary** (free tier: 25 GB)
- **AWS S3** 
- **Firebase Storage**

---

## Troubleshooting

### Build Fails
- Check the **Logs** tab for errors
- Make sure `requirements.txt` and `package.json` are correct
- Verify Python version is set to `3.11`

### Database Connection Refused
- Verify `DATABASE_URL` uses the **Internal** URL (not External)
- Check the database is **Available** (green status)
- Ensure `DATABASE_URL` starts with `postgresql://`

### CORS Errors
- Make sure `FRONTEND_URL` matches your exact frontend URL (including `https://`)
- Check the frontend proxy rewrite is set to `/api/**` → backend URL

### 502 Bad Gateway
- Backend may still be starting — wait 30 seconds
- Check logs for Python errors
- Verify `gunicorn server:app` is the correct start command

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Frontend (Static Site) | Free | **$0** |
| Backend (Web Service) | Free | **$0** (spins down when idle) |
| Database (PostgreSQL) | Free | **$0** (first 90 days) |
| **Total** | | **$0** |

After 90 days, database upgrades to Starter: **$7/month** total.

---

## Alternative: One-Click Deploy

If you have the `render.yaml` file, you can use Render Blueprints:

1. Go to [Render Blueprints](https://dashboard.render.com/blueprints)
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repo
4. Render will create all 3 services automatically
5. You still need to manually run the database schema initialization

---

## Switching from Firebase to Render

If you were previously on Firebase:

1. Export any data from Firebase Firestore/Realtime DB
2. Deploy on Render following this guide
3. Update `FRONTEND_URL` in backend env vars
4. Remove Firebase dependencies (optional — keep `firebase.json` for reference)
5. Update any hardcoded Firebase URLs in the codebase
