"""
Notification Preferences API routes — Phase 5 (extended)
Manages configurable notification preferences.
"""

from flask import Blueprint, request, jsonify
from app.database import fetch_one, fetch_all, execute

preferences_bp = Blueprint("preferences", __name__)


@preferences_bp.route("/api/notification-preferences", methods=["GET"])
def get_preferences():
    """Get all notification preferences."""
    try:
        rows = fetch_all("SELECT * FROM notification_preferences ORDER BY id")
        prefs = {}
        for r in rows:
            prefs[r["config_key"]] = {
                "value": r["config_value"],
                "description": r.get("description", ""),
            }
        return jsonify({"success": True, "data": prefs})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@preferences_bp.route("/api/notification-preferences", methods=["PUT"])
def update_preferences():
    """Update one or more notification preferences."""
    try:
        data = request.get_json() or {}
        updated = 0
        for key, value in data.items():
            existing = fetch_one(
                "SELECT id FROM notification_preferences WHERE config_key = ?",
                (key,),
            )
            if existing:
                execute(
                    "UPDATE notification_preferences SET config_value = ?, updated_at = datetime('now') WHERE config_key = ?",
                    (str(value), key),
                )
                updated += 1
            else:
                execute(
                    "INSERT INTO notification_preferences (config_key, config_value) VALUES (?, ?)",
                    (key, str(value)),
                )
                updated += 1

        return jsonify({"success": True, "data": {"updated": updated}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
