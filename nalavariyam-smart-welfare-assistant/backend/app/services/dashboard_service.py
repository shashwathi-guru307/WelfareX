"""
Dashboard service — provides aggregated statistics for the admin dashboard.
Phase 5 enhanced with detailed renewal intelligence breakdown.
Phase 14: Per-user data isolation — non-admin users only see their own workers.
All statistics are computed from real database data.
"""

from datetime import date, timedelta
from typing import Optional
from app.database import fetch_one, fetch_all
from app.services.renewal_service import get_renewal_bucket, get_renewal_breakdown, get_alert_counts_by_severity


def get_dashboard_stats(user_id: Optional[int] = None) -> dict:
    """Return comprehensive dashboard statistics from the database.
    
    If user_id is provided, only counts workers owned by that user.
    Admin (no user_id filter) sees everything.
    """
    # Build the worker filter condition
    worker_filter = ""
    family_filter = ""
    params: list = []
    
    if user_id is not None:
        worker_filter = "AND w.created_by_user_id = ?"
        params.append(user_id)
        family_params = [user_id]
    else:
        family_params = []

    # Total workers
    total_workers = fetch_one(
        f"SELECT COUNT(*) as count FROM workers w WHERE w.is_active = 1 AND w.is_archived = 0 {worker_filter}",
        tuple(params),
    )
    
    # Family members (filtered by owner's workers)
    if user_id is not None:
        total_family = fetch_one(
            "SELECT COUNT(*) as count FROM family_members WHERE worker_id IN (SELECT id FROM workers WHERE is_active = 1 AND created_by_user_id = ?)",
            (user_id,),
        )
    else:
        total_family = fetch_one(
            "SELECT COUNT(*) as count FROM family_members WHERE worker_id IN (SELECT id FROM workers WHERE is_active = 1)"
        )

    # Registration statuses (via workers owned by user)
    if user_id is not None:
        reg_filter = "AND r.worker_id IN (SELECT id FROM workers WHERE created_by_user_id = ?)"
        reg_params = (user_id,)
    else:
        reg_filter = ""
        reg_params = ()

    # Registration statuses in a single grouped query (avoids 5 round-trips
    # on high-latency links such as Neon PostgreSQL)
    reg_status_rows = fetch_all(
        f"SELECT status, COUNT(*) as count FROM registrations r WHERE 1=1 {reg_filter} GROUP BY status",
        reg_params,
    )
    _reg_counts = {row["status"]: (row["count"] or 0) for row in reg_status_rows}
    active_registrations = {"count": _reg_counts.get("Active", 0)}
    renewal_due = {"count": _reg_counts.get("Renewal Due", 0)}
    expiring_soon = {"count": _reg_counts.get("Expiring Soon", 0)}
    expired_registrations = {"count": _reg_counts.get("Expired", 0)}
    pending_verification = {"count": _reg_counts.get("Pending Verification", 0)}

    # Renewal buckets based on actual dates — single CASE-grouped query
    # (was 4 separate round-trips, which is slow on high-latency links)
    today = date.today()
    _d7 = (today + timedelta(days=7)).isoformat()
    _d30 = (today + timedelta(days=30)).isoformat()
    _d90 = (today + timedelta(days=90)).isoformat()
    if user_id is not None:
        rows = fetch_all(
            """SELECT
                 CASE
                   WHEN validity_date < ? THEN 'overdue'
                   WHEN validity_date <= ? THEN 'd7'
                   WHEN validity_date <= ? THEN 'd30'
                   WHEN validity_date <= ? THEN 'd90'
                 END AS bucket,
                 COUNT(*) as count
               FROM registrations
               WHERE validity_date IS NOT NULL AND status != 'Expired'
                 AND worker_id IN (SELECT id FROM workers WHERE created_by_user_id = ?)
                 AND validity_date < ?
               GROUP BY bucket""",
            (today.isoformat(), _d7, _d30, _d90, user_id, _d90),
        )
    else:
        rows = fetch_all(
            """SELECT
                 CASE
                   WHEN validity_date < ? THEN 'overdue'
                   WHEN validity_date <= ? THEN 'd7'
                   WHEN validity_date <= ? THEN 'd30'
                   WHEN validity_date <= ? THEN 'd90'
                 END AS bucket,
                 COUNT(*) as count
               FROM registrations
               WHERE validity_date IS NOT NULL AND status != 'Expired' AND validity_date < ?
               GROUP BY bucket""",
            (today.isoformat(), _d7, _d30, _d90, _d90),
        )
    _buckets = {row["bucket"]: (row["count"] or 0) for row in rows}
    renewals_7d = {"count": _buckets.get("d7", 0)}
    renewals_30d = {"count": _buckets.get("d30", 0)}
    renewals_90d = {"count": _buckets.get("d90", 0)}
    overdue = {"count": _buckets.get("overdue", 0)}

    # Phase 5: Detailed renewal breakdown
    renewal_breakdown = get_renewal_breakdown(user_id=user_id)

    # Phase 5: Alert severity counts
    alert_counts = get_alert_counts_by_severity(user_id=user_id)

    # Potential scheme matches: active workers with active registrations
    if user_id is not None:
        potential_matches = fetch_one("""
            SELECT COUNT(DISTINCT w.id) as count
            FROM workers w
            INNER JOIN registrations r ON w.id = r.worker_id
            WHERE w.is_active = 1 AND w.is_archived = 0
            AND r.status = 'Active'
            AND w.id NOT IN (SELECT worker_id FROM scheme_applications)
            AND w.created_by_user_id = ?
        """, (user_id,))
    else:
        potential_matches = fetch_one("""
            SELECT COUNT(DISTINCT w.id) as count
            FROM workers w
            INNER JOIN registrations r ON w.id = r.worker_id
            WHERE w.is_active = 1 AND w.is_archived = 0
            AND r.status = 'Active'
            AND w.id NOT IN (SELECT worker_id FROM scheme_applications)
        """)

    # Pending reviews (expired + renewal due + pending verification)
    pending_reviews = (renewal_due["count"] or 0) + (expired_registrations["count"] or 0) + (pending_verification["count"] or 0)

    # Recently added workers
    if user_id is not None:
        recent_workers = fetch_all("""
            SELECT w.id, w.full_name, w.district, w.worker_category, w.created_at,
                   wb.name as board_name, r.registration_number, r.status as registration_status
            FROM workers w
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            WHERE w.is_active = 1 AND w.is_archived = 0 AND w.created_by_user_id = ?
            ORDER BY w.created_at DESC
            LIMIT 10
        """, (user_id,))
    else:
        recent_workers = fetch_all("""
            SELECT w.id, w.full_name, w.district, w.worker_category, w.created_at,
                   wb.name as board_name, r.registration_number, r.status as registration_status
            FROM workers w
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN registrations r ON w.id = r.worker_id
            WHERE w.is_active = 1 AND w.is_archived = 0
            ORDER BY w.created_at DESC
            LIMIT 10
        """)

    # Board distribution
    if user_id is not None:
        board_distribution = fetch_all("""
            SELECT wb.name, COUNT(w.id) as worker_count
            FROM welfare_boards wb
            LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1 AND w.is_archived = 0 AND w.created_by_user_id = ?
            WHERE wb.is_active = 1
            GROUP BY wb.id, wb.name
            ORDER BY worker_count DESC
        """, (user_id,))
    else:
        board_distribution = fetch_all("""
            SELECT wb.name, COUNT(w.id) as worker_count
            FROM welfare_boards wb
            LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1 AND w.is_archived = 0
            WHERE wb.is_active = 1
            GROUP BY wb.id, wb.name
            ORDER BY worker_count DESC
        """)

    # District distribution (top 10)
    if user_id is not None:
        district_distribution = fetch_all("""
            SELECT district, COUNT(*) as worker_count
            FROM workers
            WHERE is_active = 1 AND is_archived = 0 AND district IS NOT NULL AND created_by_user_id = ?
            GROUP BY district
            ORDER BY worker_count DESC
            LIMIT 10
        """, (user_id,))
    else:
        district_distribution = fetch_all("""
            SELECT district, COUNT(*) as worker_count
            FROM workers
            WHERE is_active = 1 AND is_archived = 0 AND district IS NOT NULL
            GROUP BY district
            ORDER BY worker_count DESC
            LIMIT 10
        """)

    # Scheme statistics (shared — schemes are global)
    total_schemes = fetch_one(
        "SELECT COUNT(*) as count FROM welfare_schemes WHERE is_active = 1"
    )
    active_schemes = total_schemes["count"] if total_schemes else 0

    total_benefits = fetch_one(
        "SELECT COUNT(*) as count FROM scheme_benefits WHERE is_available = 1"
    )
    available_benefits = total_benefits["count"] if total_benefits else 0

    # Potential benefits = number of active workers * number of schemes (rough estimate)
    potential_benefits = active_schemes * (total_workers["count"] if total_workers else 0)

    # Scheme category breakdown
    scheme_category_stats = fetch_all("""
        SELECT sc.name as category_name, COUNT(ws.id) as scheme_count
        FROM scheme_categories sc
        LEFT JOIN welfare_schemes ws ON sc.id = ws.category_id AND ws.is_active = 1
        WHERE sc.is_active = 1
        GROUP BY sc.id, sc.name
        ORDER BY scheme_count DESC
    """)

    # Upcoming renewals (next 30 days) for the alerts section
    if user_id is not None:
        upcoming_renewals = fetch_all("""
            SELECT w.id, w.full_name, r.registration_number, r.validity_date,
                   wb.name as board_name, r.status
            FROM registrations r
            JOIN workers w ON r.worker_id = w.id
            LEFT JOIN welfare_boards wb ON r.board_id = wb.id
            WHERE r.validity_date >= ? AND r.validity_date <= ?
            AND w.is_active = 1 AND w.created_by_user_id = ?
            ORDER BY r.validity_date ASC
            LIMIT 10
        """, (today.isoformat(), (today + timedelta(days=90)).isoformat(), user_id))
    else:
        upcoming_renewals = fetch_all("""
            SELECT w.id, w.full_name, r.registration_number, r.validity_date,
                   wb.name as board_name, r.status
            FROM registrations r
            JOIN workers w ON r.worker_id = w.id
            LEFT JOIN welfare_boards wb ON r.board_id = wb.id
            WHERE r.validity_date >= ? AND r.validity_date <= ?
            AND w.is_active = 1
            ORDER BY r.validity_date ASC
            LIMIT 10
        """, (today.isoformat(), (today + timedelta(days=90)).isoformat()))

    # Family statistics
    if user_id is not None:
        family_with_children = fetch_one("""
            SELECT COUNT(DISTINCT fm.worker_id) as count
            FROM family_members fm
            WHERE fm.relationship IN ('Son', 'Daughter')
            AND fm.worker_id IN (SELECT id FROM workers WHERE is_active = 1 AND created_by_user_id = ?)
        """, (user_id,))
        education_records_count = fetch_one("""
            SELECT COUNT(*) as count FROM education_records
            WHERE worker_id IN (SELECT id FROM workers WHERE is_active = 1 AND created_by_user_id = ?)
        """, (user_id,))
    else:
        family_with_children = fetch_one("""
            SELECT COUNT(DISTINCT fm.worker_id) as count
            FROM family_members fm
            WHERE fm.relationship IN ('Son', 'Daughter')
            AND fm.worker_id IN (SELECT id FROM workers WHERE is_active = 1)
        """)
        education_records_count = fetch_one("""
            SELECT COUNT(*) as count FROM education_records
            WHERE worker_id IN (SELECT id FROM workers WHERE is_active = 1)
        """)

    # Worker categories breakdown
    if user_id is not None:
        category_distribution = fetch_all("""
            SELECT worker_category, COUNT(*) as worker_count
            FROM workers
            WHERE is_active = 1 AND is_archived = 0 AND worker_category IS NOT NULL AND created_by_user_id = ?
            GROUP BY worker_category
            ORDER BY worker_count DESC
            LIMIT 10
        """, (user_id,))
    else:
        category_distribution = fetch_all("""
            SELECT worker_category, COUNT(*) as worker_count
            FROM workers
            WHERE is_active = 1 AND is_archived = 0 AND worker_category IS NOT NULL
            GROUP BY worker_category
            ORDER BY worker_count DESC
            LIMIT 10
        """)

    return {
        "total_registered_workers": total_workers["count"] if total_workers else 0,
        "total_family_members": total_family["count"] if total_family else 0,
        "active_registrations": active_registrations["count"] if active_registrations else 0,
        "renewals_due_soon": (renewal_due["count"] or 0) + (expiring_soon["count"] or 0),
        "expired_registrations": expired_registrations["count"] if expired_registrations else 0,
        "pending_verification": pending_verification["count"] if pending_verification else 0,
        "potential_scheme_matches": potential_matches["count"] if potential_matches else 0,
        "pending_reviews": pending_reviews,
        "renewals_7d": renewals_7d["count"] if renewals_7d else 0,
        "renewals_30d": renewals_30d["count"] if renewals_30d else 0,
        "renewals_90d": renewals_90d["count"] if renewals_90d else 0,
        "overdue_registrations": overdue["count"] if overdue else 0,
        "recent_workers": recent_workers,
        "upcoming_renewals": upcoming_renewals,
        "board_distribution": board_distribution,
        "district_distribution": district_distribution,
        "category_distribution": category_distribution,
        "total_schemes": active_schemes,
        "available_benefits": available_benefits,
        "potential_benefits": potential_benefits,
        "scheme_category_stats": scheme_category_stats,
        "family_with_children": family_with_children["count"] if family_with_children else 0,
        "education_records": education_records_count["count"] if education_records_count else 0,
        # Phase 5: Detailed renewal intelligence
        "renewal_breakdown": renewal_breakdown,
        "alert_counts": alert_counts,
    }
