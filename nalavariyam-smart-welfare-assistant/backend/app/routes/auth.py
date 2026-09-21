"""
Authentication API Routes — Phase 8
Provides login, logout, session, password change, and user management endpoints.
"""

import logging
import traceback
from functools import wraps
from flask import Blueprint, request, jsonify, session

logger = logging.getLogger(__name__)
from app.services.auth_service import (
    authenticate, create_session, get_session, destroy_session,
    change_password, admin_reset_password,
    get_all_users, get_user_by_id, get_user_count,
)

auth_bp = Blueprint("auth", __name__)


# ============================================================
# Auth Decorator
# ============================================================

def login_required(f):
    """Decorator to require authentication for an endpoint."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _get_token()
        if not token:
            return jsonify({"success": False, "error": "Authentication required."}), 401

        sess = get_session(token)
        if not sess:
            return jsonify({"success": False, "error": "Session expired. Please log in again."}), 401

        # Attach user info to request context
        request.user = sess
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator to require admin role."""
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if request.user.get('role') != 'ADMIN':
            return jsonify({"success": False, "error": "Admin access required."}), 403
        return f(*args, **kwargs)
    return decorated


def _get_token() -> str | None:
    """Extract auth token from request (header or cookie)."""
    # Check Authorization header first
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:].strip()

    # Check cookie
    return request.cookies.get('nwsa_session')


# ============================================================
# Login
# ============================================================

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticate user and create session."""
    try:
        data = request.get_json() or {}
        identifier = data.get('email') or data.get('username') or data.get('identifier', '')
        password = data.get('password', '')

        if not identifier or not identifier.strip():
            return jsonify({"success": False, "error": "Email or username is required."}), 400
        if not password:
            return jsonify({"success": False, "error": "Password is required."}), 400

        ip_address = request.remote_addr
        result = authenticate(identifier.strip(), password, ip_address)

        if not result['success']:
            status_code = 429 if result.get('rate_limited') else 401
            return jsonify({
                "success": False,
                "error": result['error'],
                **({"retry_after": result.get('retry_after')} if result.get('rate_limited') else {}),
            }), status_code

        resp = jsonify({
            "success": True,
            "data": result['user'],
            "message": "Login successful.",
        })

        # Set session cookie
        resp.set_cookie(
            'nwsa_session',
            result['token'],
            httponly=True,
            samesite='Lax',
            max_age=86400,  # 24 hours
            path='/',
        )

        return resp
    except Exception as e:
        logger.error("Login failed with unexpected error:\n%s", traceback.format_exc())
        return jsonify({"success": False, "error": "An unexpected error occurred."}), 500


# ============================================================
# Logout
# ============================================================

@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    """Destroy session and clear cookie."""
    token = _get_token()
    if token:
        destroy_session(token)

    resp = jsonify({"success": True, "message": "Logged out successfully."})
    resp.delete_cookie('nwsa_session', path='/')
    return resp


# ============================================================
# Current User
# ============================================================

@auth_bp.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user():
    """Get the currently authenticated user's info."""
    user = get_user_by_id(request.user['user_id'])
    if not user:
        return jsonify({"success": False, "error": "User not found."}), 404
    return jsonify({"success": True, "data": user})


# ============================================================
# Change Password
# ============================================================

@auth_bp.route("/api/auth/change-password", methods=["POST"])
@login_required
def change_user_password():
    """Change the authenticated user's password."""
    try:
        data = request.get_json() or {}
        current = data.get('current_password', '')
        new = data.get('new_password', '')
        confirm = data.get('confirm_password', '')

        if not current:
            return jsonify({"success": False, "error": "Current password is required."}), 400
        if not new:
            return jsonify({"success": False, "error": "New password is required."}), 400
        if new != confirm:
            return jsonify({"success": False, "error": "New passwords do not match."}), 400

        result = change_password(request.user['user_id'], current, new)
        if not result['success']:
            return jsonify({"success": False, "error": result['error']}), 400

        return jsonify({"success": True, "message": result['message']})
    except Exception as e:
        return jsonify({"success": False, "error": "An unexpected error occurred."}), 500


# ============================================================
# User Management (Admin only)
# ============================================================

@auth_bp.route("/api/auth/users", methods=["GET"])
@admin_required
def list_users():
    """List all users (admin only)."""
    try:
        users = get_all_users()
        return jsonify({"success": True, "data": users})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/users/<int:user_id>/reset-password", methods=["POST"])
@admin_required
def reset_user_password(user_id):
    """Admin-only password reset for another user."""
    try:
        data = request.get_json() or {}
        new_password = data.get('new_password', '')
        if not new_password:
            return jsonify({"success": False, "error": "New password is required."}), 400

        result = admin_reset_password(user_id, new_password)
        if not result['success']:
            return jsonify({"success": False, "error": result['error']}), 400

        return jsonify({"success": True, "message": result['message']})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Profile Update
# ============================================================

@auth_bp.route("/api/auth/profile", methods=["PUT"])
@login_required
def update_profile():
    """Update the authenticated user's display name."""
    try:
        data = request.get_json() or {}
        display_name = data.get("display_name", "").strip()
        if not display_name:
            return jsonify({"success": False, "error": "Display name is required."}), 400

        user_id = request.user["user_id"]
        from app.database import execute as db_execute
        db_execute(
            "UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?",
            (display_name, user_id),
        )
        user = get_user_by_id(user_id)
        return jsonify({"success": True, "data": user, "message": "Profile updated."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/profile/picture", methods=["POST"])
@login_required
def upload_profile_picture():
    """Upload a profile picture."""
    try:
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file uploaded."}), 400

        file = request.files["file"]
        if not file.filename:
            return jsonify({"success": False, "error": "No file selected."}), 400

        allowed = {".jpg", ".jpeg", ".png", ".webp"}
        ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in allowed:
            return jsonify({"success": False, "error": "Allowed: JPG, PNG, WebP."}), 400

        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        if size > 2 * 1024 * 1024:
            return jsonify({"success": False, "error": "Max 2MB."}), 400

        import os, uuid
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "profile_pictures")
        os.makedirs(upload_dir, exist_ok=True)

        safe_name = f"user_{request.user['user_id']}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(upload_dir, safe_name)
        file.save(filepath)

        # Remove old picture
        user = get_user_by_id(request.user["user_id"])
        if user and user.get("profile_picture"):
            old = os.path.join(upload_dir, user["profile_picture"])
            if os.path.exists(old):
                os.remove(old)

        from app.database import execute as db_execute
        db_execute(
            "UPDATE users SET profile_picture = ?, updated_at = datetime('now') WHERE id = ?",
            (safe_name, request.user["user_id"]),
        )
        updated = get_user_by_id(request.user["user_id"])
        return jsonify({"success": True, "data": updated, "message": "Profile picture updated."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/profile/picture", methods=["DELETE"])
@login_required
def delete_profile_picture():
    """Remove profile picture."""
    try:
        import os
        user = get_user_by_id(request.user["user_id"])
        if user and user.get("profile_picture"):
            upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "profile_pictures")
            fp = os.path.join(upload_dir, user["profile_picture"])
            if os.path.exists(fp):
                os.remove(fp)
            from app.database import execute as db_execute
            db_execute("UPDATE users SET profile_picture = NULL, updated_at = datetime('now') WHERE id = ?",
                       (request.user["user_id"],))
        updated = get_user_by_id(request.user["user_id"])
        return jsonify({"success": True, "data": updated, "message": "Profile picture removed."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/profile/picture/<filename>")
@login_required
def serve_profile_picture(filename):
    """Serve a profile picture."""
    from flask import send_from_directory
    import os
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "profile_pictures")
    safe = os.path.basename(filename)
    if safe != filename or ".." in safe:
        return jsonify({"success": False, "error": "Invalid filename."}), 400
    return send_from_directory(os.path.abspath(upload_dir), safe)


# ============================================================
# Registration Request (Public — no auth required)
# ============================================================

@auth_bp.route("/api/auth/request-access", methods=["POST"])
def request_access():
    """Allow a public visitor to create an account and request access."""
    try:
        from app.services.google_oauth import submit_access_request
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        if not email:
            return jsonify({"success": False, "error": "Email address is required."}), 400
        import re
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return jsonify({"success": False, "error": "Please enter a valid email address."}), 400
        if not password or len(password) < 6:
            return jsonify({"success": False, "error": "Password must be at least 6 characters."}), 400
        result = submit_access_request(email, password)
        if not result['success']:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": "An unexpected error occurred."}), 500


# ============================================================
# Google OAuth
# ============================================================

@auth_bp.route("/api/auth/google", methods=["POST"])
def google_login():
    """Authenticate with Google OAuth token."""
    try:
        from app.services.google_oauth import authenticate_with_google

        data = request.get_json() or {}
        id_token = data.get('credential') or data.get('id_token', '')

        if not id_token:
            return jsonify({"success": False, "error": "Google credential is required."}), 400

        result = authenticate_with_google(id_token)

        if not result['success']:
            status_code = 200 if result.get('pending') else 401
            return jsonify({
                "success": False,
                "error": result['error'],
                **({"pending": True} if result.get('pending') else {}),
            }), status_code

        resp = jsonify({
            "success": True,
            "data": result['user'],
            "message": "Google login successful.",
        })

        resp.set_cookie(
            'nwsa_session',
            result['token'],
            httponly=True,
            samesite='Lax',
            max_age=86400,
            path='/',
        )

        return resp
    except Exception as e:
        import logging
        logging.getLogger('nwsa').error(f"Google auth error: {e}")
        return jsonify({"success": False, "error": "An unexpected error occurred."}), 500


@auth_bp.route("/api/auth/google/config", methods=["GET"])
def google_config():
    """Return Google OAuth client ID for frontend initialization."""
    from app.services.google_oauth import GOOGLE_CLIENT_ID
    return jsonify({
        "success": True,
        "data": {
            "client_id": GOOGLE_CLIENT_ID,
            "enabled": bool(GOOGLE_CLIENT_ID),
        },
    })


# ============================================================
# Registration Requests (Admin)
# ============================================================

@auth_bp.route("/api/auth/requests", methods=["GET"])
@admin_required
def list_registration_requests():
    """List all registration requests (admin only)."""
    try:
        from app.services.google_oauth import get_all_requests
        requests_list = get_all_requests()
        return jsonify({"success": True, "data": requests_list})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/requests/pending-count", methods=["GET"])
@login_required
def pending_request_count():
    """Get count of pending registration requests."""
    try:
        from app.services.google_oauth import get_pending_request_count
        count = get_pending_request_count()
        return jsonify({"success": True, "data": {"count": count}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/requests/<int:request_id>/approve", methods=["POST"])
@admin_required
def approve_registration_request(request_id):
    """Approve a pending registration request (admin only)."""
    try:
        from app.services.google_oauth import approve_request
        result = approve_request(request_id, request.user['user_id'])
        if not result['success']:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/requests/<int:request_id>/reject", methods=["POST"])
@admin_required
def reject_registration_request(request_id):
    """Reject a pending registration request (admin only)."""
    try:
        from app.services.google_oauth import reject_request
        data = request.get_json() or {}
        reason = data.get('reason', '')
        result = reject_request(request_id, request.user['user_id'], reason)
        if not result['success']:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# User Access Management (Admin — Revoke/Reactivate)
# ============================================================

@auth_bp.route("/api/auth/approved-users", methods=["GET"])
@admin_required
def list_approved_users():
    """List all approved users (admin only)."""
    try:
        from app.services.google_oauth import get_all_approved_users
        users = get_all_approved_users()
        return jsonify({"success": True, "data": users})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/users/<int:user_id>/revoke", methods=["POST"])
@admin_required
def revoke_user(user_id):
    """Revoke (suspend) a user's access (admin only)."""
    try:
        from app.services.google_oauth import revoke_user_access
        result = revoke_user_access(user_id, request.user['user_id'])
        if not result['success']:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/api/auth/users/<int:user_id>/reactivate", methods=["POST"])
@admin_required
def reactivate_user(user_id):
    """Re-enable a suspended user's access (admin only)."""
    try:
        from app.services.google_oauth import reactivate_user_access
        result = reactivate_user_access(user_id, request.user['user_id'])
        if not result['success']:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
