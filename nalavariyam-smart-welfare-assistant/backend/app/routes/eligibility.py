"""
Phase 4 — Eligibility evaluation API routes.
Includes the full applicant analysis endpoint and single-scheme evaluation.
"""

from flask import Blueprint, request, jsonify
from app.services.eligibility_service import (
    evaluate_worker_for_scheme,
    analyze_applicant,
)
from app.database import fetch_one, fetch_all

eligibility_bp = Blueprint("eligibility", __name__)


@eligibility_bp.route("/api/eligibility/evaluate", methods=["POST"])
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

        result = evaluate_worker_for_scheme(int(worker_id), int(scheme_id))
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@eligibility_bp.route("/api/eligibility/analyze/<int:worker_id>", methods=["GET"])
def analyze_worker_eligibility(worker_id):
    """
    Full eligibility analysis for a worker including all family members.
    Phase 4 — Comprehensive analysis endpoint.
    """
    try:
        result = analyze_applicant(worker_id)
        if not result.get("success"):
            return jsonify({"success": False, "error": result.get("error", "Analysis failed.")}), 404
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@eligibility_bp.route("/api/eligibility/worker/<int:worker_id>", methods=["GET"])
def evaluate_worker_all_schemes(worker_id):
    """Evaluate a worker's eligibility across all active schemes (backward-compatible)."""
    try:
        # Use the full analysis for backward compatibility
        result = analyze_applicant(worker_id)
        if not result.get("success"):
            return jsonify({"success": False, "error": result.get("error", "Worker not found.")}), 404

        # Map to legacy format
        evaluations = result.get("worker_results", [])
        legacy_evaluations = []
        for ev in evaluations:
            legacy_evaluations.append({
                "worker_id": worker_id,
                "scheme_id": ev.get("scheme_id"),
                "scheme_name": ev.get("scheme_name"),
                "worker_name": result.get("worker_name"),
                "status": _map_status(ev.get("status", "")),
                "reasons": [ev.get("explanation", "")] if ev.get("explanation") else [],
                "rule_results": ev.get("matched_rules", []) + ev.get("failed_rules", []) + ev.get("missing_information", []),
                "total_rules": len(ev.get("matched_rules", [])) + len(ev.get("failed_rules", [])) + len(ev.get("missing_information", [])),
                "passed_rules": len(ev.get("matched_rules", [])),
                "mandatory_rules": 0,
                "mandatory_passed": 0,
                "disclaimer": ev.get("disclaimer", ""),
            })

        return jsonify({
            "success": True,
            "data": {
                "worker_id": worker_id,
                "worker_name": result.get("worker_name"),
                "evaluations": legacy_evaluations,
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@eligibility_bp.route("/api/eligibility/audit/<int:worker_id>", methods=["GET"])
def get_audit_log(worker_id):
    """Get the eligibility audit log for a worker."""
    try:
        logs = fetch_all(
            """SELECT id, worker_id, analysis_date, engine_version,
                      total_schemes, eligible_count, potential_count,
                      not_eligible, insufficient, family_members_evaluated
               FROM eligibility_audit_log
               WHERE worker_id = ?
               ORDER BY analysis_date DESC
               LIMIT 50""",
            (worker_id,),
        )
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def _map_status(status: str) -> str:
    """Map internal status to display status."""
    mapping = {
        "ELIGIBLE": "Potentially Applicable",
        "POTENTIAL_MATCH": "Potentially Applicable",
        "NOT_ELIGIBLE": "No Current Match",
        "INSUFFICIENT_DATA": "Review Recommended",
    }
    return mapping.get(status, "Review Recommended")
