"""
Reports API routes — Phase 6
Provides endpoints for report data generation, CSV export, and statistics.
"""

import csv
import io
import json
from flask import Blueprint, request, jsonify, Response
from app.database import fetch_one, fetch_all

reports_bp = Blueprint("reports", __name__)


# ============================================================
# Comprehensive Statistics
# ============================================================

@reports_bp.route("/api/reports/statistics", methods=["GET"])
def report_statistics():
    """Get comprehensive statistics for the Statistics report."""
    try:
        # Applicant stats
        total = fetch_one("SELECT COUNT(*) as c FROM workers WHERE is_active = 1")
        active_reg = fetch_one(
            "SELECT COUNT(*) as c FROM registrations r JOIN workers w ON r.worker_id=w.id WHERE r.validity_date >= date('now') AND w.is_active=1"
        )
        expired_reg = fetch_one(
            "SELECT COUNT(*) as c FROM registrations r JOIN workers w ON r.worker_id=w.id WHERE r.validity_date < date('now') AND w.is_active=1"
        )
        total_family = fetch_one("SELECT COUNT(*) as c FROM family_members")
        total_schemes = fetch_one("SELECT COUNT(*) as c FROM welfare_schemes WHERE is_active=1")
        pending_reminders = fetch_one("SELECT COUNT(*) as c FROM reminders WHERE status='PENDING'")
        unread_alerts = fetch_one("SELECT COUNT(*) as c FROM alerts WHERE status='active'")

        # Board distribution
        boards = fetch_all("""
            SELECT wb.name, COUNT(w.id) as count
            FROM welfare_boards wb
            LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1
            GROUP BY wb.id, wb.name
            ORDER BY count DESC
        """)

        # District distribution
        districts = fetch_all("""
            SELECT COALESCE(district, 'Unknown') as district, COUNT(*) as count
            FROM workers WHERE is_active = 1
            GROUP BY district ORDER BY count DESC
        """)

        # Nature of work distribution
        occupations = fetch_all("""
            SELECT COALESCE(occupation, 'Unknown') as occupation, COUNT(*) as count
            FROM workers WHERE is_active = 1
            GROUP BY occupation ORDER BY count DESC
        """)

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
                "board_distribution": [{"name": b["name"], "count": b["count"]} for b in boards],
                "district_distribution": [{"district": d["district"], "count": d["count"]} for d in districts],
                "occupation_distribution": [{"occupation": o["occupation"], "count": o["count"]} for o in occupations],
            },
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Applicant Report Data
# ============================================================

@reports_bp.route("/api/reports/applicants", methods=["GET"])
def applicant_report():
    """Get all applicants with registration details for report generation."""
    try:
        board_id = request.args.get("board_id", type=int)
        district = request.args.get("district")
        search = request.args.get("search")

        conditions = ["w.is_active = 1"]
        params = []

        if board_id:
            conditions.append("w.board_id = ?")
            params.append(board_id)
        if district:
            conditions.append("w.district = ?")
            params.append(district)
        if search:
            conditions.append("(w.full_name LIKE ? OR w.mobile_number LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])

        where = " AND ".join(conditions)

        workers = fetch_all(f"""
            SELECT w.*, wb.name as board_name,
                   r.registration_number, r.registration_date, r.validity_date, r.renewal_date, r.status as reg_status
            FROM workers w
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            WHERE {where}
            ORDER BY w.full_name
        """, tuple(params))

        # Enrich with age
        from datetime import date, datetime
        result = []
        for w in workers:
            entry = dict(w)
            try:
                dob = datetime.strptime(w["date_of_birth"], "%Y-%m-%d").date()
                today = date.today()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                entry["age"] = age
            except (ValueError, TypeError):
                entry["age"] = None
            result.append(entry)

        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Family Member Report Data
# ============================================================

@reports_bp.route("/api/reports/family", methods=["GET"])
def family_report():
    """Get all family members for report generation."""
    try:
        members = fetch_all("""
            SELECT fm.*, w.full_name as worker_name, wb.name as board_name
            FROM family_members fm
            JOIN workers w ON fm.worker_id = w.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            LEFT JOIN welfare_boards wb ON r.board_id = wb.id
            WHERE w.is_active = 1
            ORDER BY w.full_name, fm.name
        """)

        from datetime import date, datetime
        result = []
        for m in members:
            entry = dict(m)
            try:
                dob = datetime.strptime(m["date_of_birth"], "%Y-%m-%d").date()
                today = date.today()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                entry["age"] = age
            except (ValueError, TypeError):
                entry["age"] = None
            result.append(entry)

        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Scheme Report Data
# ============================================================

@reports_bp.route("/api/reports/schemes", methods=["GET"])
def scheme_report():
    """Get all schemes with benefits and rules for report generation."""
    try:
        schemes = fetch_all("""
            SELECT ws.*, sc.name as category_name, wb.name as board_name
            FROM welfare_schemes ws
            LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
            LEFT JOIN welfare_boards wb ON ws.board_id = wb.id
            WHERE ws.is_active = 1
            ORDER BY sc.name, ws.name
        """)

        result = []
        for s in schemes:
            entry = dict(s)
            # Get benefits count
            bc = fetch_one(
                "SELECT COUNT(*) as c FROM scheme_benefits WHERE scheme_id = ? AND is_available = 1",
                (s["id"],),
            )
            entry["benefit_count"] = bc["c"] if bc else 0

            # Get qualification count
            qc = fetch_one(
                "SELECT COUNT(*) as c FROM scheme_qualifications WHERE scheme_id = ? AND is_active = 1",
                (s["id"],),
            )
            entry["qualification_count"] = qc["c"] if qc else 0

            # Get rules count
            rc = fetch_one(
                "SELECT COUNT(*) as c FROM scheme_rules WHERE scheme_id = ? AND is_active = 1",
                (s["id"],),
            )
            entry["rule_count"] = rc["c"] if rc else 0

            result.append(entry)

        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Board Statistics Report
# ============================================================

@reports_bp.route("/api/reports/board-stats", methods=["GET"])
def board_statistics():
    """Get detailed statistics per welfare board."""
    try:
        boards = fetch_all("""
            SELECT wb.id, wb.name,
                   COUNT(DISTINCT w.id) as total_workers,
                   COUNT(DISTINCT CASE WHEN r.validity_date >= date('now') THEN w.id END) as active,
                   COUNT(DISTINCT CASE WHEN r.validity_date < date('now') THEN w.id END) as expired,
                   COUNT(DISTINCT fm.id) as family_members
            FROM welfare_boards wb
            LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1
            LEFT JOIN registrations r ON w.id = r.worker_id
            LEFT JOIN family_members fm ON w.id = fm.worker_id
            GROUP BY wb.id, wb.name
            ORDER BY total_workers DESC
        """)

        return jsonify({"success": True, "data": [dict(b) for b in boards]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# District Statistics Report
# ============================================================

@reports_bp.route("/api/reports/district-stats", methods=["GET"])
def district_statistics():
    """Get statistics per district."""
    try:
        districts = fetch_all("""
            SELECT COALESCE(w.district, 'Unknown') as district,
                   COUNT(DISTINCT w.id) as total_workers,
                   COUNT(DISTINCT CASE WHEN r.validity_date >= date('now') THEN w.id END) as active,
                   COUNT(DISTINCT CASE WHEN r.validity_date < date('now') THEN w.id END) as expired,
                   COUNT(DISTINCT fm.id) as family_members
            FROM workers w
            LEFT JOIN registrations r ON w.id = r.worker_id
            LEFT JOIN family_members fm ON w.id = fm.worker_id
            WHERE w.is_active = 1
            GROUP BY w.district
            ORDER BY total_workers DESC
        """)

        return jsonify({"success": True, "data": [dict(d) for d in districts]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# CSV Export Endpoints
# ============================================================

@reports_bp.route("/api/reports/export/applicants", methods=["GET"])
def export_applicants_csv():
    """Export applicants as CSV."""
    try:
        # Reuse the applicant report logic
        workers = fetch_all("""
            SELECT w.full_name, w.father_husband_name, w.gender, w.date_of_birth,
                   w.mobile_number, w.district, w.taluk, w.village_town, w.pincode,
                   w.nature_of_work, w.occupation, w.worker_category, w.education_level,
                   w.marital_status, wb.name as board_name,
                   r.registration_number, r.registration_date, r.validity_date, r.renewal_date
            FROM workers w
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            WHERE w.is_active = 1
            ORDER BY w.full_name
        """)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Name", "Father/Husband", "Gender", "DOB", "Phone",
            "District", "Taluk", "Village/Town", "Pincode",
            "Board", "Nature of Work", "Occupation", "Category",
            "Education", "Marital Status", "Reg Number", "Reg Date",
            "Renewal Date", "Validity"
        ])
        for w in workers:
            writer.writerow([w[k] for k in [
                "full_name", "father_husband_name", "gender", "date_of_birth", "mobile_number",
                "district", "taluk", "village_town", "pincode",
                "board_name", "nature_of_work", "occupation", "worker_category",
                "education_level", "marital_status", "registration_number", "registration_date",
                "renewal_date", "validity_date"
            ]])

        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=applicants_report.csv"},
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route("/api/reports/export/family", methods=["GET"])
def export_family_csv():
    """Export family members as CSV."""
    try:
        members = fetch_all("""
            SELECT w.full_name as worker_name, fm.name, fm.relationship,
                   fm.date_of_birth, fm.gender, fm.education_level, fm.occupation,
                   fm.is_dependent, fm.is_employed, fm.has_disability,
                   wb.name as board_name
            FROM family_members fm
            JOIN workers w ON fm.worker_id = w.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            LEFT JOIN welfare_boards wb ON r.board_id = wb.id
            WHERE w.is_active = 1
            ORDER BY w.full_name, fm.name
        """)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Worker", "Family Member", "Relationship", "DOB", "Gender",
                         "Education", "Occupation", "Dependent", "Employed", "Disability", "Board"])
        for m in members:
            writer.writerow([m["worker_name"], m["name"], m["relationship"], m["date_of_birth"],
                             m["gender"], m["education_level"] or "", m["occupation"] or "",
                             "Yes" if m["is_dependent"] else "No",
                             "Yes" if m["is_employed"] else "No",
                             "Yes" if m["has_disability"] else "No",
                             m["board_name"] or ""])

        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=family_report.csv"},
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route("/api/reports/export/schemes", methods=["GET"])
def export_schemes_csv():
    """Export schemes as CSV."""
    try:
        schemes = fetch_all("""
            SELECT ws.name, sc.name as category_name, ws.claimant_type,
                   ws.amount_details, ws.eligibility_summary,
                   ws.qualification_text, ws.is_active
            FROM welfare_schemes ws
            LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
            WHERE ws.is_active = 1
            ORDER BY sc.name, ws.name
        """)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Scheme Name", "Category", "Claimant Type", "Amount", "Eligibility", "Qualification"])
        for s in schemes:
            writer.writerow([s["name"], s["category_name"] or "", s["claimant_type"] or "",
                             s["amount_details"] or "", s["eligibility_summary"] or "",
                             s["qualification_text"] or ""])

        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=schemes_report.csv"},
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
