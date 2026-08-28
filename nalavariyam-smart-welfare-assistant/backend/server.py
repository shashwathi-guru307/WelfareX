"""
Nalavariyam Smart Welfare Assistant — Backend API
Tamil Nadu Unorganised Workers Welfare Board

Main Flask application entry point.
Supports development (Flask dev server) and production (Gunicorn).
"""

import os
import secrets
import logging
from flask import Flask, jsonify, request as flask_request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from app.routes.auth import auth_bp, login_required, _get_token
from app.services.auth_service import get_session
from app.routes.dashboard import dashboard_bp
from app.routes.workers import workers_bp
from app.routes.boards import boards_bp
from app.routes.schemes import schemes_bp
from app.routes.eligibility import eligibility_bp
from app.routes.family import family_bp
from app.routes.education import education_bp
from app.routes.alerts import alerts_bp
from app.routes.reminders import reminders_bp
from app.routes.preferences import preferences_bp
from app.routes.settings import settings_bp
from app.routes.reports import reports_bp
from app.routes.cases import cases_bp
from app.routes.worker_notes import worker_notes_bp
from app.database import get_database_info

# ============================================================
# Logging Configuration
# ============================================================

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("nwsa")

# ============================================================
# Paths that do NOT require authentication
# ============================================================

PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/login",
}


# ============================================================
# Application Factory
# ============================================================

def create_app() -> Flask:
    """Application factory."""
    app = Flask(__name__)

    # --- Configuration ---
    is_production = os.environ.get("FLASK_DEBUG", "0") != "1"
    app.config["DEBUG"] = not is_production
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = is_production  # HTTPS-only in production

    # --- CORS ---
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    allowed_origins = [frontend_url]
    # Always allow localhost for development convenience
    if "localhost" not in frontend_url:
        allowed_origins.append("http://localhost:5173")
        allowed_origins.append("http://127.0.0.1:5173")

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

    # --- Register Blueprints ---
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(workers_bp)
    app.register_blueprint(boards_bp)
    app.register_blueprint(schemes_bp)
    app.register_blueprint(eligibility_bp)
    app.register_blueprint(family_bp)
    app.register_blueprint(education_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(preferences_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(cases_bp)
    app.register_blueprint(worker_notes_bp)

    # --- Health Check Endpoint (public) ---
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "ok",
        })

    # --- Global before_request: require authentication for all /api/* ---
    @app.before_request
    def require_auth():
        if not flask_request.path.startswith("/api/"):
            return None
        if flask_request.path in PUBLIC_PATHS:
            return None
        if flask_request.path.startswith("/api/auth/"):
            return None

        token = _get_token()
        if not token:
            return jsonify({"success": False, "error": "Authentication required."}), 401

        sess = get_session(token)
        if not sess:
            return jsonify({"success": False, "error": "Session expired. Please log in again."}), 401

        flask_request.user = sess
        return None

    # --- Security Headers ---
    @app.after_request
    def set_security_headers(response):
        # Prevent browsers from caching private data
        if flask_request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        if is_production:
            # Strict CSP for production — only allow our own resources
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'"
            )
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

    # --- Global Error Handlers ---
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"success": False, "error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({"success": False, "error": "Internal server error. Please try again later."}), 500

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"success": False, "error": "File too large."}), 413

    return app


# ============================================================
# Entry Point
# ============================================================

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000)) or 5000
    debug = app.config["DEBUG"]
    logger.info(f"Starting Nalavariyam API on port {port} (debug={debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)
