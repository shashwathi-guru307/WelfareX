"""
Family Member API routes — CRUD operations for worker family members.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required
from app.services.family_service import (
    get_family_members, get_family_member_by_id,
    create_family_member, update_family_member, delete_family_member,
)
from app.services.worker_service import get_worker_by_id
from app.utils.validators import validate_required_fields, validate_date_not_future, validate_mobile_number, validate_gender

family_bp = Blueprint("family", __name__)


@family_bp.route("/api/workers/<int:worker_id>/family", methods=["GET"])
@login_required
def list_family_members(worker_id):
    """List all family members for a worker."""
    try:
        worker = get_worker_by_id(worker_id)
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        members = get_family_members(worker_id)
        return jsonify({"success": True, "data": members})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@family_bp.route("/api/workers/<int:worker_id>/family", methods=["POST"])
def create_new_family_member(worker_id):
    """Create a new family member for a worker."""
    try:
        worker = get_worker_by_id(worker_id)
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        errors = validate_required_fields(data, ['name', 'relationship', 'date_of_birth', 'gender'])
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        # Validate DOB is not in the future
        errors += validate_date_not_future(data['date_of_birth'], 'date_of_birth')
        # Validate gender
        errors += validate_gender(data.get('gender', ''))
        # Validate mobile if provided
        if data.get('mobile_number'):
            errors += validate_mobile_number(data['mobile_number'], 'mobile_number')
        # Validate disability percentage if provided
        if data.get('disability_percentage') is not None:
            try:
                pct = float(data['disability_percentage'])
                if pct < 0 or pct > 100:
                    errors.append("'disability_percentage' must be between 0 and 100.")
            except (TypeError, ValueError):
                errors.append("'disability_percentage' must be a valid number.")

        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        member = create_family_member(worker_id, data)
        return jsonify({"success": True, "data": member}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@family_bp.route("/api/family/<int:member_id>", methods=["GET"])
def get_family_member(member_id):
    """Get a single family member by ID."""
    try:
        member = get_family_member_by_id(member_id)
        if not member:
            return jsonify({"success": False, "error": "Family member not found."}), 404
        return jsonify({"success": True, "data": member})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@family_bp.route("/api/family/<int:member_id>", methods=["PUT"])
def update_existing_family_member(member_id):
    """Update an existing family member."""
    try:
        member = get_family_member_by_id(member_id)
        if not member:
            return jsonify({"success": False, "error": "Family member not found."}), 404

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        # Validate fields if provided
        errors = []
        if 'date_of_birth' in data and data['date_of_birth']:
            errors += validate_date_not_future(data['date_of_birth'], 'date_of_birth')
        if 'gender' in data and data['gender']:
            errors += validate_gender(data['gender'])
        if data.get('mobile_number'):
            errors += validate_mobile_number(data['mobile_number'], 'mobile_number')
        if data.get('disability_percentage') is not None:
            try:
                pct = float(data['disability_percentage'])
                if pct < 0 or pct > 100:
                    errors.append("'disability_percentage' must be between 0 and 100.")
            except (TypeError, ValueError):
                errors.append("'disability_percentage' must be a valid number.")
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        updated = update_family_member(member_id, data)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@family_bp.route("/api/family/<int:member_id>", methods=["DELETE"])
def delete_existing_family_member(member_id):
    """Delete a family member."""
    try:
        member = get_family_member_by_id(member_id)
        if not member:
            return jsonify({"success": False, "error": "Family member not found."}), 404

        deleted = delete_family_member(member_id)
        if deleted:
            return jsonify({"success": True, "message": "Family member deleted successfully."})
        return jsonify({"success": False, "error": "Failed to delete family member."}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
