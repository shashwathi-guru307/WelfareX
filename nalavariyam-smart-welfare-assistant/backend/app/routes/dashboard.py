"""
Dashboard API routes — provides dashboard statistics.
Phase 14: Per-user data isolation.
"""

from flask import Blueprint, jsonify, request
from app.routes.auth import login_required
from app.services.dashboard_service import get_dashboard_stats

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard/stats", methods=["GET"])
@login_required
def dashboard_stats():
    """Return dashboard statistics filtered by authenticated user."""
    try:
        user_id = getattr(request, 'user', {}).get('user_id')
        is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
        # Admin sees everything; non-admin sees only their own
        stats = get_dashboard_stats(user_id=None if is_admin else user_id)
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
