"""
Phase 4 — Eligibility evaluation API routes.
Phase 14: Added login_required and ownership checks.
Includes the full applicant analysis endpoint and single-scheme evaluation.
"""

from flask import Blueprint, request, jsonify
from app.services.eligibility_service import (
    evaluate_worker_for_scheme,
    analyze_applicant,
)
from app.database import fetch_one, fetch_all
from app.routes.auth import login_required

eligibility_bp = Blueprint("eligibility", __name__)


def _check_worker_ownership(worker_id: int):
    """Check if the current user owns this worker. Returns error dict or None."""
    user_id = getattr(request, 'user', {}).get('user_id')
    is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
    if is_admin:
        return None
    worker = fetch_one(
        "SELECT id FROM workers WHERE id = ? AND is_active = 1",
        (worker_id,),
    )
    if not worker:
        return ({"success": False, "error": "Worker not found."}, 404)
    owner = fetch_one(
        "SELECT created_by_user_id FROM workers WHERE id = ?",
        (worker_id,),
    )
    if owner and owner.get('created_by_user_id') != user_id:
        return ({"success": False, "error": "Access denied. This worker belongs to another user."}, 403)
    return None


@eligibility_bp.route("/api/eligibility/evaluate", methods=["POST"])
@login_required
def evaluate_eligibility():
    """Evaluate a worker's eligibility for a specific scheme."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body is required."}), 400

        worker_id = data.get("worker_id")
        scheme_id = data.get("scheme_id")

        if not worker_id or not scheme_id:
            return jsonify({
                "success": False,
                "error": "Both 'worker_id' and 'scheme_id' are required.",
            }), 400

        err = _check_worker_ownership(int(worker_id))
        if err:
            return jsonify(err[0]), err[1]

        result = evaluate_worker_for_scheme(int(worker_id), int(scheme_id))
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@eligibility_bp.route("/api/eligibility/analyze/<int:worker_id>", methods=["GET"])
@login_required
def analyze_worker_eligibility(worker_id):
    """
    Full eligibility analysis for a worker including all family members.
    Phase 4 — Comprehensive analysis endpoint.
    """
    try:
        err = _check_worker_ownership(worker_id)
        if err:
            return jsonify(err[0]), err[1]

        result = analyze_applicant(worker_id)
        if not result.get("success"):
            return jsonify({"success": False, "error": result.get("error", "Analysis failed.")}), 404
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@eligibility_bp.route("/api/eligibility/worker/<int:worker_id>", methods=["GET"])
@login_required
def evaluate_worker_all_schemes(worker_id):
    """Evaluate a worker's eligibility across all active schemes (backward-compatible)."""
    try:
        err = _check_worker_ownership(worker_id)
        if err:
            return jsonify(err[0]), err[1]

        # Use the full analysis for backward compatibility
        result = analyze_applicant(worker_id)
        if not result.get("success"):
            return jsonify({"success": False, "error": result.get("error", "Analysis failed.")}), 404
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@eligibility_bp.route("/api/eligibility/audit/<int:worker_id>", methods=["GET"])
@login_required
def get_audit_log(worker_id):
    """Get eligibility audit log for a worker."""
    try:
        err = _check_worker_ownership(worker_id)
        if err:
            return jsonify(err[0]), err[1]

        logs = fetch_all(
            "SELECT * FROM eligibility_audit_log WHERE worker_id = ? ORDER BY analysis_date DESC LIMIT 50",
            (worker_id,),
        )
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
