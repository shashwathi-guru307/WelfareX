"""
Reminders & Activities API routes — Phase 5 (extended)
Provides endpoints for reminder CRUD and activity timeline.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required, admin_required
from app.services.reminder_service import (
    create_reminder, get_reminder, update_reminder, cancel_reminder,
    complete_reminder, list_reminders, get_overdue_reminders, get_reminder_summary,
)
from app.services.activity_service import (
    get_worker_activities, get_worker_activity_count, get_recent_activities,
    get_activity_summary,
)

reminders_bp = Blueprint("reminders", __name__)


# ============================================================
# Reminder Endpoints
# ============================================================

@reminders_bp.route("/api/reminders", methods=["GET"])
@login_required
def list_reminders_route():
    """List reminders with optional filtering."""
    try:
        user_id = getattr(request, 'user', {}).get('user_id')
        is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
        filter_user_id = None if is_admin else user_id

        worker_id = request.args.get("worker_id", type=int)
        reminder_type = request.args.get("type")
        status = request.args.get("status")
        priority = request.args.get("priority")
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        result = list_reminders(
            worker_id=worker_id,
            reminder_type=reminder_type,
            status=status,
            priority=priority,
            page=page,
            per_page=per_page,
            user_id=filter_user_id,
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders", methods=["POST"])
def create_reminder_route():
    """Create a new reminder."""
    try:
        data = request.get_json() or {}
        if not data.get("title"):
            return jsonify({"success": False, "error": "Title is required."}), 400

        reminder = create_reminder(
            worker_id=data.get("worker_id"),
            title=data["title"],
            description=data.get("description"),
            reminder_type=data.get("reminder_type", "OTHER"),
            reminder_date=data.get("reminder_date"),
            priority=data.get("priority", "MEDIUM"),
            metadata=data.get("metadata"),
        )
        return jsonify({"success": True, "data": reminder}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/summary", methods=["GET"])
def reminder_summary():
    """Get reminder summary counts."""
    try:
        summary = get_reminder_summary()
        return jsonify({"success": True, "data": summary})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/overdue", methods=["GET"])
def overdue_reminders():
    """Get all overdue reminders."""
    try:
        reminders = get_overdue_reminders()
        return jsonify({"success": True, "data": reminders})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/<int:reminder_id>", methods=["GET"])
def get_reminder_route(reminder_id):
    """Get a single reminder."""
    try:
        reminder = get_reminder(reminder_id)
        if not reminder:
            return jsonify({"success": False, "error": "Reminder not found."}), 404
        return jsonify({"success": True, "data": reminder})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/<int:reminder_id>", methods=["PUT"])
def update_reminder_route(reminder_id):
    """Update a reminder."""
    try:
        data = request.get_json() or {}
        reminder = update_reminder(
            reminder_id,
            title=data.get("title"),
            description=data.get("description"),
            reminder_type=data.get("reminder_type"),
            reminder_date=data.get("reminder_date"),
            priority=data.get("priority"),
            metadata=data.get("metadata"),
        )
        if not reminder:
            return jsonify({"success": False, "error": "Reminder not found."}), 404
        return jsonify({"success": True, "data": reminder})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/<int:reminder_id>/complete", methods=["POST"])
def complete_reminder_route(reminder_id):
    """Mark a reminder as completed."""
    try:
        success = complete_reminder(reminder_id)
        if not success:
            return jsonify({"success": False, "error": "Reminder not found or already completed."}), 404
        return jsonify({"success": True, "message": "Reminder completed."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/<int:reminder_id>/cancel", methods=["POST"])
def cancel_reminder_route(reminder_id):
    """Cancel a reminder."""
    try:
        success = cancel_reminder(reminder_id)
        if not success:
            return jsonify({"success": False, "error": "Reminder not found or already cancelled."}), 404
        return jsonify({"success": True, "message": "Reminder cancelled."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/reminders/<int:reminder_id>", methods=["DELETE"])
def delete_reminder_route(reminder_id):
    """Delete (cancel) a reminder."""
    try:
        success = cancel_reminder(reminder_id)
        if not success:
            return jsonify({"success": False, "error": "Reminder not found."}), 404
        return jsonify({"success": True, "message": "Reminder deleted."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Activity Endpoints
# ============================================================

@reminders_bp.route("/api/activities/worker/<int:worker_id>", methods=["GET"])
def worker_activities(worker_id):
    """Get activity timeline for a worker."""
    try:
        activity_type = request.args.get("type")
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)

        activities = get_worker_activities(worker_id, activity_type, limit, offset)
        count = get_worker_activity_count(worker_id)
        return jsonify({"success": True, "data": {"activities": activities, "total": count}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/activities/worker/<int:worker_id>/summary", methods=["GET"])
def worker_activity_summary(worker_id):
    """Get activity summary grouped by date for a worker."""
    try:
        summary = get_activity_summary(worker_id)
        return jsonify({"success": True, "data": summary})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reminders_bp.route("/api/activities/recent", methods=["GET"])
def recent_activities():
    """Get recent activities across all workers."""
    try:
        limit = request.args.get("limit", 20, type=int)
        activities = get_recent_activities(limit)
        return jsonify({"success": True, "data": activities})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
