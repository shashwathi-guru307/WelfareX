"""
Activity Log Service — Phase 5 (extended)
Lightweight activity/timeline tracking for applicant profiles.

Provides:
  - Activity logging
  - Activity timeline for a worker
  - Activity summary
"""

import json
from datetime import datetime, timedelta
from typing import Optional
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Activity Logging
# ============================================================

def log_activity(
    worker_id: int,
    activity_type: str,
    title: str,
    description: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> int:
    """Log an activity event for a worker."""
    meta_json = json.dumps(metadata) if metadata else None
    row_id = execute(
        """INSERT INTO activity_log (worker_id, activity_type, title, description, metadata)
           VALUES (?, ?, ?, ?, ?)""",
        (worker_id, activity_type, title, description, meta_json),
    )
    return row_id


def get_worker_activities(
    worker_id: int,
    activity_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Get activity timeline for a worker."""
    conditions = ["worker_id = ?"]
    params: list = [worker_id]

    if activity_type:
        conditions.append("activity_type = ?")
        params.append(activity_type)

    where_clause = " AND ".join(conditions)

    rows = fetch_all(
        f"""SELECT * FROM activity_log
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?""",
        tuple(params + [limit, offset]),
    )

    return [_format_activity(dict(r)) for r in rows]


def get_worker_activity_count(worker_id: int) -> int:
    """Get total activity count for a worker."""
    row = fetch_one(
        "SELECT COUNT(*) as count FROM activity_log WHERE worker_id = ?",
        (worker_id,),
    )
    return row["count"] if row else 0


def get_recent_activities(limit: int = 20) -> list[dict]:
    """Get recent activities across all workers (for dashboard)."""
    rows = fetch_all(
        """SELECT a.*, w.full_name as worker_name
           FROM activity_log a
           LEFT JOIN workers w ON a.worker_id = w.id
           ORDER BY a.created_at DESC
           LIMIT ?""",
        (limit,),
    )
    return [_format_activity(dict(r)) for r in rows]


# ============================================================
# Activity Summary (grouped by date)
# ============================================================

def get_activity_summary(worker_id: int) -> dict:
    """Get activity summary grouped by date for a worker."""
    activities = get_worker_activities(worker_id, limit=100)

    today = datetime.now().date().isoformat()
    yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()

    grouped = {}
    for act in activities:
        try:
            created = act['created_at'][:10]  # Extract date part
        except (KeyError, TypeError):
            created = 'Unknown'

        if created not in grouped:
            grouped[created] = []
        grouped[created].append(act)

    return {
        "total": len(activities),
        "today": grouped.get(today, []),
        "yesterday": grouped.get(yesterday, []),
        "by_date": grouped,
    }


# ============================================================
# Helper
# ============================================================

def _format_activity(activity: dict) -> dict:
    """Format an activity record with display helpers."""
    result = dict(activity)

    # Add icon/color hint based on activity type
    type_icons = {
        'alert_generated': '🔔',
        'renewal_alert_generated': '🔔',
        'eligibility_analyzed': '🔍',
        'reminder_created': '📝',
        'reminder_completed': '✅',
        'alert_read': '👁️',
        'alert_resolved': '✅',
        'alert_dismissed': '❌',
        'worker_updated': '✏️',
        'family_member_added': '👨‍👩‍👧',
        'family_member_updated': '✏️',
        'registration_added': '📋',
        'registration_renewed': '🔄',
        'scheme_application': '📄',
        'other': '📌',
    }
    result['icon'] = type_icons.get(activity.get('activity_type', ''), '📌')

    # Format date for display
    try:
        dt = datetime.strptime(activity['created_at'], '%Y-%m-%d %H:%M:%S')
        result['formatted_date'] = dt.strftime('%d %b %Y')
        result['formatted_time'] = dt.strftime('%I:%M %p')
        result['relative_time'] = _relative_time(dt)
    except (ValueError, KeyError):
        result['formatted_date'] = activity.get('created_at', '')
        result['formatted_time'] = ''
        result['relative_time'] = ''

    return result


def _relative_time(dt: datetime) -> str:
    """Get relative time string (e.g., '2 hours ago')."""
    now = datetime.now()
    diff = now - dt

    if diff.days > 30:
        return f"{diff.days // 30} month(s) ago"
    elif diff.days > 0:
        return f"{diff.days} day(s) ago"
    elif diff.seconds > 3600:
        return f"{diff.seconds // 3600} hour(s) ago"
    elif diff.seconds > 60:
        return f"{diff.seconds // 60} minute(s) ago"
    else:
        return "Just now"
