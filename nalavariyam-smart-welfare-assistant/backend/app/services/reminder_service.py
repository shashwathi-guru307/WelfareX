"""
Reminder Service — Phase 5 (extended)
Manages staff reminders for follow-ups, renewals, documents, and tasks.

Provides:
  - Reminder CRUD (create, read, update, delete)
  - Overdue detection
  - Complete / Cancel operations
  - Filtering by type, status, date range, worker
  - Reminder summary (today, upcoming, overdue counts)
"""

import json
from datetime import datetime, date, timedelta
from typing import Optional
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Reminder CRUD
# ============================================================

def create_reminder(
    worker_id: Optional[int],
    title: str,
    description: Optional[str] = None,
    reminder_type: str = 'OTHER',
    reminder_date: str = None,
    priority: str = 'MEDIUM',
    metadata: Optional[dict] = None,
) -> dict:
    """Create a new reminder."""
    if not reminder_date:
        reminder_date = date.today().isoformat()

    meta_json = json.dumps(metadata) if metadata else None
    row_id = execute(
        """INSERT INTO reminders (worker_id, title, description, reminder_type,
           reminder_date, priority, status, metadata)
           VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)""",
        (worker_id, title, description, reminder_type, reminder_date, priority, meta_json),
    )

    # Log activity
    if worker_id:
        _log_activity(
            worker_id=worker_id,
            activity_type='reminder_created',
            title=f"Reminder created: {title}",
            description=f"Due: {reminder_date} | Type: {reminder_type} | Priority: {priority}",
        )

    return get_reminder(row_id)


def get_reminder(reminder_id: int) -> Optional[dict]:
    """Get a single reminder by ID."""
    row = fetch_one(
        """SELECT r.*, w.full_name as worker_name
           FROM reminders r
           LEFT JOIN workers w ON r.worker_id = w.id
           WHERE r.id = ?""",
        (reminder_id,),
    )
    if not row:
        return None

    result = dict(row)
    result['is_overdue'] = _is_overdue(result)
    result['days_until'] = _days_until_reminder(result)
    return result


def update_reminder(
    reminder_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    reminder_type: Optional[str] = None,
    reminder_date: Optional[str] = None,
    priority: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> Optional[dict]:
    """Update a reminder."""
    existing = fetch_one("SELECT * FROM reminders WHERE id = ?", (reminder_id,))
    if not existing:
        return None

    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if reminder_type is not None:
        updates.append("reminder_type = ?")
        params.append(reminder_type)
    if reminder_date is not None:
        updates.append("reminder_date = ?")
        params.append(reminder_date)
    if priority is not None:
        updates.append("priority = ?")
        params.append(priority)
    if metadata is not None:
        updates.append("metadata = ?")
        params.append(json.dumps(metadata))

    if not updates:
        return get_reminder(reminder_id)

    params.append(reminder_id)
    execute(
        f"UPDATE reminders SET {', '.join(updates)} WHERE id = ?",
        tuple(params),
    )

    return get_reminder(reminder_id)


def delete_reminder(reminder_id: int) -> bool:
    """Delete a reminder (soft delete via cancel)."""
    return cancel_reminder(reminder_id)


def cancel_reminder(reminder_id: int) -> bool:
    """Cancel a reminder."""
    rows = execute(
        """UPDATE reminders SET status = 'CANCELLED', cancelled_at = datetime('now')
           WHERE id = ? AND status = 'PENDING'""",
        (reminder_id,),
    )
    return rows > 0


def complete_reminder(reminder_id: int) -> bool:
    """Mark a reminder as completed."""
    existing = fetch_one(
        "SELECT id, worker_id, title FROM reminders WHERE id = ?", (reminder_id,)
    )
    if not existing:
        return False

    rows = execute(
        """UPDATE reminders SET status = 'COMPLETED', completed_at = datetime('now')
           WHERE id = ? AND status = 'PENDING'""",
        (reminder_id,),
    )

    if rows > 0 and existing.get('worker_id'):
        _log_activity(
            worker_id=existing['worker_id'],
            activity_type='reminder_completed',
            title=f"Reminder completed: {existing['title']}",
        )

    return rows > 0


# ============================================================
# Query / List
# ============================================================

def list_reminders(
    worker_id: Optional[int] = None,
    reminder_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    user_id: Optional[int] = None,
) -> dict:
    """List reminders with filtering and pagination.
    If user_id is provided, only returns reminders created by that user.
    """
    conditions = []
    params = []

    # Per-user data isolation
    if user_id is not None:
        conditions.append("r.created_by_user_id = ?")
        params.append(user_id)

    if worker_id:
        conditions.append("r.worker_id = ?")
        params.append(worker_id)
    if reminder_type:
        conditions.append("r.reminder_type = ?")
        params.append(reminder_type)
    if status:
        conditions.append("r.status = ?")
        params.append(status)
    else:
        conditions.append("r.status = 'PENDING'")
    if priority:
        conditions.append("r.priority = ?")
        params.append(priority)

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    count_row = fetch_one(
        f"SELECT COUNT(*) as count FROM reminders r WHERE {where_clause}",
        tuple(params),
    )
    total = count_row["count"] if count_row else 0

    offset = (page - 1) * per_page
    params_with_limit = params + [per_page, offset]

    rows = fetch_all(
        f"""SELECT r.*, w.full_name as worker_name
            FROM reminders r
            LEFT JOIN workers w ON r.worker_id = w.id
            WHERE {where_clause}
            ORDER BY
                CASE r.priority
                    WHEN 'URGENT' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                END,
                r.reminder_date ASC
            LIMIT ? OFFSET ?""",
        tuple(params_with_limit),
    )

    # Enrich with computed fields
    reminders = []
    for row in rows:
        r = dict(row)
        r['is_overdue'] = _is_overdue(r)
        r['days_until'] = _days_until_reminder(r)
        reminders.append(r)

    return {
        "reminders": reminders,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
    }


def get_overdue_reminders() -> list[dict]:
    """Get all overdue reminders (PENDING and reminder_date < today)."""
    today = date.today().isoformat()
    rows = fetch_all(
        """SELECT r.*, w.full_name as worker_name
           FROM reminders r
           LEFT JOIN workers w ON r.worker_id = w.id
           WHERE r.status = 'PENDING' AND r.reminder_date < ?
           ORDER BY r.reminder_date ASC""",
        (today,),
    )
    return [_enrich_reminder(dict(r)) for r in rows]


def get_reminder_summary() -> dict:
    """Get reminder counts by category for dashboard/display."""
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    week_end = (date.today() + timedelta(days=7)).isoformat()

    total_pending = fetch_one(
        "SELECT COUNT(*) as count FROM reminders WHERE status = 'PENDING'"
    )
    overdue = fetch_one(
        "SELECT COUNT(*) as count FROM reminders WHERE status = 'PENDING' AND reminder_date < ?",
        (today,),
    )
    due_today = fetch_one(
        "SELECT COUNT(*) as count FROM reminders WHERE status = 'PENDING' AND reminder_date = ?",
        (today,),
    )
    due_tomorrow = fetch_one(
        "SELECT COUNT(*) as count FROM reminders WHERE status = 'PENDING' AND reminder_date = ?",
        (tomorrow,),
    )
    due_this_week = fetch_one(
        "SELECT COUNT(*) as count FROM reminders WHERE status = 'PENDING' AND reminder_date > ? AND reminder_date <= ?",
        (today, week_end),
    )
    completed_today = fetch_one(
        """SELECT COUNT(*) as count FROM reminders
           WHERE status = 'COMPLETED' AND completed_at >= ?""",
        (today,),
    )

    return {
        "total_pending": total_pending["count"] if total_pending else 0,
        "overdue": overdue["count"] if overdue else 0,
        "due_today": due_today["count"] if due_today else 0,
        "due_tomorrow": due_tomorrow["count"] if due_tomorrow else 0,
        "due_this_week": due_this_week["count"] if due_this_week else 0,
        "completed_today": completed_today["count"] if completed_today else 0,
    }


# ============================================================
# Helper functions
# ============================================================

def _is_overdue(reminder: dict) -> bool:
    """Check if a reminder is overdue."""
    if reminder.get('status') != 'PENDING':
        return False
    try:
        r_date = datetime.strptime(reminder['reminder_date'], '%Y-%m-%d').date()
        return r_date < date.today()
    except (ValueError, TypeError):
        return False


def _days_until_reminder(reminder: dict) -> Optional[int]:
    """Calculate days until reminder date. Negative = overdue."""
    try:
        r_date = datetime.strptime(reminder['reminder_date'], '%Y-%m-%d').date()
        delta = r_date - date.today()
        return delta.days
    except (ValueError, TypeError):
        return None


def _enrich_reminder(reminder: dict) -> dict:
    """Add computed fields to a reminder dict."""
    reminder['is_overdue'] = _is_overdue(reminder)
    reminder['days_until'] = _days_until_reminder(reminder)
    return reminder


def _log_activity(worker_id: int, activity_type: str, title: str,
                  description: Optional[str] = None, metadata: Optional[dict] = None) -> None:
    """Log an activity for a worker's timeline."""
    meta_json = json.dumps(metadata) if metadata else None
    execute(
        """INSERT INTO activity_log (worker_id, activity_type, title, description, metadata)
           VALUES (?, ?, ?, ?, ?)""",
        (worker_id, activity_type, title, description, meta_json),
    )
