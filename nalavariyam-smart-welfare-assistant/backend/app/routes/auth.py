"""
Authentication API Routes — Phase 8
Provides login, logout, session, password change, and user management endpoints.
"""

from functools import wraps
from flask import Blueprint, request, jsonify, session
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
def serve_profile_picture(filename):
    """Serve a profile picture."""
    from flask import send_from_directory
    import os
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "profile_pictures")
    safe = os.path.basename(filename)
    if safe != filename or ".." in safe:
        return jsonify({"success": False, "error": "Invalid filename."}), 400
    return send_from_directory(os.path.abspath(upload_dir), safe)
