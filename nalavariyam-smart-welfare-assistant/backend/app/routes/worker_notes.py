"""
Worker Notes API routes — Phase 11.
Notes, duplicate checks, and last-reviewed tracking for applicants.
"""

from flask import Blueprint, request, jsonify
from app.database import fetch_one, fetch_all, execute

worker_notes_bp = Blueprint("worker_notes", __name__)


@worker_notes_bp.route("/api/workers/<int:worker_id>/notes", methods=["GET"])
def list_worker_notes(worker_id):
    """List all notes for a worker."""
    try:
        worker = fetch_one("SELECT id FROM workers WHERE id = ?", (worker_id,))
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404
        notes = fetch_all(
            "SELECT * FROM worker_notes WHERE worker_id = ? ORDER BY created_at DESC",
            (worker_id,),
        )
        return jsonify({"success": True, "data": notes})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@worker_notes_bp.route("/api/workers/<int:worker_id>/notes", methods=["POST"])
def create_worker_note(worker_id):
    """Create a new note for a worker."""
    try:
        worker = fetch_one("SELECT id FROM workers WHERE id = ?", (worker_id,))
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        content = (data.get("content") or "").strip()
        if not content:
            return jsonify({"success": False, "errors": ["Note content is required."]}), 400

        author = (data.get("author") or "Staff").strip()
        is_internal = 1 if data.get("is_internal", True) else 0

        note_id = execute(
            "INSERT INTO worker_notes (worker_id, content, author, is_internal) VALUES (?, ?, ?, ?)",
            (worker_id, content, author, is_internal),
        )
        note = fetch_one("SELECT * FROM worker_notes WHERE id = ?", (note_id,))

        # Update last reviewed
        execute(
            "UPDATE workers SET last_reviewed_at = datetime('now'), last_reviewed_by = ?, updated_at = datetime('now') WHERE id = ?",
            (author, worker_id),
        )

        # Log activity
        import json as _json
        execute(
            "INSERT INTO activity_log (worker_id, activity_type, title, description, metadata) VALUES (?, ?, ?, ?, ?)",
            (worker_id, "other", f"Note added by {author}", content[:120], _json.dumps({"author": author})),
        )

        return jsonify({"success": True, "data": note}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@worker_notes_bp.route("/api/worker-notes/<int:note_id>", methods=["PUT"])
def update_worker_note(note_id):
    """Update a worker note."""
    try:
        existing = fetch_one("SELECT * FROM worker_notes WHERE id = ?", (note_id,))
        if not existing:
            return jsonify({"success": False, "error": "Note not found."}), 404

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        content = (data.get("content") or "").strip()
        if not content:
            return jsonify({"success": False, "errors": ["Note content is required."]}), 400

        execute(
            "UPDATE worker_notes SET content = ?, updated_at = datetime('now') WHERE id = ?",
            (content, note_id),
        )
        note = fetch_one("SELECT * FROM worker_notes WHERE id = ?", (note_id,))
        return jsonify({"success": True, "data": note})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@worker_notes_bp.route("/api/worker-notes/<int:note_id>", methods=["DELETE"])
def delete_worker_note(note_id):
    """Delete a worker note."""
    try:
        existing = fetch_one("SELECT * FROM worker_notes WHERE id = ?", (note_id,))
        if not existing:
            return jsonify({"success": False, "error": "Note not found."}), 404
        execute("DELETE FROM worker_notes WHERE id = ?", (note_id,))
        return jsonify({"success": True, "message": "Note deleted successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@worker_notes_bp.route("/api/workers/<int:worker_id>/last-reviewed", methods=["POST"])
def update_last_reviewed(worker_id):
    """Mark a worker as reviewed by the current user."""
    try:
        worker = fetch_one("SELECT id FROM workers WHERE id = ?", (worker_id,))
        if not worker:
            return jsonify({"success": False, "error": "Worker not found."}), 404

        data = request.get_json() or {}
        author = (data.get("author") or "Staff").strip()

        execute(
            "UPDATE workers SET last_reviewed_at = datetime('now'), last_reviewed_by = ?, updated_at = datetime('now') WHERE id = ?",
            (author, worker_id),
        )
        return jsonify({"success": True, "message": "Last reviewed updated."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@worker_notes_bp.route("/api/workers/<int:worker_id>/check-duplicate-family", methods=["POST"])
def check_duplicate_family(worker_id):
    """Check for likely duplicate family members before adding."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        name = (data.get("name") or "").strip().lower()
        dob = (data.get("date_of_birth") or "").strip()
        relationship = (data.get("relationship") or "").strip()

        if not name:
            return jsonify({"success": True, "data": {"duplicates": []}})

        conditions = ["worker_id = ?", "LOWER(name) = ?"]
        params = [worker_id, name]

        if dob:
            conditions.append("date_of_birth = ?")
            params.append(dob)
        if relationship:
            conditions.append("LOWER(relationship) = ?")
            params.append(relationship.lower())

        where = " AND ".join(conditions)
        duplicates = fetch_all(
            f"SELECT id, name, relationship, date_of_birth FROM family_members WHERE {where}",
            tuple(params),
        )

        return jsonify({"success": True, "data": {"duplicates": duplicates}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
