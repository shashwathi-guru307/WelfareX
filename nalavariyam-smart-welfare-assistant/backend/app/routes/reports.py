"""
Reports API routes — Phase 6 + Phase 14
Provides endpoints for report data generation, CSV export, and statistics.
Phase 14: Per-user data isolation — non-admin users only see their own workers.
"""

import csv
import io
import json
from typing import Optional
from flask import Blueprint, request, jsonify, Response
from app.database import fetch_one, fetch_all
from app.routes.auth import login_required

reports_bp = Blueprint("reports", __name__)


def _get_user_context():
    """Extract user_id and is_admin from the authenticated request."""
    user_id = getattr(request, 'user', {}).get('user_id')
    is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
    return user_id, is_admin


def _wf(user_id: Optional[int]) -> tuple:
    """Return (where_clause_fragment, params) for filtering by user_id."""
    if user_id is not None:
        return "AND w.created_by_user_id = ?", (user_id,)
    return "", ()


# ============================================================
# Comprehensive Statistics
# ============================================================

@reports_bp.route("/api/reports/statistics", methods=["GET"])
@login_required
def report_statistics():
    """Get comprehensive statistics for the Statistics report."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id
        wf, wp = _wf(uid_filter)

        # Applicant stats
        total = fetch_one(
            f"SELECT COUNT(*) as c FROM workers w WHERE w.is_active = 1 {wf}", wp
        )
        active_reg = fetch_one(
            f"SELECT COUNT(*) as c FROM registrations r JOIN workers w ON r.worker_id=w.id WHERE date(r.validity_date) >= date('now') AND w.is_active=1 {wf}", wp
        )
        expired_reg = fetch_one(
            f"SELECT COUNT(*) as c FROM registrations r JOIN workers w ON r.worker_id=w.id WHERE date(r.validity_date) < date('now') AND w.is_active=1 {wf}", wp
        )

        if uid_filter is not None:
            total_family = fetch_one(
                "SELECT COUNT(*) as c FROM family_members WHERE worker_id IN (SELECT id FROM workers WHERE created_by_user_id = ?)",
                (uid_filter,)
            )
        else:
            total_family = fetch_one("SELECT COUNT(*) as c FROM family_members")

        total_schemes = fetch_one("SELECT COUNT(*) as c FROM welfare_schemes WHERE is_active=1")

        if uid_filter is not None:
            pending_reminders = fetch_one(
                "SELECT COUNT(*) as c FROM reminders WHERE status='PENDING' AND (worker_id IS NULL OR worker_id IN (SELECT id FROM workers WHERE created_by_user_id = ?))",
                (uid_filter,)
            )
        else:
            pending_reminders = fetch_one("SELECT COUNT(*) as c FROM reminders WHERE status='PENDING'")

        if uid_filter is not None:
            unread_alerts = fetch_one(
                "SELECT COUNT(*) as c FROM alerts WHERE status='active' AND (worker_id IS NULL OR worker_id IN (SELECT id FROM workers WHERE created_by_user_id = ?))",
                (uid_filter,)
            )
        else:
            unread_alerts = fetch_one("SELECT COUNT(*) as c FROM alerts WHERE status='active'")

        # Board distribution
        boards = fetch_all(f"""
            SELECT wb.name, COUNT(w.id) as count
            FROM welfare_boards wb
            LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1 {wf}
            GROUP BY wb.id, wb.name
            ORDER BY count DESC
        """, wp)

        # District distribution
        districts = fetch_all(f"""
            SELECT COALESCE(district, 'Unknown') as district, COUNT(*) as count
            FROM workers w WHERE w.is_active = 1 {wf}
            GROUP BY district ORDER BY count DESC
        """, wp)

        # Occupation distribution
        occupations = fetch_all(f"""
            SELECT COALESCE(occupation, 'Unknown') as occupation, COUNT(*) as count
            FROM workers w WHERE w.is_active = 1 {wf}
            GROUP BY occupation ORDER BY count DESC
        """, wp)

        return jsonify({
            "success": True,
            "data": {
                "total_applicants": total["c"] if total else 0,
                "active_registrations": active_reg["c"] if active_reg else 0,
                "expired_registrations": expired_reg["c"] if expired_reg else 0,
                "total_family_members": total_family["c"] if total_family else 0,
                "total_schemes": total_schemes["c"] if total_schemes else 0,
                "pending_reminders": pending_reminders["c"] if pending_reminders else 0,
                "unread_alerts": unread_alerts["c"] if unread_alerts else 0,
                "board_distribution": boards,
                "district_distribution": districts,
                "occupation_distribution": occupations,
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Applicant Report
# ============================================================

@reports_bp.route("/api/reports/applicants", methods=["GET"])
@login_required
def applicant_report():
    """Get applicant report data."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id
        wf, wp = _wf(uid_filter)

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        board_id = request.args.get("board_id", type=int)

        conditions = ["w.is_active = 1"]
        params: list = list(wp)

        if board_id:
            conditions.append("w.board_id = ?")
            params.append(board_id)

        if uid_filter is not None:
            conditions.append("w.created_by_user_id = ?")
            params.append(uid_filter)

        where = " AND ".join(conditions)

        count = fetch_one(f"SELECT COUNT(*) as c FROM workers w WHERE {where}", tuple(params))
        total = count["c"] if count else 0

        offset = (page - 1) * per_page
        params.extend([per_page, offset])

        rows = fetch_all(f"""
            SELECT w.id, w.full_name, w.gender, w.date_of_birth, w.mobile_number,
                   w.district, w.taluk, w.village_town, w.occupation, w.worker_category,
                   w.education_level, w.marital_status, w.has_disability,
                   wb.name as board_name,
                   r.registration_number, r.registration_date, r.validity_date, r.status as reg_status,
                   (SELECT COUNT(*) FROM family_members fm WHERE fm.worker_id = w.id) as family_count
            FROM workers w
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            WHERE {where}
            ORDER BY w.created_at DESC
            LIMIT ? OFFSET ?
        """, tuple(params))

        return jsonify({
            "success": True,
            "data": {
                "applicants": rows,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": max(1, -(-total // per_page)),
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Family Report
# ============================================================

@reports_bp.route("/api/reports/family", methods=["GET"])
@login_required
def family_report():
    """Get family members report."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id

        if uid_filter is not None:
            rows = fetch_all("""
                SELECT fm.*, w.full_name as worker_name, wb.name as board_name
                FROM family_members fm
                JOIN workers w ON fm.worker_id = w.id
                LEFT JOIN welfare_boards wb ON w.board_id = wb.id
                WHERE w.created_by_user_id = ?
                ORDER BY w.full_name, fm.name
            """, (uid_filter,))
        else:
            rows = fetch_all("""
                SELECT fm.*, w.full_name as worker_name, wb.name as board_name
                FROM family_members fm
                JOIN workers w ON fm.worker_id = w.id
                LEFT JOIN welfare_boards wb ON w.board_id = wb.id
                ORDER BY w.full_name, fm.name
            """)

        return jsonify({"success": True, "data": {"family_members": rows, "total": len(rows)}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Scheme Report
# ============================================================

@reports_bp.route("/api/reports/schemes", methods=["GET"])
@login_required
def scheme_report():
    """Get scheme statistics report."""
    try:
        rows = fetch_all("""
            SELECT ws.id, ws.name, ws.scheme_code, sc.name as category_name,
                   wb.name as board_name, ws.claimant_type, ws.is_active,
                   (SELECT COUNT(*) FROM scheme_applications sa WHERE sa.scheme_id = ws.id) as application_count,
                   (SELECT COUNT(*) FROM scheme_applications sa WHERE sa.scheme_id = ws.id AND sa.status = 'Approved') as approved_count
            FROM welfare_schemes ws
            LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
            LEFT JOIN welfare_boards wb ON ws.board_id = wb.id
            ORDER BY ws.name
        """)
        return jsonify({"success": True, "data": {"schemes": rows, "total": len(rows)}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Board Statistics
# ============================================================

@reports_bp.route("/api/reports/boards", methods=["GET"])
@login_required
def board_statistics():
    """Get welfare board statistics."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id
        wf, wp = _wf(uid_filter)

        rows = fetch_all(f"""
            SELECT wb.id, wb.name,
                   COUNT(w.id) as worker_count,
                   (SELECT COUNT(*) FROM registrations r WHERE r.board_id = wb.id AND r.status = 'Active') as active_registrations
            FROM welfare_boards wb
            LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1 {wf}
            WHERE wb.is_active = 1
            GROUP BY wb.id, wb.name
            ORDER BY worker_count DESC
        """, wp)
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# District Statistics
# ============================================================

@reports_bp.route("/api/reports/districts", methods=["GET"])
@login_required
def district_statistics():
    """Get district-wise statistics."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id
        wf, wp = _wf(uid_filter)

        rows = fetch_all(f"""
            SELECT COALESCE(district, 'Unknown') as district,
                   COUNT(*) as worker_count,
                   SUM(CASE WHEN has_disability = 1 THEN 1 ELSE 0 END) as disability_count
            FROM workers w
            WHERE w.is_active = 1 {wf}
            GROUP BY district ORDER BY worker_count DESC
        """, wp)
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# CSV Exports
# ============================================================

@reports_bp.route("/api/reports/export/applicants", methods=["GET"])
@login_required
def export_applicants_csv():
    """Export applicants as CSV."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id
        wf, wp = _wf(uid_filter)

        rows = fetch_all(f"""
            SELECT w.full_name, w.gender, w.date_of_birth, w.mobile_number,
                   w.district, w.taluk, w.village_town, w.occupation, w.worker_category,
                   w.education_level, w.marital_status, w.has_disability,
                   wb.name as board_name,
                   r.registration_number, r.validity_date, r.status as reg_status
            FROM workers w
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            WHERE w.is_active = 1 {wf}
            ORDER BY w.full_name
        """, wp)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Name', 'Gender', 'DOB', 'Mobile', 'District', 'Taluk', 'Village',
            'Occupation', 'Category', 'Education', 'Marital Status', 'Disability',
            'Board', 'Reg Number', 'Validity Date', 'Reg Status'
        ])
        for r in rows:
            writer.writerow([
                r.get('full_name', ''), r.get('gender', ''), r.get('date_of_birth', ''),
                r.get('mobile_number', ''), r.get('district', ''), r.get('taluk', ''),
                r.get('village_town', ''), r.get('occupation', ''), r.get('worker_category', ''),
                r.get('education_level', ''), r.get('marital_status', ''),
                'Yes' if r.get('has_disability') else 'No',
                r.get('board_name', ''), r.get('registration_number', ''),
                r.get('validity_date', ''), r.get('reg_status', ''),
            ])

        return Response(
            output.getvalue(), mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=applicants_report.csv'}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route("/api/reports/export/family", methods=["GET"])
@login_required
def export_family_csv():
    """Export family members as CSV."""
    try:
        user_id, is_admin = _get_user_context()
        uid_filter = None if is_admin else user_id

        if uid_filter is not None:
            rows = fetch_all("""
                SELECT w.full_name as worker_name, fm.name, fm.relationship,
                       fm.date_of_birth, fm.gender, fm.education_level,
                       fm.occupation, fm.marital_status, fm.has_disability, fm.is_dependent
                FROM family_members fm
                JOIN workers w ON fm.worker_id = w.id
                WHERE w.created_by_user_id = ?
                ORDER BY w.full_name, fm.name
            """, (uid_filter,))
        else:
            rows = fetch_all("""
                SELECT w.full_name as worker_name, fm.name, fm.relationship,
                       fm.date_of_birth, fm.gender, fm.education_level,
                       fm.occupation, fm.marital_status, fm.has_disability, fm.is_dependent
                FROM family_members fm
                JOIN workers w ON fm.worker_id = w.id
                ORDER BY w.full_name, fm.name
            """)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Worker', 'Name', 'Relationship', 'DOB', 'Gender', 'Education', 'Occupation', 'Marital Status', 'Disability', 'Dependent'])
        for r in rows:
            writer.writerow([
                r.get('worker_name', ''), r.get('name', ''), r.get('relationship', ''),
                r.get('date_of_birth', ''), r.get('gender', ''), r.get('education_level', ''),
                r.get('occupation', ''), r.get('marital_status', ''),
                'Yes' if r.get('has_disability') else 'No',
                'Yes' if r.get('is_dependent') else 'No',
            ])

        return Response(
            output.getvalue(), mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=family_report.csv'}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route("/api/reports/export/schemes", methods=["GET"])
@login_required
def export_schemes_csv():
    """Export schemes as CSV."""
    try:
        rows = fetch_all("""
            SELECT ws.name, ws.scheme_code, sc.name as category,
                   wb.name as board_name, ws.claimant_type, ws.is_active
            FROM welfare_schemes ws
            LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
            LEFT JOIN welfare_boards wb ON ws.board_id = wb.id
            ORDER BY ws.name
        """)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Name', 'Code', 'Category', 'Board', 'Claimant Type', 'Active'])
        for r in rows:
            writer.writerow([
                r.get('name', ''), r.get('scheme_code', ''), r.get('category', ''),
                r.get('board_name', ''), r.get('claimant_type', ''),
                'Yes' if r.get('is_active') else 'No',
            ])

        return Response(
            output.getvalue(), mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=schemes_report.csv'}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
