"""
Renewal Service — Phase 5
Centralized renewal-status engine with configurable thresholds.

Provides:
  - Configurable renewal thresholds (read from renewal_config table)
  - Urgency level calculation (LOW, MEDIUM, HIGH, CRITICAL)
  - Renewal status calculation (ACTIVE, EXPIRING_SOON, EXPIRED, NO_RENEWAL_DATE, UNKNOWN)
  - Worker-level renewal summary
  - Bulk renewal analysis for all active workers
  - Alert generation from renewal data
"""

from datetime import datetime, date, timedelta
from typing import Optional
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Configurable Thresholds
# ============================================================

# In-process cache: the config table is tiny and changes rarely, and
# re-reading it on every call costs a network round-trip each on remote
# databases (Neon). Cache for 60 seconds.
_config_cache: dict[str, tuple[float, int]] = {}
_CONFIG_TTL_SECONDS = 60


def _get_config(key: str, default: int) -> int:
    """Read a single config value from renewal_config table (cached)."""
    import time as _time
    cached = _config_cache.get(key)
    if cached is not None:
        at, value = cached
        if _time.monotonic() - at < _CONFIG_TTL_SECONDS:
            return value
    row = fetch_one(
        "SELECT config_value FROM renewal_config WHERE config_key = ?",
        (key,),
    )
    if row and row["config_value"]:
        try:
            value = int(row["config_value"])
            _config_cache[key] = (_time.monotonic(), value)
            return value
        except (ValueError, TypeError):
            pass
    _config_cache[key] = (_time.monotonic(), default)
    return default


def invalidate_config_cache() -> None:
    """Clear the config cache (call after updating renewal_config)."""
    _config_cache.clear()


def get_renewal_thresholds() -> dict:
    """Return all renewal thresholds from the config table."""
    return {
        "alert_days": _get_config("alert_days_expiry", 30),
        "critical_days": _get_config("critical_days", 7),
        "high_days": _get_config("high_days", 14),
        "medium_days": _get_config("medium_days", 30),
        "low_days": _get_config("low_days", 90),
    }


# ============================================================
# Core Calculation Functions
# ============================================================

def days_until_renewal(validity_date: str) -> int:
    """Calculate days until renewal/expiration. Negative = overdue."""
    valid_until = datetime.strptime(validity_date, "%Y-%m-%d").date()
    delta = valid_until - date.today()
    return delta.days


def days_since_date(date_str: str) -> int:
    """Calculate days since a given date."""
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    return (date.today() - d).days


def calculate_urgency(validity_date: str) -> str:
    """
    Calculate urgency level based on configurable thresholds.
    Returns: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'
    """
    days = days_until_renewal(validity_date)
    thresholds = get_renewal_thresholds()

    if days < 0:
        return "CRITICAL"
    elif days <= thresholds["critical_days"]:
        return "CRITICAL"
    elif days <= thresholds["high_days"]:
        return "HIGH"
    elif days <= thresholds["medium_days"]:
        return "MEDIUM"
    elif days <= thresholds["low_days"]:
        return "LOW"
    else:
        return "NONE"


def calculate_renewal_status(validity_date: Optional[str] = None) -> str:
    """
    Determine renewal status based on validity date.
    Returns one of: 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NO_RENEWAL_DATE', 'UNKNOWN'
    """
    if not validity_date:
        return "NO_RENEWAL_DATE"

    try:
        days = days_until_renewal(validity_date)
        thresholds = get_renewal_thresholds()

        if days < 0:
            return "EXPIRED"
        elif days <= thresholds["alert_days"]:
            return "EXPIRING_SOON"
        else:
            return "ACTIVE"
    except (ValueError, TypeError):
        return "UNKNOWN"


def is_overdue(validity_date: str) -> bool:
    """Check if a registration is overdue (past expiry)."""
    return days_until_renewal(validity_date) < 0


def is_renewal_due_soon(validity_date: str, within_days: int = 30) -> bool:
    """Check if renewal is due within specified number of days."""
    days = days_until_renewal(validity_date)
    return 0 <= days <= within_days


def compute_next_renewal_date(registration_date: str, validity_date: str) -> str:
    """Compute the next renewal date based on registration cycle."""
    valid_until = datetime.strptime(validity_date, "%Y-%m-%d").date()
    return valid_until.isoformat()


def get_renewal_bucket(validity_date: str) -> str:
    """
    Classify renewal into time buckets for dashboard display.
    Returns: 'overdue', '7_days', '30_days', '90_days', 'active'
    """
    days = days_until_renewal(validity_date)

    if days < 0:
        return "overdue"
    elif days <= 7:
        return "7_days"
    elif days <= 30:
        return "30_days"
    elif days <= 90:
        return "90_days"
    else:
        return "active"


def get_renewal_summary(validity_date: str) -> dict:
    """Get a comprehensive renewal summary for a registration."""
    days = days_until_renewal(validity_date)
    bucket = get_renewal_bucket(validity_date)
    status = calculate_renewal_status(validity_date)
    urgency = calculate_urgency(validity_date)

    if days < 0:
        description = f"Expired {abs(days)} days ago"
    elif days == 0:
        description = "Expires today"
    else:
        description = f"Expires in {days} days"

    return {
        "days_until_renewal": days,
        "bucket": bucket,
        "status": status,
        "urgency": urgency,
        "description": description,
        "is_overdue": days < 0,
        "is_due_soon": 0 <= days <= 30,
    }


# ============================================================
# Worker-Level Renewal Analysis (Phase 5)
# ============================================================

def get_worker_renewal_detail(worker_id: int) -> Optional[dict]:
    """
    Get detailed renewal status for a worker's most recent registration.
    Returns None if no registration found.
    """
    registration = fetch_one(
        """SELECT r.*, wb.name as board_name
           FROM registrations r
           LEFT JOIN welfare_boards wb ON r.board_id = wb.id
           WHERE r.worker_id = ?
           ORDER BY r.created_at DESC
           LIMIT 1""",
        (worker_id,),
    )

    if not registration:
        return None

    validity_date = registration.get("validity_date")
    renewal_date = registration.get("renewal_date")
    reg_date = registration.get("registration_date")

    result = {
        "registration_id": registration["id"],
        "registration_number": registration["registration_number"],
        "board_name": registration.get("board_name"),
        "registration_date": reg_date,
        "validity_date": validity_date,
        "renewal_date": renewal_date,
        "status": registration["status"],
    }

    if validity_date:
        summary = get_renewal_summary(validity_date)
        result.update({
            "days_until_renewal": summary["days_until_renewal"],
            "urgency": summary["urgency"],
            "computed_status": summary["status"],
            "description": summary["description"],
            "is_overdue": summary["is_overdue"],
            "is_due_soon": summary["is_due_soon"],
        })
    else:
        result.update({
            "days_until_renewal": None,
            "urgency": "unknown",
            "computed_status": "NO_RENEWAL_DATE",
            "description": "Renewal date not available",
            "is_overdue": False,
            "is_due_soon": False,
        })

    return result


def get_all_workers_renewal_summary() -> list[dict]:
    """
    Get renewal summary for ALL active workers.
    Used by the Renewal Alerts page and dashboard.
    """
    today = date.today().isoformat()
    workers = fetch_all("""
        SELECT w.id, w.full_name, w.district, w.worker_category,
               wb.name as board_name,
               r.registration_number, r.validity_date, r.renewal_date,
               r.registration_date, r.status as db_status
        FROM workers w
        LEFT JOIN registrations r ON w.id = r.worker_id
        LEFT JOIN welfare_boards wb ON r.board_id = wb.id
        WHERE w.is_active = 1 AND w.is_archived = 0
        ORDER BY r.validity_date ASC
    """)

    results = []
    for w in workers:
        validity_date = w.get("validity_date")
        entry = {
            "worker_id": w["id"],
            "full_name": w["full_name"],
            "district": w.get("district"),
            "worker_category": w.get("worker_category"),
            "board_name": w.get("board_name"),
            "registration_number": w.get("registration_number"),
            "registration_date": w.get("registration_date"),
            "validity_date": validity_date,
            "renewal_date": w.get("renewal_date"),
            "db_status": w.get("db_status"),
        }

        if validity_date:
            summary = get_renewal_summary(validity_date)
            entry.update({
                "days_until_renewal": summary["days_until_renewal"],
                "urgency": summary["urgency"],
                "computed_status": summary["status"],
                "description": summary["description"],
                "is_overdue": summary["is_overdue"],
                "is_due_soon": summary["is_due_soon"],
            })
        else:
            entry.update({
                "days_until_renewal": None,
                "urgency": "unknown",
                "computed_status": "NO_RENEWAL_DATE",
                "description": "No renewal information available",
                "is_overdue": False,
                "is_due_soon": False,
            })

        results.append(entry)

    return results


def get_renewal_breakdown(user_id: Optional[int] = None) -> dict:
    """
    Get a breakdown of renewal statuses for dashboard display.
    Returns counts for each urgency/status category.
    If user_id is provided, only counts workers owned by that user.
    """
    today = date.today().isoformat()
    thresholds = get_renewal_thresholds()

    wf = "AND w.created_by_user_id = ?" if user_id is not None else ""
    wp = (user_id,) if user_id is not None else ()

    alert_day = (date.today() + timedelta(days=thresholds["alert_days"])).isoformat()
    critical_day = (date.today() + timedelta(days=thresholds["critical_days"])).isoformat()
    high_day = (date.today() + timedelta(days=thresholds["high_days"])).isoformat()

    # All registration-based buckets in ONE grouped query (was 6 round-trips —
    # matters on high-latency links such as Neon PostgreSQL)
    rows = fetch_all(
        f"""SELECT
             CASE
               WHEN r.validity_date IS NULL OR r.validity_date = '' THEN 'missing_date'
               WHEN r.validity_date < ? THEN 'expired'
               WHEN r.validity_date <= ? THEN 'critical'
               WHEN r.validity_date <= ? THEN 'high'
               WHEN r.validity_date <= ? THEN 'expiring_soon'
               ELSE 'active'
             END AS bucket,
             COUNT(*) as count
           FROM registrations r
           JOIN workers w ON r.worker_id = w.id
           WHERE w.is_active = 1 {wf}
           GROUP BY bucket""",
        (today, critical_day, high_day, alert_day) + wp,
    )
    _c = {row["bucket"]: (row["count"] or 0) for row in rows}
    active = {"count": _c.get("active", 0)}
    expiring_soon = {"count": _c.get("expiring_soon", 0)}
    expired = {"count": _c.get("expired", 0)}
    critical = {"count": _c.get("critical", 0)}
    high = {"count": _c.get("high", 0)}
    missing_date = {"count": _c.get("missing_date", 0)}

    # Workers with no registration at all
    if user_id is not None:
        no_registration = fetch_one(
            """SELECT COUNT(*) as count FROM workers w
               WHERE w.is_active = 1 AND w.is_archived = 0
               AND w.created_by_user_id = ?
               AND w.id NOT IN (SELECT worker_id FROM registrations)""",
            (user_id,)
        )
    else:
        no_registration = fetch_one(
            """SELECT COUNT(*) as count FROM workers w
               WHERE w.is_active = 1 AND w.is_archived = 0
               AND w.id NOT IN (SELECT worker_id FROM registrations)"""
        )

    # Missing renewal date (has registration but no renewal_date)
    if user_id is not None:
        missing_renewal_date = fetch_one(
            """SELECT COUNT(*) as count FROM registrations r
               JOIN workers w ON r.worker_id = w.id
               WHERE (r.renewal_date IS NULL OR r.renewal_date = '')
               AND w.is_active = 1 AND w.created_by_user_id = ?""",
            (user_id,)
        )
    else:
        missing_renewal_date = fetch_one(
            """SELECT COUNT(*) as count FROM registrations r
               JOIN workers w ON r.worker_id = w.id
               WHERE (r.renewal_date IS NULL OR r.renewal_date = '')
               AND w.is_active = 1"""
        )

    return {
        "active": active["count"] if active else 0,
        "expiring_soon": expiring_soon["count"] if expiring_soon else 0,
        "expired": expired["count"] if expired else 0,
        "no_registration": no_registration["count"] if no_registration else 0,
        "missing_date": (missing_date["count"] or 0) + (no_registration["count"] or 0),
        "critical": critical["count"] if critical else 0,
        "high": high["count"] if high else 0,
        "missing_renewal_date": missing_renewal_date["count"] if missing_renewal_date else 0,
        "total_needing_attention": (
            (expiring_soon["count"] or 0) + (expired["count"] or 0) +
            (no_registration["count"] or 0) + (missing_date["count"] or 0)
        ),
    }


# ============================================================
# Alert Generation (Phase 5)
# ============================================================

def generate_renewal_alerts() -> int:
    """
    Generate/update alerts for workers with renewal issues.
    Returns the number of alerts created or updated.
    """
    today = date.today()
    today_str = today.isoformat()
    count = 0

    workers = fetch_all("""
        SELECT w.id, w.full_name, r.validity_date, r.registration_number,
               wb.name as board_name
        FROM workers w
        JOIN registrations r ON w.id = r.worker_id
        LEFT JOIN welfare_boards wb ON r.board_id = wb.id
        WHERE w.is_active = 1 AND w.is_archived = 0
    """)

    for w in workers:
        validity = w.get("validity_date")
        if not validity:
            continue

        days = days_until_renewal(validity)
        worker_id = w["id"]

        if days < 0:
            # Expired
            _upsert_alert(
                worker_id=worker_id,
                alert_type="renewal_expired",
                title="Registration Expired",
                message=f"Registration {w.get('registration_number', 'N/A')} expired {abs(days)} days ago. Board: {w.get('board_name', 'N/A')}.",
                severity="critical",
                due_at=validity,
            )
            count += 1
        elif days <= 7:
            # Critical
            _upsert_alert(
                worker_id=worker_id,
                alert_type="renewal_expiring_soon",
                title="Registration Expiring — Immediate Action",
                message=f"Registration {w.get('registration_number', 'N/A')} expires in {days} day(s). Board: {w.get('board_name', 'N/A')}.",
                severity="critical",
                due_at=validity,
            )
            count += 1
        elif days <= 30:
            # High/Medium
            _upsert_alert(
                worker_id=worker_id,
                alert_type="renewal_expiring_soon",
                title="Registration Expiring Soon",
                message=f"Registration {w.get('registration_number', 'N/A')} expires in {days} days. Board: {w.get('board_name', 'N/A')}.",
                severity="high" if days <= 14 else "medium",
                due_at=validity,
            )
            count += 1

    # Check workers with NO registration
    no_reg_workers = fetch_all("""
        SELECT w.id, w.full_name
        FROM workers w
        WHERE w.is_active = 1 AND w.is_archived = 0
        AND w.id NOT IN (SELECT worker_id FROM registrations)
    """)
    for w in no_reg_workers:
        _upsert_alert(
            worker_id=w["id"],
            alert_type="renewal_missing",
            title="Renewal Information Missing",
            message=f"{w['full_name']} has no registration record. Update applicant details to add registration information.",
            severity="medium",
            due_at=None,
        )
        count += 1

    return count


def _upsert_alert(worker_id: int, alert_type: str, title: str, message: str,
                   severity: str, due_at: Optional[str]) -> None:
    """Insert or update an alert for a worker+type combination."""
    existing = fetch_one(
        "SELECT id FROM alerts WHERE worker_id = ? AND type = ? AND status = 'active'",
        (worker_id, alert_type),
    )

    if existing:
        execute(
            """UPDATE alerts SET title=?, message=?, severity=?, due_at=?
               WHERE id=?""",
            (title, message, severity, due_at, existing["id"]),
        )
    else:
        execute(
            """INSERT INTO alerts (worker_id, type, title, message, severity, status, due_at, metadata)
               VALUES (?, ?, ?, ?, ?, 'active', ?, ?)""",
            (worker_id, alert_type, title, message, severity, due_at, None),
        )


def get_alerts(
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    worker_id: Optional[int] = None,
    page: int = 1,
    per_page: int = 20,
    user_id: Optional[int] = None,
) -> dict:
    """Get alerts with filtering and pagination.
    If user_id is provided, only shows alerts for workers owned by that user.
    """
    conditions = []
    params = []

    if alert_type:
        conditions.append("a.type = ?")
        params.append(alert_type)
    if severity:
        conditions.append("a.severity = ?")
        params.append(severity)
    if status:
        conditions.append("a.status = ?")
        params.append(status)
    else:
        conditions.append("a.status = 'active'")
    if worker_id:
        conditions.append("a.worker_id = ?")
        params.append(worker_id)
    if user_id is not None:
        conditions.append("(a.worker_id IS NULL OR a.worker_id IN (SELECT id FROM workers WHERE created_by_user_id = ?))")
        params.append(user_id)

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    count_row = fetch_one(
        f"SELECT COUNT(*) as count FROM alerts a WHERE {where_clause}",
        tuple(params),
    )
    total = count_row["count"] if count_row else 0

    offset = (page - 1) * per_page
    params_with_limit = params + [per_page, offset]

    alerts = fetch_all(
        f"""SELECT a.*, w.full_name as worker_name, w.district,
                   wb.name as board_name
            FROM alerts a
            LEFT JOIN workers w ON a.worker_id = w.id
            LEFT JOIN registrations r ON a.worker_id = r.worker_id
            LEFT JOIN welfare_boards wb ON r.board_id = wb.id
            WHERE {where_clause}
            ORDER BY
                CASE a.severity
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                a.created_at DESC
            LIMIT ? OFFSET ?""",
        tuple(params_with_limit),
    )

    return {
        "alerts": alerts,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
    }


def mark_alert_read(alert_id: int) -> bool:
    """Mark an alert as read."""
    rows = execute(
        """UPDATE alerts SET status = 'read', read_at = datetime('now')
           WHERE id = ? AND status = 'active'""",
        (alert_id,),
    )
    return rows > 0


def mark_alert_resolved(alert_id: int) -> bool:
    """Mark an alert as resolved."""
    rows = execute(
        """UPDATE alerts SET status = 'resolved', resolved_at = datetime('now')
           WHERE id = ? AND status IN ('active', 'read')""",
        (alert_id,),
    )
    return rows > 0


def dismiss_alert(alert_id: int) -> bool:
    """Dismiss an alert."""
    rows = execute(
        "UPDATE alerts SET status = 'dismissed' WHERE id = ?",
        (alert_id,),
    )
    return rows > 0


def get_unread_alert_count() -> int:
    """Get count of active (unread) alerts."""
    row = fetch_one(
        "SELECT COUNT(*) as count FROM alerts WHERE status = 'active'"
    )
    return row["count"] if row else 0


def get_alert_counts_by_severity(user_id: Optional[int] = None) -> dict:
    """Get alert counts grouped by severity for the notifications badge.
    If user_id is provided, only counts alerts for workers owned by that user.
    """
    if user_id is not None:
        rows = fetch_all(
            """SELECT a.severity, COUNT(*) as count
               FROM alerts a
               WHERE a.status = 'active'
               AND (a.worker_id IS NULL OR a.worker_id IN (
                   SELECT id FROM workers WHERE created_by_user_id = ?
               ))
               GROUP BY a.severity""",
            (user_id,),
        )
    else:
        rows = fetch_all(
            """SELECT severity, COUNT(*) as count
               FROM alerts WHERE status = 'active'
               GROUP BY severity"""
        )
    result = {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
    for r in rows:
        result[r["severity"]] = r["count"]
        result["total"] += r["count"]
    return result


# ============================================================
# Mark as Renewed (Phase 12)
# ============================================================

def mark_renewed(
    worker_id: int,
    new_validity_date: str,
    performed_by: str = "Staff",
    notes: str = None,
) -> dict:
    """
    Mark a worker's registration as renewed.
    Updates validity_date, records history, generates auto-reminders.
    Returns updated worker renewal detail.
    """
    from datetime import datetime
    import json

    # Get current registration
    registration = fetch_one(
        """SELECT r.*, wb.name as board_name
           FROM registrations r
           LEFT JOIN welfare_boards wb ON r.board_id = wb.id
           WHERE r.worker_id = ?
           ORDER BY r.created_at DESC
           LIMIT 1""",
        (worker_id,),
    )

    if not registration:
        return {"success": False, "error": "No registration found for this worker."}

    old_validity = registration.get("validity_date")
    old_renewal = registration.get("renewal_date")

    # Calculate next renewal (1 year from new validity)
    try:
        new_valid = datetime.strptime(new_validity_date, "%Y-%m-%d").date()
        next_renewal = new_valid.isoformat()
    except (ValueError, TypeError):
        return {"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}

    # Update registration
    execute(
        """UPDATE registrations
           SET validity_date = ?, renewal_date = ?,
               status = 'Active', updated_at = datetime('now')
           WHERE id = ?""",
        (new_validity_date, new_validity_date, registration["id"]),
    )

    # Record renewal history
    execute(
        """INSERT INTO renewal_history
           (worker_id, registration_id, old_validity_date, new_validity_date,
            old_renewal_date, new_renewal_date, action, performed_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'RENEWED', ?, ?)""",
        (
            worker_id, registration["id"], old_validity, new_validity_date,
            old_renewal, new_validity_date, performed_by, notes,
        ),
    )

    # Log activity
    execute(
        """INSERT INTO activity_log (worker_id, activity_type, title, description, metadata)
           VALUES (?, 'registration_renewed', ?, ?, ?)""",
        (
            worker_id,
            "Registration Renewed",
            f"Validity extended to {new_validity_date} (was {old_validity})",
            json.dumps({"old_validity": old_validity, "new_validity": new_validity_date, "performed_by": performed_by}),
        ),
    )

    # Resolve any existing expired/expiring alerts for this worker
    execute(
        """UPDATE alerts SET status = 'resolved', resolved_at = datetime('now')
           WHERE worker_id = ? AND type IN ('renewal_expired', 'renewal_expiring_soon')
           AND status IN ('active', 'read')""",
        (worker_id,),
    )

    # Generate auto-reminders for the new renewal
    _generate_auto_reminders(worker_id, new_validity_date)

    return get_worker_renewal_detail(worker_id)


def _generate_auto_reminders(worker_id: int, validity_date: str) -> int:
    """Generate automatic reminders for upcoming renewal.

    Uses configurable windows. Prevents duplicate reminders.
    Returns number of reminders created.
    """
    from datetime import datetime, timedelta
    import json

    try:
        valid_until = datetime.strptime(validity_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return 0

    thresholds = get_renewal_thresholds()
    # Windows in days before expiry: 90, 60, 30, 15, 7, 1
    reminder_windows = [90, 60, 30, 15, 7, 1]

    # Get worker info for reminder title
    worker = fetch_one("SELECT full_name FROM workers WHERE id = ?", (worker_id,))
    worker_name = worker["full_name"] if worker else "Unknown"

    count = 0
    for days_before in reminder_windows:
        reminder_date = valid_until - timedelta(days=days_before)
        # Only create future reminders
        if reminder_date < date.today():
            continue

        reminder_date_str = reminder_date.isoformat()

        # Check for existing duplicate: same worker + same date + RENEWAL type + PENDING
        existing = fetch_one(
            """SELECT id FROM reminders
               WHERE worker_id = ? AND reminder_date = ?
               AND reminder_type = 'RENEWAL' AND status = 'PENDING'""",
            (worker_id, reminder_date_str),
        )
        if existing:
            continue

        # Determine priority based on days until expiry
        if days_before <= 7:
            priority = "URGENT"
        elif days_before <= 14:
            priority = "HIGH"
        elif days_before <= 30:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        execute(
            """INSERT INTO reminders
               (worker_id, title, description, reminder_type, reminder_date,
                priority, status, metadata)
               VALUES (?, ?, ?, 'RENEWAL', ?, ?, 'PENDING', ?)""",
            (
                worker_id,
                f"Renewal reminder: {worker_name}",
                f"Registration renewal due in {days_before} days for {worker_name}. Valid until {validity_date}.",
                reminder_date_str,
                priority,
                json.dumps({"validity_date": validity_date, "days_before": days_before}),
            ),
        )
        count += 1

    return count


def get_renewal_history(worker_id: int) -> list[dict]:
    """Get renewal history for a worker."""
    rows = fetch_all(
        """SELECT * FROM renewal_history
           WHERE worker_id = ?
           ORDER BY created_at DESC""",
        (worker_id,),
    )
    return [dict(r) for r in rows]


def get_all_renewal_history() -> list[dict]:
    """Get all renewal history records."""
    rows = fetch_all(
        'SELECT rh.*, w.full_name as worker_name '
        'FROM renewal_history rh '
        'LEFT JOIN workers w ON rh.worker_id = w.id '
        'ORDER BY rh.created_at DESC '
        'LIMIT 200'
    )
    return [dict(r) for r in rows]


def auto_generate_reminders_for_all() -> dict:
    """Scan all active workers and generate auto-reminders for upcoming renewals.

    Called by daily check. Prevents duplicates.
    """
    workers = fetch_all(
        'SELECT w.id, r.validity_date '
        'FROM workers w '
        'JOIN registrations r ON w.id = r.worker_id '
        'WHERE w.is_active = 1 AND w.is_archived = 0 '
        'AND r.validity_date IS NOT NULL AND r.validity_date != ""'
    )

    total_reminders = 0
    for w in workers:
        try:
            count = _generate_auto_reminders(w["id"], w["validity_date"])
            total_reminders += count
        except Exception:
            pass

    return {"workers_scanned": len(workers), "reminders_created": total_reminders}

