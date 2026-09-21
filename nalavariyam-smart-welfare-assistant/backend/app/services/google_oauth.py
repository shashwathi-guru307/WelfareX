"""
Google OAuth Service — Phase 13
Handles Google OAuth token verification and user creation/approval flow.
"""

import os
import secrets
import hashlib
import hmac
import time
import json
from typing import Optional
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Configuration
# ============================================================

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'postmessage')


# ============================================================
# Google Token Verification (using Google's tokeninfo endpoint)
# ============================================================

def verify_google_token(id_token: str) -> Optional[dict]:
    """
    Verify a Google ID token using Google's tokeninfo endpoint.
    Returns user info dict or None if invalid.
    """
    import urllib.request
    import urllib.parse

    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(id_token)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'NWSA/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

            # Verify the token is for our app
            if GOOGLE_CLIENT_ID and data.get('aud') != GOOGLE_CLIENT_ID:
                return None

            # Check expiry
            if int(data.get('exp', 0)) < time.time():
                return None

            return {
                'google_id': data.get('sub'),
                'email': data.get('email', '').lower(),
                'name': data.get('name', ''),
                'picture': data.get('picture', ''),
                'email_verified': data.get('email_verified', 'false') == 'true',
            }
    except Exception:
        return None


# ============================================================
# User Lookup / Creation
# ============================================================

def find_user_by_google_id(google_id: str) -> Optional[dict]:
    """Find an existing user by their Google ID."""
    return fetch_one(
        "SELECT * FROM users WHERE google_id = ? AND is_active = 1",
        (google_id,),
    )


def find_user_by_email(email: str) -> Optional[dict]:
    """Find an existing user by email."""
    return fetch_one(
        "SELECT * FROM users WHERE email = ? AND is_active = 1",
        (email.lower().strip(),),
    )


def create_google_user(google_info: dict) -> dict:
    """
    Create a new user from Google OAuth info.
    The user starts as PENDING until admin approves.
    """
    email = google_info['email'].lower().strip()
    display_name = google_info.get('name', email.split('@')[0])
    google_id = google_info['google_id']
    avatar_url = google_info.get('picture', '')

    # Generate a username from email
    username = email.split('@')[0].replace('.', '_').replace('+', '_')

    # Check if user already exists by email
    existing = find_user_by_email(email)
    if existing:
        # Update Google info on existing user
        execute(
            """UPDATE users SET google_id = ?, avatar_url = ?, updated_at = datetime('now')
               WHERE id = ?""",
            (google_id, avatar_url, existing['id']),
        )
        return existing

    # Check if user already exists by google_id
    existing = find_user_by_google_id(google_id)
    if existing:
        return existing

    # Create new user with PENDING status
    user_id = execute(
        """INSERT INTO users
           (username, email, display_name, password_hash, role, google_id, avatar_url,
            approval_status, requested_at, is_active)
           VALUES (?, ?, ?, 'google_oauth', 'STAFF', ?, ?, 'PENDING', datetime('now'), 1)""",
        (username, email, display_name, google_id, avatar_url),
    )

    # Also create a registration request
    execute(
        """INSERT INTO registration_requests
           (google_id, email, display_name, avatar_url, status, requested_at)
           VALUES (?, ?, ?, ?, 'PENDING', datetime('now'))""",
        (google_id, email, display_name, avatar_url),
    )

    return fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))


def authenticate_with_google(id_token: str) -> dict:
    """
    Authenticate a user with Google OAuth.
    Returns {success, token, user, pending, error}.
    """
    # Verify the Google token
    google_info = verify_google_token(id_token)
    if not google_info:
        return {'success': False, 'error': 'Invalid Google authentication. Please try again.'}

    # Find or create user
    user = find_user_by_google_id(google_info['google_id'])
    if not user:
        user = find_user_by_email(google_info['email'])

    if user:
        # Update Google info
        execute(
            """UPDATE users SET google_id = ?, avatar_url = ?, last_login_at = datetime('now')
               WHERE id = ?""",
            (google_info['google_id'], google_info.get('picture', ''), user['id']),
        )
    else:
        # Create new user
        user = create_google_user(google_info)

    if not user:
        return {'success': False, 'error': 'Failed to create user account.'}

    # Check approval status
    if user.get('approval_status') == 'PENDING':
        return {
            'success': False,
            'pending': True,
            'error': 'Your account is pending admin approval. You will be notified once approved.',
        }

    if user.get('approval_status') == 'REJECTED':
        reason = user.get('rejection_reason', 'Access was denied by the administrator.')
        return {
            'success': False,
            'error': f'Your access request was denied. Reason: {reason}',
        }

    if not user.get('is_active'):
        return {'success': False, 'error': 'Your account has been deactivated.'}

    # Create session
    from app.services.auth_service import create_session
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
            'avatar_url': user.get('avatar_url', ''),
        },
    }


# ============================================================
# Public Access Request (no Google required)
# ============================================================

def submit_access_request(email: str, password: str = '') -> dict:
    """
    Submit an access request from a public visitor (email + password).
    Creates a pending registration request for admin approval.
    """
    from app.services.auth_service import hash_password
    
    email = email.lower().strip()
    
    # Check if there's already a pending request for this email
    existing = fetch_one(
        "SELECT * FROM registration_requests WHERE email = ? AND status = 'PENDING'",
        (email,),
    )
    if existing:
        return {'success': False, 'error': 'A request for this email is already pending. Please wait for admin approval.'}
    
    # Check if the user is already an approved user
    user = fetch_one(
        "SELECT * FROM users WHERE email = ? AND is_active = 1",
        (email,),
    )
    if user and user.get('approval_status') == 'APPROVED':
        return {'success': False, 'error': 'This email already has access. Please sign in with your credentials.'}
    
    # Create a registration request
    username = email.split('@')[0].replace('.', '_').replace('+', '_')
    display_name = username.replace('_', ' ').title()
    hashed_password = hash_password(password) if password else 'pending_activation'
    
    request_id = execute(
        """INSERT INTO registration_requests
           (google_id, email, display_name, status, requested_at)
           VALUES (?, ?, ?, 'PENDING', datetime('now'))""",
        ('email_only_' + email, email, display_name),
    )
    
    # Create or update user record with hashed password
    if not user:
        execute(
            """INSERT INTO users
               (username, email, display_name, password_hash, role, google_id,
                approval_status, requested_at, is_active)
               VALUES (?, ?, ?, ?, 'STAFF', ?, 'PENDING', datetime('now'), 1)""",
            (username, email, display_name, hashed_password, 'email_only_' + email),
        )
    else:
        # Update existing user with hashed password and pending status
        execute(
            """UPDATE users SET password_hash = ?, approval_status = 'PENDING',
               requested_at = datetime('now'), updated_at = datetime('now') WHERE id = ?""",
            (hashed_password, user['id']),
        )
    
    return {'success': True, 'message': 'Your account request has been sent to the administrator. You will be notified once approved.'}


# ============================================================
# Registration Request Management (Admin)
# ============================================================

def get_pending_requests() -> list[dict]:
    """Get all pending registration requests."""
    rows = fetch_all(
        """SELECT rr.*, u.id as existing_user_id
           FROM registration_requests rr
           LEFT JOIN users u ON rr.google_id = u.google_id
           WHERE rr.status = 'PENDING'
           ORDER BY rr.requested_at DESC"""
    )
    return [dict(r) for r in rows]


def get_all_requests() -> list[dict]:
    """Get all registration requests (any status)."""
    rows = fetch_all(
        """SELECT rr.*, u.id as existing_user_id, u.approval_status as user_approval_status
           FROM registration_requests rr
           LEFT JOIN users u ON rr.google_id = u.google_id
           ORDER BY rr.requested_at DESC"""
    )
    return [dict(r) for r in rows]


def approve_request(request_id: int, admin_user_id: int) -> dict:
    """Approve a registration request and activate the user."""
    req = fetch_one(
        "SELECT * FROM registration_requests WHERE id = ? AND status = 'PENDING'",
        (request_id,),
    )
    if not req:
        return {'success': False, 'error': 'Request not found or already processed.'}

    # Update registration request
    execute(
        """UPDATE registration_requests
           SET status = 'APPROVED', reviewed_at = datetime('now'), reviewed_by = ?, updated_at = datetime('now')
           WHERE id = ?""",
        (admin_user_id, request_id),
    )

    # Update user approval status
    user = fetch_one("SELECT * FROM users WHERE google_id = ?", (req['google_id'],))
    if user:
        execute(
            """UPDATE users
               SET approval_status = 'APPROVED', approved_at = datetime('now'), approved_by = ?,
                   updated_at = datetime('now')
               WHERE id = ?""",
            (admin_user_id, user['id']),
        )

    return {'success': True, 'message': f'Access approved for {req["email"]}.'}


def reject_request(request_id: int, admin_user_id: int, reason: str = '') -> dict:
    """Reject a registration request."""
    req = fetch_one(
        "SELECT * FROM registration_requests WHERE id = ? AND status = 'PENDING'",
        (request_id,),
    )
    if not req:
        return {'success': False, 'error': 'Request not found or already processed.'}

    # Update registration request
    execute(
        """UPDATE registration_requests
           SET status = 'REJECTED', reviewed_at = datetime('now'), reviewed_by = ?,
               rejection_reason = ?, updated_at = datetime('now')
           WHERE id = ?""",
        (admin_user_id, reason, request_id),
    )

    # Update user if exists
    user = fetch_one("SELECT * FROM users WHERE google_id = ?", (req['google_id'],))
    if user:
        execute(
            """UPDATE users
               SET approval_status = 'REJECTED', rejection_reason = ?, updated_at = datetime('now')
               WHERE id = ?""",
            (reason, user['id']),
        )

    return {'success': True, 'message': f'Access denied for {req["email"]}.'}


def get_pending_request_count() -> int:
    """Get count of pending registration requests (for admin badge)."""
    row = fetch_one(
        "SELECT COUNT(*) as count FROM registration_requests WHERE status = 'PENDING'"
    )
    return row['count'] if row else 0


# ============================================================
# User Access Management (Admin)
# ============================================================

def get_all_approved_users() -> list[dict]:
    """Get all users (approved + revoked) for admin management."""
    rows = fetch_all(
        """SELECT id, username, email, display_name, role, approval_status,
                  avatar_url, requested_at, approved_at, last_login_at, is_active
           FROM users
           WHERE approval_status != 'PENDING'
           ORDER BY is_active DESC, approved_at DESC"""
    )
    return [dict(r) for r in rows]


def revoke_user_access(user_id: int, admin_user_id: int) -> dict:
    """Revoke (suspend) a user's access. Admin only."""
    user = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        return {'success': False, 'error': 'User not found.'}

    if user['role'] == 'ADMIN':
        return {'success': False, 'error': 'Cannot revoke access for the main administrator.'}

    if user.get('approval_status') != 'APPROVED':
        return {'success': False, 'error': 'User is not currently approved.'}

    execute(
        """UPDATE users
           SET is_active = 0, updated_at = datetime('now')
           WHERE id = ?""",
        (user_id,),
    )

    # Also invalidate any active sessions for this user
    from app.services.auth_service import destroy_all_sessions_for_user
    destroy_all_sessions_for_user(user_id)

    return {'success': True, 'message': f'Access revoked for {user["email"]}. They can no longer log in.'}


def reactivate_user_access(user_id: int, admin_user_id: int) -> dict:
    """Re-enable a previously suspended user's access."""
    user = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        return {'success': False, 'error': 'User not found.'}

    if user.get('is_active') == 1:
        return {'success': False, 'error': 'User is already active.'}

    if user.get('approval_status') == 'PENDING':
        return {'success': False, 'error': 'User is still pending approval. Approve their request instead.'}

    execute(
        """UPDATE users
           SET is_active = 1, updated_at = datetime('now')
           WHERE id = ?""",
        (user_id,),
    )

    return {'success': True, 'message': f'Access restored for {user["email"]}. They can now log in again.'}
