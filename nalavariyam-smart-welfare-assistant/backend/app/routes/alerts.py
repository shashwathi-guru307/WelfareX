"""
Alerts API routes — Phase 5
Provides endpoints for alert management and renewal intelligence.
"""

from flask import Blueprint, request, jsonify
from app.routes.auth import login_required, admin_required
from app.services.renewal_service import (
    get_alerts, mark_alert_read, mark_alert_resolved, dismiss_alert,
    get_unread_alert_count, get_alert_counts_by_severity,
    generate_renewal_alerts, get_all_workers_renewal_summary,
    get_renewal_breakdown, get_worker_renewal_detail, get_renewal_thresholds,
    mark_renewed, get_renewal_history, get_all_renewal_history,
    auto_generate_reminders_for_all,
)

alerts_bp = Blueprint("alerts", __name__)


# ============================================================
# Alert Endpoints
# ============================================================

@alerts_bp.route("/api/alerts", methods=["GET"])
@login_required
def list_alerts():
    """List alerts with optional filtering."""
    try:
        alert_type = request.args.get("type")
        severity = request.args.get("severity")
        status = request.args.get("status")
        worker_id = request.args.get("worker_id", type=int)
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        user_id = getattr(request, 'user', {}).get('user_id')
        is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
        filter_user_id = None if is_admin else user_id

        result = get_alerts(
            alert_type=alert_type,
            severity=severity,
            status=status,
            worker_id=worker_id,
            page=page,
            per_page=per_page,
            user_id=filter_user_id,
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/alerts/counts", methods=["GET"])
def alert_counts():
    """Get alert counts by severity (for notification badge)."""
    try:
        counts = get_alert_counts_by_severity()
        return jsonify({"success": True, "data": counts})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/alerts/unread-count", methods=["GET"])
def unread_count():
    """Get count of unread/active alerts."""
    try:
        count = get_unread_alert_count()
        return jsonify({"success": True, "data": {"count": count}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/alerts/<int:alert_id>/read", methods=["POST"])
def read_alert(alert_id):
    """Mark an alert as read."""
    try:
        success = mark_alert_read(alert_id)
        if not success:
            return jsonify({"success": False, "error": "Alert not found or already read."}), 404
        return jsonify({"success": True, "message": "Alert marked as read."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/alerts/<int:alert_id>/resolve", methods=["POST"])
def resolve_alert(alert_id):
    """Mark an alert as resolved."""
    try:
        success = mark_alert_resolved(alert_id)
        if not success:
            return jsonify({"success": False, "error": "Alert not found or already resolved."}), 404
        return jsonify({"success": True, "message": "Alert resolved."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/alerts/<int:alert_id>/dismiss", methods=["POST"])
def dismiss_alert_route(alert_id):
    """Dismiss an alert."""
    try:
        success = dismiss_alert(alert_id)
        if not success:
            return jsonify({"success": False, "error": "Alert not found."}), 404
        return jsonify({"success": True, "message": "Alert dismissed."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/alerts/generate", methods=["POST"])
def generate_alerts():
    """Generate/update renewal alerts for all active workers."""
    try:
        count = generate_renewal_alerts()
        return jsonify({"success": True, "data": {"alerts_generated": count}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Renewal Intelligence Endpoints
# ============================================================

@alerts_bp.route("/api/renewals/summary", methods=["GET"])
def renewal_summary():
    """Get renewal summary for all active workers."""
    try:
        summary = get_all_workers_renewal_summary()
        return jsonify({"success": True, "data": summary})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/renewals/breakdown", methods=["GET"])
def renewal_breakdown():
    """Get renewal status breakdown for dashboard."""
    try:
        breakdown = get_renewal_breakdown()
        return jsonify({"success": True, "data": breakdown})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/renewals/worker/<int:worker_id>", methods=["GET"])
def worker_renewal_detail(worker_id):
    """Get detailed renewal status for a specific worker."""
    try:
        detail = get_worker_renewal_detail(worker_id)
        if not detail:
            return jsonify({"success": False, "error": "No registration found for this worker."}), 404
        return jsonify({"success": True, "data": detail})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/renewals/config", methods=["GET"])
def renewal_config():
    """Get current renewal thresholds configuration."""
    try:
        thresholds = get_renewal_thresholds()
        return jsonify({"success": True, "data": thresholds})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# CSV Export
# ============================================================

@alerts_bp.route("/api/renewals/export", methods=["GET"])
def export_renewals_csv():
    """Export renewal data as CSV."""
    try:
        import csv
        import io
        from flask import Response

        board_id = request.args.get("board_id", type=int)
        status_filter = request.args.get("status")

        summary = get_all_workers_renewal_summary()

        # Filter if needed
        if board_id:
            from app.database import fetch_one as fo
            board = fo("SELECT name FROM welfare_boards WHERE id = ?", (board_id,))
            if board:
                summary = [s for s in summary if s.get("board_name") == board["name"]]

        if status_filter:
            summary = [s for s in summary if s.get("computed_status") == status_filter]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Applicant Name", "Board", "District",
            "Registration Date", "Renewal Date", "Validity Date",
            "Days Remaining", "Status", "Urgency"
        ])

        for s in summary:
            writer.writerow([
                s.get("full_name", ""),
                s.get("board_name", ""),
                s.get("district", ""),
                s.get("registration_date", ""),
                s.get("renewal_date", ""),
                s.get("validity_date", ""),
                s.get("days_until_renewal", ""),
                s.get("computed_status", ""),
                s.get("urgency", ""),
            ])

        csv_content = output.getvalue()
        output.close()

        return Response(
            csv_content,
            mimetype="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=renewal_report.csv",
            },
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Automated Daily Check (manual trigger)
# ============================================================

@alerts_bp.route("/api/renewals/daily-check", methods=["POST"])
def daily_check():
    """Run automated daily renewal check.
    Generates alerts, logs activities. Can later be connected to a scheduler.
    """
    try:
        from app.services.activity_service import log_activity

        # 1. Generate/update renewal alerts
        alerts_count = generate_renewal_alerts()

        # 2. Get breakdown
        breakdown = get_renewal_breakdown()

        # 3. Log activity for workers with critical/high urgency
        summary = get_all_workers_renewal_summary()
        critical_workers = [s for s in summary if s.get("urgency") in ("CRITICAL", "HIGH")]

        for w in critical_workers:
            try:
                log_activity(
                    worker_id=w["worker_id"],
                    activity_type="renewal_alert_generated",
                    title=f"Renewal alert: {w.get('computed_status', 'Unknown')}",
                    description=f"Days: {w.get('days_until_renewal', 'N/A')} | Urgency: {w.get('urgency', 'N/A')}",
                )
            except Exception:
                pass  # Don't fail the whole check if one activity log fails

        return jsonify({
            "success": True,
            "data": {
                "alerts_generated": alerts_count,
                "breakdown": breakdown,
                "critical_workers_count": len(critical_workers),
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Mark as Renewed (Phase 12)
# ============================================================

@alerts_bp.route("/api/renewals/worker/<int:worker_id>/renew", methods=["POST"])
def renew_registration(worker_id):
    """Mark a worker's registration as renewed."""
    try:
        data = request.get_json() or {}
        new_validity = data.get("new_validity_date")
        if not new_validity:
            return jsonify({"success": False, "error": "new_validity_date is required."}), 400

        result = mark_renewed(
            worker_id=worker_id,
            new_validity_date=new_validity,
            performed_by=data.get("performed_by", "Staff"),
            notes=data.get("notes"),
        )
        if not result or "error" in result:
            return jsonify({"success": False, "error": result.get("error", "Renewal failed.")}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/renewals/history", methods=["GET"])
def all_renewal_history():
    """Get all renewal history records."""
    try:
        history = get_all_renewal_history()
        return jsonify({"success": True, "data": history})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/renewals/worker/<int:worker_id>/history", methods=["GET"])
def worker_renewal_history(worker_id):
    """Get renewal history for a specific worker."""
    try:
        history = get_renewal_history(worker_id)
        return jsonify({"success": True, "data": history})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/renewals/auto-reminders", methods=["POST"])
def auto_reminders():
    """Auto-generate reminders for all active workers' upcoming renewals."""
    try:
        result = auto_generate_reminders_for_all()
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Mark All Read (Phase 12)
# ============================================================

@alerts_bp.route("/api/alerts/mark-all-read", methods=["POST"])
def mark_all_alerts_read():
    """Mark all active alerts as read."""
    try:
        from app.database import execute as db_execute
        rows = db_execute(
            """UPDATE alerts SET status = 'read', read_at = datetime('now')
               WHERE status = 'active'"""
        )
        return jsonify({"success": True, "data": {"marked_read": rows}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# SMS Status & Test
# ============================================================

@alerts_bp.route("/api/sms/status", methods=["GET"])
@login_required
def sms_status():
    """Check SMS configuration status."""
    try:
        from app.services.sms_service import is_sms_configured, get_twilio_phone_number
        configured = is_sms_configured()
        phone = get_twilio_phone_number() if configured else None
        return jsonify({
            "success": True,
            "data": {
                "configured": configured,
                "twilio_phone": phone,
                "message": "SMS is configured and ready." if configured else "SMS is NOT configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to backend .env file.",
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@alerts_bp.route("/api/sms/test", methods=["POST"])
@login_required
def test_sms():
    """Send a test SMS to a specific number."""
    try:
        from app.services.sms_service import send_sms, is_sms_configured

        data = request.get_json() or {}
        phone = data.get("phone", "").strip()

        if not phone:
            return jsonify({"success": False, "error": "Phone number is required."}), 400

        if not is_sms_configured():
            return jsonify({
                "success": False,
                "error": "SMS is not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to the backend .env file and restart the server.",
            }), 400

        result = send_sms(phone, "Nalavariyam Welfare Assistant: This is a test SMS. If you received this, SMS notifications are working correctly!")
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Bulk Notify Eligible Workers
# ============================================================
@alerts_bp.route("/api/alerts/notify-eligible", methods=["POST"])
@login_required
def notify_eligible_workers():
    """
    Run eligibility analysis for ALL active workers and send
    a notification (alert) + real SMS to each worker who is
    eligible or potentially eligible for at least one welfare scheme.

    Returns a summary of how many workers were notified, SMS sent,
    and which schemes matched.
    """
    try:
        from app.database import fetch_all, execute as db_execute
        from app.services.eligibility_service import analyze_applicant
        from app.services.sms_service import send_sms, is_sms_configured
        import json

        data = request.get_json() or {}
        message_template = data.get("message", "You may be eligible for welfare scheme benefits. Please check your eligibility details.")
        send_sms_enabled = data.get("send_sms", True)  # Can be toggled off

        sms_configured = is_sms_configured()

        # Fetch all active workers (include mobile_number for SMS)
        workers = fetch_all(
            "SELECT id, full_name, board_id, mobile_number FROM workers WHERE is_active = 1 AND is_archived = 0"
        )

        if not workers:
            return jsonify({"success": True, "data": {"message": "No active workers found.", "notified": 0, "skipped": 0}})

        notified_count = 0
        skipped_count = 0
        sms_sent_count = 0
        sms_failed_count = 0
        sms_skipped_count = 0
        notified_workers = []
        error_count = 0

        for worker in workers:
            worker_id = worker["id"]
            worker_name = worker["full_name"]
            mobile_number = worker.get("mobile_number") or ""

            try:
                # Run full eligibility analysis for this worker
                analysis = analyze_applicant(worker_id)

                if not analysis.get("success"):
                    skipped_count += 1
                    continue

                # Collect eligible/potential schemes
                eligible_schemes = []
                for result in analysis.get("worker_results", []):
                    status = result.get("status", "")
                    if status in ("ELIGIBLE", "POTENTIAL_MATCH"):
                        eligible_schemes.append({
                            "scheme_name": result.get("scheme_name", "Unknown Scheme"),
                            "status": status,
                            "explanation": result.get("explanation", ""),
                        })

                # Also check family member eligibility
                for fm in analysis.get("family_results", []):
                    for result in fm.get("results", []):
                        status = result.get("status", "")
                        if status in ("ELIGIBLE", "POTENTIAL_MATCH"):
                            eligible_schemes.append({
                                "scheme_name": result.get("scheme_name", "Unknown Scheme"),
                                "status": status,
                                "claimant": (fm.get("family_member") or {}).get("name", "Family Member"),
                                "explanation": result.get("explanation", ""),
                            })

                if not eligible_schemes:
                    skipped_count += 1
                    continue

                # Build scheme list
                scheme_names = list(set(s["scheme_name"] for s in eligible_schemes))
                scheme_list = ", ".join(scheme_names[:5])
                if len(scheme_names) > 5:
                    scheme_list += f" and {len(scheme_names) - 5} more"

                # Build in-app notification message
                notification_message = (
                    f"{message_template}\n\n"
                    f"Eligible schemes: {scheme_list}\n"
                    f"Total matching schemes: {len(eligible_schemes)}"
                )

                # Check if there's already an unread notification of this type for this worker today
                existing = fetch_all(
                    """SELECT id FROM alerts
                       WHERE worker_id = ?
                         AND type = 'eligibility_match'
                         AND status = 'active'
                         AND date(created_at) = date('now')""",
                    (worker_id,),
                )

                if existing:
                    skipped_count += 1
                    continue

                # Insert the in-app alert/notification
                db_execute(
                    """INSERT INTO alerts
                       (worker_id, type, title, message, severity, status, metadata)
                       VALUES (?, 'eligibility_match', ?, ?, 'medium', 'active', ?)""",
                    (
                        worker_id,
                        f"Eligibility Match: {scheme_list}",
                        notification_message,
                        json.dumps({
                            "eligible_schemes": eligible_schemes,
                            "total_eligible": len(eligible_schemes),
                            "bulk_notification": True,
                        }),
                    ),
                )

                notified_count += 1
                worker_info = {
                    "worker_id": worker_id,
                    "worker_name": worker_name,
                    "eligible_schemes": len(eligible_schemes),
                    "scheme_names": scheme_names,
                    "sms_sent": False,
                    "sms_error": None,
                }

                # --- Send real SMS if configured and enabled ---
                if sms_configured and send_sms_enabled and mobile_number:
                    sms_text = (
                        f"Nalavariyam Welfare Alert\n\n"
                        f"Dear {worker_name},\n\n"
                        f"You are eligible for the following welfare scheme(s):\n"
                        f"{scheme_list}\n\n"
                        f"Please contact your welfare office for more details.\n\n"
                        f"- Nalavariyam Smart Welfare Assistant"
                    )
                    sms_result = send_sms(mobile_number, sms_text)
                    if sms_result.get("success"):
                        sms_sent_count += 1
                        worker_info["sms_sent"] = True
                        worker_info["sms_sid"] = sms_result.get("message_sid")
                    else:
                        sms_failed_count += 1
                        worker_info["sms_error"] = sms_result.get("error", "Unknown error")
                elif not mobile_number:
                    sms_skipped_count += 1
                    worker_info["sms_error"] = "No mobile number on file"

                notified_workers.append(worker_info)

            except Exception as e:
                error_count += 1
                continue

        return jsonify({
            "success": True,
            "data": {
                "notified": notified_count,
                "skipped": skipped_count,
                "errors": error_count,
                "total_workers": len(workers),
                "sms_configured": sms_configured,
                "sms_sent": sms_sent_count,
                "sms_failed": sms_failed_count,
                "sms_skipped": sms_skipped_count,
                "notified_workers": notified_workers,
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
