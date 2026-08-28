# Run Doc — Nalavariyam Smart Welfare Assistant

## Prerequisites

- Python 3 with `flask`, `flask-cors`, `python-dotenv`, `gunicorn`, `psycopg2-binary`, `werkzeug` installed
- Node.js with npm

## Reproduce uncommitted artifacts

The database (`database/nalavariyam.db`) contains the real scheme data imported from the Excel spreadsheet plus Phase 7 case tables and Phase 8 user accounts.

To reinitialize (drops all tables, rebuilds schema + seed data):

```bash
cd nalavariyam-smart-welfare-assistant/database
"python.exe" init_db.py --reset
```

To add just scheme data (idempotent, won't duplicate):

```bash
cd nalavariyam-smart-welfare-assistant/database
"python.exe" init_db.py --schemes
```

### Database tables (20 total):
- welfare_boards (8 boards)
- scheme_categories (9 categories)
- welfare_schemes (12 real schemes from Excel)
- scheme_benefits (84 board-specific benefit rows)
- scheme_qualifications (18 education/pension variants)
- scheme_rules (37 structured eligibility rules)
- eligibility_rules (legacy rules from Phase 2)
- workers (20 demo workers)
- registrations (20 demo registrations)
- family_members (33 demo family members)
- education_records (17 demo records)
- scheme_applications (empty)
- eligibility_audit_log (Phase 4 audit)
- alerts (Phase 5 — renewal/eligibility/system alerts)
- renewal_config (Phase 5 — configurable threshold settings)
- cases (Phase 7 — case management)
- case_documents (Phase 7 — document checklist)
- case_tasks (Phase 7 — follow-up tasks)
- case_notes (Phase 7 — internal notes)
- case_activity_log (Phase 7 — case history)
- users (Phase 8 — two authorized accounts)
- login_attempts (Phase 8 — rate limiting)
- system_settings (Phases 6/7/8 — settings)

## Quick Start (using launch script)

The easiest way to start both servers:

```bash
cd nalavariyam-smart-welfare-assistant
python ../.freebuff/launch_servers.py
```

This starts:
- Backend Flask on port 5000
- Frontend Vite on port 5173

## Start servers manually

### Backend (Flask on port 5000)

```bash
cd nalavariyam-smart-welfare-assistant/backend
PORT=5000 python server.py
```

### Frontend (Vite on port 5173)

```bash
cd nalavariyam-smart-welfare-assistant/frontend
npm run dev
```

## Production

### Backend (Gunicorn)

```bash
cd nalavariyam-smart-welfare-assistant/backend
gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

### Frontend build

```bash
cd nalavariyam-smart-welfare-assistant/frontend
npm run build
# Output in dist/
```

## Database Migration (SQLite → PostgreSQL)

```bash
# 1. Export from SQLite
cd nalavariyam-smart-welfare-assistant/backend
python scripts/db_export.py

# 2. Set DATABASE_URL
export DATABASE_URL=postgresql://user:pass@host:5432/nalavariyam

# 3. Import to PostgreSQL
python scripts/db_import.py --apply-schema
```

## Database Backup

```bash
cd nalavariyam-smart-welfare-assistant/backend
python scripts/db_backup.py backup --sqlite   # SQLite
python scripts/db_backup.py backup --pg       # PostgreSQL
python scripts/db_backup.py list              # List backups
```

## Authentication

Two authorized accounts (created by `init_users.py`):

| Account | Email | Username | Default Password | Role |
|---------|-------|----------|-----------------|------|
| Admin | admin@nalavariyam.gov.in | admin | admin123 | ADMIN |
| Staff | staff@nalavariyam.gov.in | staff | staff123 | STAFF |

**Important:** Change default passwords after first login via Settings > Change Password.

Password hashing: Werkzeug pbkdf2:sha256 (1,000,000 iterations)
Session: HTTP-only cookie `nwsa_session` + Bearer token fallback
Rate limiting: 5 failed attempts → 15-minute lockout

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/health
- Auth API: http://localhost:5000/api/auth/login
- Schemes API: http://localhost:5000/api/schemes
- Cases API: http://localhost:5000/api/cases
- Alerts API: http://localhost:5000/api/alerts
- Settings API: http://localhost:5000/api/settings

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| SECRET_KEY | **Production** | random | Flask secret key |
| DATABASE_URL | Production | — | PostgreSQL URL |
| DATABASE_PATH | Dev | ../database/nalavariyam.db | SQLite path |
| FRONTEND_URL | No | http://localhost:5173 | CORS origin |
| DOCUMENT_STORAGE_PATH | No | ../uploads/case_documents | Upload dir |
| VITE_API_URL | No | /api | Frontend API base |
| FLASK_DEBUG | No | 0 | Debug mode |
| PORT | No | 5000 | Server port |
