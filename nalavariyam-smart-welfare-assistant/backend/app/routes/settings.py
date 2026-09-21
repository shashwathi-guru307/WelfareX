"""
Settings API routes — Phase 6
Provides endpoints for system configuration.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required
from app.services.settings_service import (
    get_all_settings, get_settings_by_category, get_setting,
    update_setting, update_settings, validate_settings, get_system_stats,
)

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/api/settings", methods=["GET"])
@login_required
def list_settings():
    """Get all settings grouped by category."""
    try:
        settings = get_all_settings()
        return jsonify({"success": True, "data": settings})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@settings_bp.route("/api/settings/category/<category>", methods=["GET"])
def get_category_settings(category):
    """Get settings for a specific category."""
    try:
        settings = get_settings_by_category(category)
        return jsonify({"success": True, "data": settings})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@settings_bp.route("/api/settings", methods=["PUT"])
def update_all_settings():
    """Update multiple settings."""
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"success": False, "error": "No settings provided."}), 400

        # Validate
        errors = validate_settings(data)
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        count = update_settings(data)
        return jsonify({"success": True, "data": {"updated": count}, "message": "Settings saved successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@settings_bp.route("/api/settings/<key>", methods=["GET"])
def get_single_setting(key):
    """Get a single setting by key."""
    try:
        value = get_setting(key)
        if value is None:
            return jsonify({"success": False, "error": f"Setting '{key}' not found."}), 404
        return jsonify({"success": True, "data": {"key": key, "value": value}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@settings_bp.route("/api/settings/<key>", methods=["PATCH"])
def update_single_setting(key):
    """Update a single setting."""
    try:
        data = request.get_json() or {}
        if "value" not in data:
            return jsonify({"success": False, "error": "Value is required."}), 400

        # Validate
        errors = validate_settings({key: data["value"]})
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        update_setting(key, data["value"])
        return jsonify({"success": True, "message": "Setting updated."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@settings_bp.route("/api/system/stats", methods=["GET"])
def system_stats():
    """Get system statistics for Data Management section."""
    try:
        stats = get_system_stats()
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
