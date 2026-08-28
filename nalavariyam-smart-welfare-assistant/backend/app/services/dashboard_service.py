"""
Dashboard service — provides aggregated statistics for the admin dashboard.
Phase 5 enhanced with detailed renewal intelligence breakdown.
All statistics are computed from real database data.
"""

from datetime import date, timedelta
from app.database import fetch_one, fetch_all
from app.services.renewal_service import get_renewal_bucket, get_renewal_breakdown, get_alert_counts_by_severity


def get_dashboard_stats() -> dict:
    """Return comprehensive dashboard statistics from the database."""
    total_workers = fetch_one(
        "SELECT COUNT(*) as count FROM workers WHERE is_active = 1 AND is_archived = 0"
    )
    total_family = fetch_one(
        "SELECT COUNT(*) as count FROM family_members WHERE worker_id IN (SELECT id FROM workers WHERE is_active = 1)"
    )

    # Registration statuses
    active_registrations = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE status = 'Active'"
    )
    renewal_due = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE status = 'Renewal Due'"
    )
    expiring_soon = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE status = 'Expiring Soon'"
    )
    expired_registrations = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE status = 'Expired'"
    )
    pending_verification = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE status = 'Pending Verification'"
    )

    # Renewal buckets based on actual dates
    today = date.today()
    renewals_7d = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE validity_date >= ? AND validity_date <= ? AND status != 'Expired'",
        (today.isoformat(), (today + timedelta(days=7)).isoformat())
    )
    renewals_30d = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE validity_date >= ? AND validity_date <= ? AND status != 'Expired'",
        ((today + timedelta(days=8)).isoformat(), (today + timedelta(days=30)).isoformat())
    )
    renewals_90d = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE validity_date >= ? AND validity_date <= ? AND status != 'Expired'",
        ((today + timedelta(days=31)).isoformat(), (today + timedelta(days=90)).isoformat())
    )

    # Overdue registrations
    overdue = fetch_one(
        "SELECT COUNT(*) as count FROM registrations WHERE validity_date < ?",
        (today.isoformat(),)
    )

    # Phase 5: Detailed renewal breakdown
    renewal_breakdown = get_renewal_breakdown()

    # Phase 5: Alert severity counts
    alert_counts = get_alert_counts_by_severity()

    # Potential scheme matches: active workers with active registrations
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
    board_distribution = fetch_all("""
        SELECT wb.name, COUNT(w.id) as worker_count
        FROM welfare_boards wb
        LEFT JOIN workers w ON wb.id = w.board_id AND w.is_active = 1 AND w.is_archived = 0
        WHERE wb.is_active = 1
        GROUP BY wb.id, wb.name
        ORDER BY worker_count DESC
    """)

    # District distribution (top 10)
    district_distribution = fetch_all("""
        SELECT district, COUNT(*) as worker_count
        FROM workers
        WHERE is_active = 1 AND is_archived = 0 AND district IS NOT NULL
        GROUP BY district
        ORDER BY worker_count DESC
        LIMIT 10
    """)

    # Scheme statistics
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
    family_with_children = fetch_one("""
        SELECT COUNT(DISTINCT fm.worker_id) as count
        FROM family_members fm
        WHERE fm.relationship IN ('Son', 'Daughter')
        AND fm.worker_id IN (SELECT id FROM workers WHERE is_active = 1)
    """)

    # Education stats
    education_records_count = fetch_one("""
        SELECT COUNT(*) as count FROM education_records
        WHERE worker_id IN (SELECT id FROM workers WHERE is_active = 1)
    """)

    # Worker categories breakdown
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
