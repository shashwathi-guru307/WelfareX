"""
Worker (Applicant) API routes — Phase 2 CRUD, search, sorting, and filtering.
"""

from functools import wraps
from flask import Blueprint, request, jsonify
from app.services.worker_service import (
    get_all_workers, get_worker_by_id, create_worker, update_worker,
    delete_worker, archive_worker, unarchive_worker,
    get_occupation_list, get_district_list, check_duplicate_registration,
)
from app.utils.validators import (
    validate_required_fields, validate_date, validate_mobile_number,
    validate_gender,
)
from app.routes.auth import login_required, admin_required

workers_bp = Blueprint("workers", __name__)


def _get_user_context():
    """Extract user_id and is_admin from the authenticated request."""
    user_id = getattr(request, 'user', {}).get('user_id')
    is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
    return user_id, is_admin


@workers_bp.route("/api/workers", methods=["GET"])
@login_required
def list_workers():
    """List workers with filtering, search, sorting, and pagination."""
    try:
        user_id, is_admin = _get_user_context()
        search = request.args.get("search")
        board_id = request.args.get("board_id", type=int)
        district = request.args.get("district")
        taluk = request.args.get("taluk")
        occupation = request.args.get("occupation")
        status = request.args.get("status")
        renewal = request.args.get("renewal")
        renewal_status = request.args.get("renewal_status")
        sort_by = request.args.get("sort_by")
        sort_order = request.args.get("sort_order", "desc")
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        # Non-admin users only see their own data
        filter_user_id = None if is_admin else user_id

        result = get_all_workers(
            search=search,
            board_id=board_id,
            district=district,
            taluk=taluk,
            occupation=occupation,
            status=status,
            renewal=renewal,
            renewal_status=renewal_status,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=per_page,
            user_id=filter_user_id,
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/occupations", methods=["GET"])
@login_required
def list_occupations():
    """List distinct occupations."""
    try:
        occupations = get_occupation_list()
        return jsonify({"success": True, "data": occupations})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/districts", methods=["GET"])
@login_required
def list_districts():
    """List distinct districts."""
    try:
        districts = get_district_list()
        return jsonify({"success": True, "data": districts})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/<int:worker_id>", methods=["GET"])
@login_required
def get_worker(worker_id):
    """Get a single worker by ID with all related data."""
    try:
        user_id, is_admin = _get_user_context()
        worker = get_worker_by_id(worker_id)
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404
        # Ownership check: non-admin users can only view their own workers
        if not is_admin and worker.get('created_by_user_id') != user_id:
            return jsonify({"success": False, "error": "Access denied."}), 403
        return jsonify({"success": True, "data": worker})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers", methods=["POST"])
@login_required
def create_new_worker():
    """Create a new worker with optional registration."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        # Validate required fields
        errors = validate_required_fields(data, ["full_name", "date_of_birth", "gender"])
        if data.get("date_of_birth"):
            errors += validate_date(data["date_of_birth"], "date_of_birth")
        if data.get("gender"):
            errors += validate_gender(data["gender"])
        if data.get("mobile_number"):
            errors += validate_mobile_number(data["mobile_number"])

        # Validate date logic
        if data.get("registration_date") and data.get("validity_date"):
            if data["validity_date"] < data["registration_date"]:
                errors.append("'validity_date' must be on or after 'registration_date'.")

        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        # Check duplicate registration number
        if data.get("registration_number"):
            existing = check_duplicate_registration(data["registration_number"])
            if existing:
                return jsonify({
                    "success": False,
                    "error": f"A worker with registration number '{data['registration_number']}' already exists (Worker ID: {existing['worker_id']}).",
                }), 409

        user_id, is_admin = _get_user_context()
        worker = create_worker(data, created_by_user_id=user_id)

        # Create registration if provided
        if worker and data.get("registration_number"):
            from app.database import execute as db_execute
            board_id = data.get("board_id") or (worker.get("board_id") if worker else None)
            if board_id:
                db_execute(
                    """INSERT INTO registrations
                       (worker_id, board_id, registration_number, registration_date,
                        validity_date, renewal_date, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        worker["id"],
                        board_id,
                        data["registration_number"],
                        data.get("registration_date", ""),
                        data.get("validity_date", ""),
                        data.get("renewal_date"),
                        data.get("registration_status", "Active"),
                    ),
                )
                worker = get_worker_by_id(worker["id"])

        return jsonify({"success": True, "data": worker}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/<int:worker_id>", methods=["PUT"])
@login_required
def update_existing_worker(worker_id):
    """Update an existing worker."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        # Check worker exists
        existing = get_worker_by_id(worker_id)
        if not existing:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        # Ownership check
        user_id, is_admin = _get_user_context()
        if not is_admin and existing.get('created_by_user_id') != user_id:
            return jsonify({"success": False, "error": "Access denied."}), 403

        # Validate fields if provided
        errors = []
        if "date_of_birth" in data and data["date_of_birth"]:
            errors += validate_date(data["date_of_birth"], "date_of_birth")
        if "gender" in data and data["gender"]:
            errors += validate_gender(data["gender"])
        if "mobile_number" in data and data["mobile_number"]:
            errors += validate_mobile_number(data["mobile_number"])

        # Check duplicate registration number if changed
        if "registration_number" in data and data["registration_number"]:
            dup = check_duplicate_registration(data["registration_number"], exclude_worker_id=worker_id)
            if dup:
                return jsonify({
                    "success": False,
                    "error": f"A worker with registration number '{data['registration_number']}' already exists (Worker ID: {dup['worker_id']}).",
                }), 409

        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        worker = update_worker(worker_id, data)

        # Update or create registration if registration fields provided
        if data.get("registration_number"):
            from app.database import execute as db_execute, fetch_one as db_fetch_one
            existing_reg = db_fetch_one(
                "SELECT id FROM registrations WHERE worker_id = ? ORDER BY created_at DESC LIMIT 1",
                (worker_id,),
            )
            board_id = data.get("board_id") or (worker.get("board_id") if worker else existing.get("board_id"))
            status = data.get("registration_status", "Active")
            if existing_reg:
                db_execute(
                    """UPDATE registrations SET registration_number=?, registration_date=?,
                       validity_date=?, renewal_date=?, board_id=?, status=?,
                       updated_at=datetime('now')
                       WHERE id=?""",
                    (
                        data["registration_number"],
                        data.get("registration_date", ""),
                        data.get("validity_date", ""),
                        data.get("renewal_date"),
                        board_id,
                        status,
                        existing_reg["id"],
                    ),
                )
            elif board_id:
                db_execute(
                    """INSERT INTO registrations
                       (worker_id, board_id, registration_number, registration_date,
                        validity_date, renewal_date, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        worker_id, board_id, data["registration_number"],
                        data.get("registration_date", ""),
                        data.get("validity_date", ""),
                        data.get("renewal_date"), status,
                    ),
                )
            worker = get_worker_by_id(worker_id)

        return jsonify({"success": True, "data": worker})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/<int:worker_id>", methods=["DELETE"])
@login_required
def delete_existing_worker(worker_id):
    """Soft-delete a worker."""
    try:
        user_id, is_admin = _get_user_context()
        worker = get_worker_by_id(worker_id)
        if worker and not is_admin and worker.get('created_by_user_id') != user_id:
            return jsonify({"success": False, "error": "Access denied."}), 403
        deleted = delete_worker(worker_id)
        if not deleted:
            return jsonify({"success": False, "error": "Worker not found."}), 404
        return jsonify({"success": True, "message": "Worker deleted successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/<int:worker_id>/archive", methods=["POST"])
@login_required
def archive_existing_worker(worker_id):
    """Archive a worker."""
    try:
        archived = archive_worker(worker_id)
        if not archived:
            return jsonify({"success": False, "error": "Worker not found."}), 404
        return jsonify({"success": True, "message": "Worker archived successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@workers_bp.route("/api/workers/<int:worker_id>/unarchive", methods=["POST"])
@login_required
def unarchive_existing_worker(worker_id):
    """Unarchive a worker."""
    try:
        unarchived = unarchive_worker(worker_id)
        if not unarchived:
            return jsonify({"success": False, "error": "Worker not found."}), 404
        return jsonify({"success": True, "message": "Worker unarchived successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
