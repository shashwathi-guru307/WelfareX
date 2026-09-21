"""
Education Record API routes — CRUD operations for worker/family education records.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required
from app.services.education_service import (
    get_education_records, get_education_record_by_id,
    create_education_record, update_education_record, delete_education_record,
    get_education_levels,
)
from app.services.worker_service import get_worker_by_id
from app.utils.validators import validate_required_fields

education_bp = Blueprint("education", __name__)


@education_bp.route("/api/workers/<int:worker_id>/education", methods=["GET"])
@login_required
def list_education_records(worker_id):
    """List all education records for a worker."""
    try:
        worker = get_worker_by_id(worker_id)
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        family_member_id = request.args.get("family_member_id", type=int)
        records = get_education_records(worker_id, family_member_id)
        return jsonify({"success": True, "data": records})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@education_bp.route("/api/workers/<int:worker_id>/education", methods=["POST"])
def create_new_education_record(worker_id):
    """Create a new education record for a worker."""
    try:
        worker = get_worker_by_id(worker_id)
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        errors = validate_required_fields(data, ['education_level'])
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        record = create_education_record(worker_id, data)
        return jsonify({"success": True, "data": record}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@education_bp.route("/api/education/<int:record_id>", methods=["GET"])
def get_education_record(record_id):
    """Get a single education record by ID."""
    try:
        record = get_education_record_by_id(record_id)
        if not record:
            return jsonify({"success": False, "error": "Education record not found."}), 404
        return jsonify({"success": True, "data": record})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@education_bp.route("/api/education/<int:record_id>", methods=["PUT"])
def update_existing_education_record(record_id):
    """Update an existing education record."""
    try:
        record = get_education_record_by_id(record_id)
        if not record:
            return jsonify({"success": False, "error": "Education record not found."}), 404

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        updated = update_education_record(record_id, data)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@education_bp.route("/api/education/<int:record_id>", methods=["DELETE"])
def delete_existing_education_record(record_id):
    """Delete an education record."""
    try:
        record = get_education_record_by_id(record_id)
        if not record:
            return jsonify({"success": False, "error": "Education record not found."}), 404

        deleted = delete_education_record(record_id)
        if deleted:
            return jsonify({"success": True, "message": "Education record deleted successfully."})
        return jsonify({"success": False, "error": "Failed to delete education record."}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@education_bp.route("/api/education-levels", methods=["GET"])
def list_education_levels():
    """List valid education levels."""
    try:
        levels = get_education_levels()
        return jsonify({"success": True, "data": levels})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
