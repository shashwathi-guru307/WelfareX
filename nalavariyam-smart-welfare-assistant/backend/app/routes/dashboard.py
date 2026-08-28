"""
Dashboard API routes — provides dashboard statistics.
"""

from flask import Blueprint, jsonify
from app.services.dashboard_service import get_dashboard_stats

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    """Return dashboard statistics."""
    try:
        stats = get_dashboard_stats()
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
