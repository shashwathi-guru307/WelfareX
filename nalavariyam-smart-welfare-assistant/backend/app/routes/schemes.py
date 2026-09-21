"""
Welfare Scheme API routes — CRUD operations for schemes, categories,
board-specific benefits, qualifications, and rules.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required
from app.services.scheme_service import (
    get_all_schemes, get_scheme_by_id, create_scheme, update_scheme, delete_scheme,
    get_all_scheme_categories, get_scheme_category_by_id,
    create_scheme_category, update_scheme_category,
    get_scheme_benefits, get_scheme_qualifications, get_scheme_rules,
    get_all_boards,
)
from app.utils.validators import validate_required_fields

schemes_bp = Blueprint("schemes", __name__)


# ============================================================
# Scheme Categories
# ============================================================

@schemes_bp.route("/api/scheme-categories", methods=["GET"])
@login_required
def list_scheme_categories():
    """List all active scheme categories."""
    try:
        categories = get_all_scheme_categories()
        return jsonify({"success": True, "data": categories})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/scheme-categories/<int:category_id>", methods=["GET"])
def get_scheme_category(category_id):
    """Get a single scheme category by ID."""
    try:
        category = get_scheme_category_by_id(category_id)
        if not category:
            return jsonify({"success": False, "error": "Category not found."}), 404
        return jsonify({"success": True, "data": category})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/scheme-categories", methods=["POST"])
def create_new_scheme_category():
    """Create a new scheme category."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        errors = validate_required_fields(data, ["name"])
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        category = create_scheme_category(data)
        return jsonify({"success": True, "data": category}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/scheme-categories/<int:category_id>", methods=["PUT"])
def update_existing_scheme_category(category_id):
    """Update an existing scheme category."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        category = update_scheme_category(category_id, data)
        if not category:
            return jsonify({"success": False, "error": "Category not found."}), 404
        return jsonify({"success": True, "data": category})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Welfare Schemes
# ============================================================

@schemes_bp.route("/api/schemes", methods=["GET"])
@login_required
def list_schemes():
    """List welfare schemes with optional filtering."""
    try:
        category_id = request.args.get("category_id", type=int)
        board_id = request.args.get("board_id", type=int)
        search = request.args.get("search")

        schemes = get_all_schemes(
            category_id=category_id, board_id=board_id, search=search,
        )
        return jsonify({"success": True, "data": schemes})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Scheme Benefits (board-specific amounts)
# ============================================================

@schemes_bp.route("/api/schemes/<int:scheme_id>/benefits", methods=["GET"])
def list_scheme_benefits(scheme_id):
    """List board-specific benefits for a scheme."""
    try:
        board_id = request.args.get("board_id", type=int)
        benefits = get_scheme_benefits(scheme_id, board_id=board_id)
        return jsonify({"success": True, "data": benefits})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Scheme Qualifications (education variants, etc.)
# ============================================================

@schemes_bp.route("/api/schemes/<int:scheme_id>/qualifications", methods=["GET"])
def list_scheme_qualifications(scheme_id):
    """List qualification variants for a scheme."""
    try:
        qualifications = get_scheme_qualifications(scheme_id)
        return jsonify({"success": True, "data": qualifications})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Scheme Rules (structured eligibility rules)
# ============================================================

@schemes_bp.route("/api/schemes/<int:scheme_id>/rules", methods=["GET"])
def list_scheme_rules(scheme_id):
    """List structured eligibility rules for a scheme."""
    try:
        rules = get_scheme_rules(scheme_id)
        return jsonify({"success": True, "data": rules})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/schemes/<int:scheme_id>", methods=["GET"])
def get_scheme(scheme_id):
    """Get a single scheme by ID with eligibility rules."""
    try:
        scheme = get_scheme_by_id(scheme_id)
        if not scheme:
            return jsonify({"success": False, "error": "Scheme not found."}), 404
        return jsonify({"success": True, "data": scheme})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/schemes", methods=["POST"])
def create_new_scheme():
    """Create a new welfare scheme."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        errors = validate_required_fields(data, ["name"])
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        scheme = create_scheme(data)
        return jsonify({"success": True, "data": scheme}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/schemes/<int:scheme_id>", methods=["PUT"])
def update_existing_scheme(scheme_id):
    """Update an existing welfare scheme."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        scheme = update_scheme(scheme_id, data)
        if not scheme:
            return jsonify({"success": False, "error": "Scheme not found."}), 404
        return jsonify({"success": True, "data": scheme})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@schemes_bp.route("/api/schemes/<int:scheme_id>", methods=["DELETE"])
def delete_existing_scheme(scheme_id):
    """Soft-delete a welfare scheme."""
    try:
        deleted = delete_scheme(scheme_id)
        if not deleted:
            return jsonify({"success": False, "error": "Scheme not found."}), 404
        return jsonify({"success": True, "message": "Scheme deleted successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
