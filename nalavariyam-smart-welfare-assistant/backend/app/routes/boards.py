"""
Welfare Board API routes — CRUD operations for boards.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required
from app.services.board_service import (
    get_all_boards, get_board_by_id, create_board, update_board, delete_board,
)
from app.utils.validators import validate_required_fields

boards_bp = Blueprint("boards", __name__)


@boards_bp.route("/api/boards", methods=["GET"])
@login_required
def list_boards():
    """List all active welfare boards."""
    try:
        boards = get_all_boards()
        return jsonify({"success": True, "data": boards})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@boards_bp.route("/api/boards/<int:board_id>", methods=["GET"])
def get_board(board_id):
    """Get a single welfare board by ID."""
    try:
        board = get_board_by_id(board_id)
        if not board:
            return jsonify({"success": False, "error": "Board not found."}), 404
        return jsonify({"success": True, "data": board})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@boards_bp.route("/api/boards", methods=["POST"])
def create_new_board():
    """Create a new welfare board."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        errors = validate_required_fields(data, ["name"])
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        board = create_board(data)
        return jsonify({"success": True, "data": board}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@boards_bp.route("/api/boards/<int:board_id>", methods=["PUT"])
def update_existing_board(board_id):
    """Update an existing welfare board."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        board = update_board(board_id, data)
        if not board:
            return jsonify({"success": False, "error": "Board not found."}), 404
        return jsonify({"success": True, "data": board})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@boards_bp.route("/api/boards/<int:board_id>", methods=["DELETE"])
def delete_existing_board(board_id):
    """Soft-delete a welfare board."""
    try:
        deleted = delete_board(board_id)
        if not deleted:
            return jsonify({"success": False, "error": "Board not found."}), 404
        return jsonify({"success": True, "message": "Board deleted successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
