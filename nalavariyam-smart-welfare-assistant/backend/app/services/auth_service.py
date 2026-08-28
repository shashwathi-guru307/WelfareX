"""
Authentication Service — Phase 8
Secure authentication for the Nalavariyam Smart Welfare Assistant.

Provides:
  - Password hashing (Werkzeug)
  - User authentication
  - Session management
  - Rate limiting for login attempts
  - Password change
  - User management (admin only)
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Configuration
# ============================================================

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
MIN_PASSWORD_LENGTH = 6
SESSION_SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# In-memory session store (production would use Redis/DB)
_sessions: dict[str, dict] = {}


# ============================================================
# Password Hashing
# ============================================================

def hash_password(password: str) -> str:
    """Hash a password using Werkzeug (pbkdf2:sha256)."""
    return generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return check_password_hash(password_hash, password)


def validate_password_strength(password: str) -> list[str]:
    """Validate password meets minimum requirements."""
    errors = []
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    return errors


# ============================================================
# Session Management
# ============================================================

def create_session(user_id: int, username: str, role: str, display_name: str) -> str:
    """Create a new session and return the session token."""
    token = secrets.token_urlsafe(32)
    _sessions[token] = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'display_name': display_name,
        'created_at': datetime.now().isoformat(),
        'expires_at': (datetime.now() + timedelta(hours=24)).isoformat(),
    }
    return token


def get_session(token: str) -> Optional[dict]:
    """Get session data if valid."""
    session = _sessions.get(token)
    if not session:
        return None
    # Check expiry
    try:
        expires = datetime.fromisoformat(session['expires_at'])
        if datetime.now() > expires:
            _sessions.pop(token, None)
            return None
    except (ValueError, TypeError):
        return None
    return session


def destroy_session(token: str) -> bool:
    """Destroy a session."""
    if token in _sessions:
        del _sessions[token]
        return True
    return False


# ============================================================
# Rate Limiting
# ============================================================

def check_rate_limit(identifier: str) -> dict:
    """Check if login attempts are rate-limited. Returns {allowed, retry_after_seconds}."""
    cutoff = (datetime.now() - timedelta(minutes=LOCKOUT_MINUTES)).strftime('%Y-%m-%d %H:%M:%S')
    row = fetch_one(
        """SELECT COUNT(*) as count FROM login_attempts
           WHERE identifier = ? AND success = 0 AND attempted_at > ?""",
        (identifier, cutoff),
    )
    attempts = row['count'] if row else 0

    if attempts >= MAX_LOGIN_ATTEMPTS:
        # Find the oldest failed attempt to calculate retry time
        oldest = fetch_one(
            """SELECT attempted_at FROM login_attempts
               WHERE identifier = ? AND success = 0 AND attempted_at > ?
               ORDER BY attempted_at ASC LIMIT 1""",
            (identifier, cutoff),
        )
        if oldest:
            try:
                oldest_dt = datetime.strptime(oldest['attempted_at'], '%Y-%m-%d %H:%M:%S')
                retry_after = int((oldest_dt + timedelta(minutes=LOCKOUT_MINUTES) - datetime.now()).total_seconds())
                retry_after = max(retry_after, 60)
            except (ValueError, TypeError):
                retry_after = LOCKOUT_MINUTES * 60
        else:
            retry_after = LOCKOUT_MINUTES * 60
        return {'allowed': False, 'retry_after_seconds': retry_after, 'attempts': attempts}

    return {'allowed': True, 'attempts': attempts, 'remaining': MAX_LOGIN_ATTEMPTS - attempts}


def record_login_attempt(identifier: str, success: bool, ip_address: Optional[str] = None):
    """Record a login attempt."""
    execute(
        "INSERT INTO login_attempts (identifier, ip_address, success, attempted_at) VALUES (?, ?, ?, ?)",
        (identifier, ip_address, 1 if success else 0, datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
    )
    # Clean up old attempts (older than 1 hour)
    cutoff = (datetime.now() - timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')
    execute("DELETE FROM login_attempts WHERE attempted_at < ?", (cutoff,))


# ============================================================
# Authentication
# ============================================================

def authenticate(identifier: str, password: str, ip_address: Optional[str] = None) -> dict:
    """
    Authenticate a user by email/username and password.
    Returns {success, token, user, error}.
    """
    # Rate limit check
    rate_check = check_rate_limit(identifier)
    if not rate_check['allowed']:
        return {
            'success': False,
            'error': f'Too many failed attempts. Please try again in {rate_check["retry_after_seconds"] // 60 + 1} minutes.',
            'rate_limited': True,
            'retry_after': rate_check['retry_after_seconds'],
        }

    # Find user by email or username
    user = fetch_one(
        "SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1",
        (identifier.strip().lower(), identifier.strip().lower()),
    )

    if not user or not verify_password(password, user['password_hash']):
        record_login_attempt(identifier, False, ip_address)
        return {'success': False, 'error': 'Invalid email/username or password.'}

    # Successful login
    record_login_attempt(identifier, True, ip_address)

    # Update last login
    execute(
        "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
        (user['id'],),
    )

    # Create session
    token = create_session(
        user_id=user['id'],
        username=user['username'],
        role=user['role'],
        display_name=user['display_name'],
    )

    return {
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'name': user['display_name'],
            'role': user['role'],
        },
    }


# ============================================================
# Password Management
# ============================================================

def change_password(user_id: int, current_password: str, new_password: str) -> dict:
    """Change a user's password. Returns {success, error}."""
    user = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        return {'success': False, 'error': 'User not found.'}

    if not verify_password(current_password, user['password_hash']):
        return {'success': False, 'error': 'Current password is incorrect.'}

    errors = validate_password_strength(new_password)
    if errors:
        return {'success': False, 'error': errors[0]}

    new_hash = hash_password(new_password)
    execute(
        "UPDATE users SET password_hash = ?, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        (new_hash, user_id),
    )
    return {'success': True, 'message': 'Password changed successfully.'}


def admin_reset_password(user_id: int, new_password: str) -> dict:
    """Admin-only password reset. Returns {success, error}."""
    user = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        return {'success': False, 'error': 'User not found.'}

    errors = validate_password_strength(new_password)
    if errors:
        return {'success': False, 'error': errors[0]}

    new_hash = hash_password(new_password)
    execute(
        "UPDATE users SET password_hash = ?, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        (new_hash, user_id),
    )
    return {'success': True, 'message': 'Password reset successfully.'}


# ============================================================
# User Management (Admin only)
# ============================================================

def get_all_users() -> list[dict]:
    """Get all users (excluding password hash)."""
    rows = fetch_all(
        "SELECT id, username, email, display_name, role, is_active, created_at, last_login_at, profile_picture FROM users ORDER BY role, username"
    )
    return [dict(r) for r in rows]


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Get a single user (excluding password hash)."""
    row = fetch_one(
        "SELECT id, username, email, display_name, role, is_active, created_at, last_login_at, profile_picture FROM users WHERE id = ?",
        (user_id,),
    )
    return dict(row) if row else None


def get_user_count() -> int:
    """Get total number of users."""
    row = fetch_one("SELECT COUNT(*) as count FROM users")
    return row['count'] if row else 0


def get_user_role(user_id: int) -> Optional[str]:
    """Get a user's role."""
    row = fetch_one("SELECT role FROM users WHERE id = ?", (user_id,))
    return row['role'] if row else None
