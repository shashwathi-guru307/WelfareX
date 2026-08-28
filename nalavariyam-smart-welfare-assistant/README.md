# Nalavariyam Smart Welfare Assistant

**Tamil Nadu Unorganised Workers Welfare Board — Case Management System**

A private administrative application for managing welfare scheme eligibility, case processing, and worker benefit applications. Built for authorized staff use only.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   React/Vite    │────▶│   Flask API          │────▶│  PostgreSQL      │
│   Frontend      │     │   (Gunicorn)         │     │  (Production)    │
│                 │     │                      │     │                  │
│   Port 5173     │     │   Port 5000          │     │  OR              │
│   (dev)         │     │   (dev/prod)         │     │  SQLite          │
└─────────────────┘     └─────────────────────┘     │  (Development)   │
                                                     └──────────────────┘
```

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Flask 3.1, Python 3.10+
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Auth**: Werkzeug password hashing, HTTP-only session cookies
- **Production WSGI**: Gunicorn

## Features

| Module | Description |
|--------|-------------|
| Dashboard | Statistics overview with case management integration |
| Applicants | Worker management with Tamil Nadu district/taluk/village selection |
| Welfare Schemes | Scheme database with benefits, qualifications, and eligibility rules |
| Eligibility Analysis | Multi-factor eligibility engine for workers and family members |
| Case Management | Full case lifecycle: create → verify → complete |
| Renewal Intelligence | Registration renewal tracking and alerts |
| Reminders | Follow-up task management |
| Notifications | System alerts and notifications |
| Reports | Statistics, CSV export, and PDF reports |
| Settings | System configuration (admin-protected) |

## Authentication

- Two authorized accounts: **Admin** and **Staff**
- No public registration
- No Google/social authentication
- Passwords stored as secure hashes (pbkdf2:sha256)
- Rate limiting on login attempts (5 attempts / 15 min)
- HTTP-only session cookies

---

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd nalavariyam-smart-welfare-assistant

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# Create .env from template
cp .env.example .env
# Edit .env with your settings

# Initialize the database (creates tables + sample data)
cd database
python init_db.py

# Initialize the two user accounts
cd ../backend
python init_users.py
```

### Start Development Servers

```bash
# Terminal 1: Backend
cd backend
PORT=5000 python server.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

Or use the automated launcher:

```bash
python .freebuff/launch_servers.py
```

### Authorized User Accounts

| Account | Email / Username | Role |
|---------|-----------------|------|
| Admin | (configured in .env or database) | ADMIN |
| Staff | (configured in .env or database) | STAFF |

**Credentials are managed via environment variables or the database. Never commit passwords to source control.**

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | random | Flask secret key for sessions |
| `PORT` | No | 5000 | Backend server port |
| `FLASK_DEBUG` | No | 0 | Set to 1 for development |
| `DATABASE_URL` | Production | — | PostgreSQL connection string |
| `DATABASE_PATH` | Dev | `../database/nalavariyam.db` | SQLite file path |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS allowed origin |
| `DOCUMENT_STORAGE_PATH` | No | `../uploads/case_documents` | Document upload directory |
| `VITE_API_URL` | No | `/api` | Frontend API base URL |

---

## Database

### Development (SQLite)

SQLite is used by default — no configuration needed.

```bash
# View the database
sqlite3 database/nalavariyam.db ".tables"

# Re-initialize (WARNING: destroys existing data)
cd database
python init_db.py --reset
```

### Production (PostgreSQL)

```bash
# 1. Create the PostgreSQL database
createdb nalavariyam

# 2. Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@host:5432/nalavariyam

# 3. Apply schema
psql $DATABASE_URL -f database/schema/schema.sql

# 4. Apply migrations
for f in database/schema/migration_*.sql; do
    psql $DATABASE_URL -f "$f"
done

# 5. Import existing data from SQLite
cd backend
python scripts/db_export.py
python scripts/db_import.py --apply-schema
```

### Backup & Restore

```bash
cd backend

# SQLite backup
python scripts/db_backup.py backup --sqlite

# PostgreSQL backup
python scripts/db_backup.py backup --pg

# List backups
python scripts/db_backup.py list

# Restore
python scripts/db_backup.py restore --sqlite --file <backup.db>
python scripts/db_backup.py restore --pg --file <backup.sql>
```

---

## Production Deployment

### Step-by-Step

1. **Create production database** (PostgreSQL)
2. **Set environment variables** on your hosting platform
3. **Run database migrations** against PostgreSQL
4. **Import existing data** if migrating from development
5. **Initialize user accounts**: `python init_users.py`
6. **Deploy backend** with Gunicorn (see Procfile)
7. **Deploy frontend** (Vercel/Netlify/etc.) with `VITE_API_URL` pointing to backend
8. **Configure CORS**: Set `FRONTEND_URL` to your frontend domain
9. **Enable HTTPS** (usually automatic on modern platforms)
10. **Change default passwords** via Settings > Change Password
11. **Test**: Login, check all modules, verify data persists

### Deployment Platforms

| Component | Recommended | Alternative |
|-----------|-------------|-------------|
| Frontend | Vercel | Netlify, Cloudflare Pages |
| Backend | Render | Railway, Fly.io, VPS |
| Database | Render PostgreSQL | Supabase, Neon, Railway |
| File Storage | Persistent disk / S3 | Cloud storage |

### Example: Render Deployment

```bash
# Backend service
# Build: pip install -r requirements.txt
# Start: gunicorn server:app --bind 0.0.0.0:$PORT

# Frontend service
# Build: npm install && npm run build
# Output: dist/
```

---

## API Endpoints

All endpoints require authentication except `/api/health` and `/api/auth/login`.

| Category | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard/stats` |
| Workers | `GET/POST /api/workers`, `GET/PUT/DELETE /api/workers/:id` |
| Family | `GET/POST /api/workers/:id/family`, `GET/PUT/DELETE /api/family/:id` |
| Schemes | `GET/POST /api/schemes`, `GET /api/schemes/:id/benefits` |
| Eligibility | `POST /api/eligibility/evaluate`, `GET /api/eligibility/analyze/:id` |
| Cases | `GET/POST /api/cases`, `GET/PUT /api/cases/:id` |
| Documents | `POST /api/cases/:id/documents/upload`, `GET /api/cases/:id/documents/:id/file` |
| Tasks | `GET/POST /api/cases/:id/tasks`, `PUT /api/tasks/:id` |
| Notes | `GET/POST /api/cases/:id/notes` |
| Alerts | `GET /api/alerts`, `POST /api/alerts/generate` |
| Reminders | `GET/POST /api/reminders`, `PUT /api/reminders/:id` |
| Reports | `GET /api/reports/statistics`, `GET /api/reports/export/:type` |
| Settings | `GET/PUT /api/settings`, `GET /api/system/stats` |
| Health | `GET /api/health` |

---

## Security

- ✅ No public registration
- ✅ Passwords hashed (pbkdf2:sha256, 1M iterations)
- ✅ Backend API protection (all `/api/*` routes)
- ✅ Frontend route protection (ProtectedRoute)
- ✅ HTTP-only session cookies
- ✅ Login rate limiting (5 attempts / 15 min)
- ✅ Document access requires authentication
- ✅ File upload validation (type + size)
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ No secrets in source code
- ✅ `.env` excluded from Git
- ✅ `DEBUG=False` in production
- ✅ robots.txt prevents indexing

---

## Project Structure

```
nalavariyam-smart-welfare-assistant/
├── backend/
│   ├── app/
│   │   ├── routes/          # API route blueprints
│   │   ├── services/        # Business logic
│   │   └── database.py      # Database abstraction
│   ├── scripts/             # Migration, backup, export scripts
│   ├── server.py            # Flask app entry point
│   ├── init_users.py        # User initialization
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/              # Static assets (robots.txt, etc.)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks (useAuth, useApi)
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── vite.config.ts
│   └── package.json
├── database/
│   ├── schema/              # SQL schema and migrations
│   ├── seed/                # Seed data
│   ├── nalavariyam.db       # SQLite database (dev)
│   └── init_db.py           # Database initialization
├── .env.example
├── .gitignore
├── Procfile                 # Deployment configuration
└── README.md
```

## License

Private — Authorized use only.
