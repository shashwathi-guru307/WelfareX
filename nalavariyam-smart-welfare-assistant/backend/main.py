"""
Nalavariyam Smart Welfare Assistant — Firebase Cloud Function Entry Point

This module exposes the Flask WSGI application as a Google Cloud Function (2nd gen).
Environment variables are provided via Firebase config instead of .env files.
"""

import os
import sys

# ============================================================
# Pre-load environment variables from Firebase config
# ============================================================
# Cloud Functions receives env vars from `firebase functions:config:set`.
# We map them to os.environ so the existing Flask app picks them up.

_ENV_DEFAULTS = {
    "SECRET_KEY": os.environ.get("SECRET_KEY", "CHANGE-ME-FIREBASE"),
    "FLASK_DEBUG": "0",
    "PORT": "8080",
    "LOG_LEVEL": "INFO",
    "FRONTEND_URL": os.environ.get("FRONTEND_URL", "https://nwsa-production.web.app"),
    "DOCUMENT_STORAGE_PATH": "/tmp/uploads/case_documents",
    # Database — Cloud SQL via Cloud SQL Auth Proxy
    # Set DATABASE_URL to: postgresql://user:pass@//cloudsql/PROJECT:REGION:INSTANCE/nalavariyam
    "DATABASE_URL": os.environ.get("DATABASE_URL", ""),
}

for key, default in _ENV_DEFAULTS.items():
    if key not in os.environ or not os.environ[key]:
        os.environ[key] = default

# Ensure app module is importable
sys.path.insert(0, os.path.dirname(__file__))

# ============================================================
# Import and expose the Flask WSGI application
# ============================================================
# We suppress the Flask dev-server startup that server.py's
# `if __name__ == "__main__"` block would trigger — it won't
# execute here because this file is the __main__, not server.py.
from server import create_app  # noqa: E402

app = create_app()

# Firebase Cloud Functions (2nd gen) calls this callable.
# With functions-framework, the Flask WSGI app itself is
# the entry point — no wrapper needed.
