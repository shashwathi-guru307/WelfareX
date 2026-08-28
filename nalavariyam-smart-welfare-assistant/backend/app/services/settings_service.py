"""
Settings Service — Phase 6
Persistent system configuration management.

Provides:
  - Get/set all settings
  - Category-based settings
  - Validation
  - Renewal config sync with renewal_config table
"""

from datetime import datetime
from typing import Optional
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Settings CRUD
# ============================================================

def get_all_settings() -> dict:
    """Get all settings grouped by category."""
    rows = fetch_all(
        "SELECT * FROM system_settings ORDER BY category, setting_key"
    )
    grouped = {}
    for r in rows:
        cat = r["category"]
        if cat not in grouped:
            grouped[cat] = {}
        grouped[cat][r["setting_key"]] = {
            "value": r["setting_value"],
            "type": r["setting_type"],
            "description": r.get("description", ""),
            "updated_at": r.get("updated_at", ""),
        }
    return grouped


def get_settings_by_category(category: str) -> dict:
    """Get settings for a specific category."""
    rows = fetch_all(
        "SELECT * FROM system_settings WHERE category = ? ORDER BY setting_key",
        (category,),
    )
    result = {}
    for r in rows:
        result[r["setting_key"]] = {
            "value": r["setting_value"],
            "type": r["setting_type"],
            "description": r.get("description", ""),
        }
    return result


def get_setting(key: str) -> Optional[str]:
    """Get a single setting value."""
    row = fetch_one(
        "SELECT setting_value FROM system_settings WHERE setting_key = ?",
        (key,),
    )
    return row["setting_value"] if row else None


def get_setting_bool(key: str, default: bool = True) -> bool:
    """Get a boolean setting."""
    val = get_setting(key)
    if val is None:
        return default
    return val.lower() in ("true", "1", "yes")


def get_setting_int(key: str, default: int = 0) -> int:
    """Get a numeric setting."""
    val = get_setting(key)
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def update_setting(key: str, value: str) -> bool:
    """Update a single setting."""
    existing = fetch_one(
        "SELECT id FROM system_settings WHERE setting_key = ?",
        (key,),
    )
    if existing:
        execute(
            "UPDATE system_settings SET setting_value = ?, updated_at = datetime('now') WHERE setting_key = ?",
            (str(value), key),
        )
    else:
        execute(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)",
            (key, str(value)),
        )
    return True


def update_settings(settings: dict) -> int:
    """Update multiple settings at once. Returns count of updated settings."""
    count = 0
    for key, value in settings.items():
        update_setting(key, str(value))
        count += 1

    # Sync renewal settings with renewal_config table
    _sync_renewal_config()

    return count


def _sync_renewal_config():
    """Sync system_settings renewal values with renewal_config table."""
    mapping = {
        "renewal_alert_days": "alert_days_expiry",
        "renewal_critical_days": "critical_days",
        "renewal_high_days": "high_days",
        "renewal_medium_days": "medium_days",
        "renewal_low_days": "low_days",
    }
    for sys_key, config_key in mapping.items():
        val = get_setting(sys_key)
        if val is not None:
            existing = fetch_one(
                "SELECT id FROM renewal_config WHERE config_key = ?",
                (config_key,),
            )
            if existing:
                execute(
                    "UPDATE renewal_config SET config_value = ?, updated_at = datetime('now') WHERE config_key = ?",
                    (val, config_key),
                )
            else:
                execute(
                    "INSERT INTO renewal_config (config_key, config_value) VALUES (?, ?)",
                    (config_key, val),
                )


# ============================================================
# Validation
# ============================================================

def validate_settings(settings: dict) -> list[str]:
    """Validate settings values. Returns list of error messages."""
    errors = []

    if "application_name" in settings:
        if not settings["application_name"].strip():
            errors.append("Application name cannot be empty.")

    for key in ["renewal_alert_days", "renewal_critical_days", "renewal_high_days",
                 "renewal_medium_days", "renewal_low_days"]:
        if key in settings:
            try:
                val = int(settings[key])
                if val < 0:
                    errors.append(f"{key} cannot be negative.")
            except (ValueError, TypeError):
                errors.append(f"{key} must be a valid number.")

    return errors


# ============================================================
# System Statistics (for Data Management section)
# ============================================================

def get_system_stats() -> dict:
    """Get system-wide statistics for the Data Management section."""
    total_workers = fetch_one("SELECT COUNT(*) as c FROM workers WHERE is_active = 1")
    total_family = fetch_one("SELECT COUNT(*) as c FROM family_members")
    total_schemes = fetch_one("SELECT COUNT(*) as c FROM welfare_schemes")
    total_alerts = fetch_one("SELECT COUNT(*) as c FROM alerts")
    total_reminders = fetch_one("SELECT COUNT(*) as c FROM reminders")
    total_activities = fetch_one("SELECT COUNT(*) as c FROM activity_log")
    total_boards = fetch_one("SELECT COUNT(*) as c FROM welfare_boards")
    total_education = fetch_one("SELECT COUNT(*) as c FROM education_records")

    return {
        "total_applicants": total_workers["c"] if total_workers else 0,
        "total_family_members": total_family["c"] if total_family else 0,
        "total_schemes": total_schemes["c"] if total_schemes else 0,
        "total_alerts": total_alerts["c"] if total_alerts else 0,
        "total_reminders": total_reminders["c"] if total_reminders else 0,
        "total_activities": total_activities["c"] if total_activities else 0,
        "total_boards": total_boards["c"] if total_boards else 0,
        "total_education_records": total_education["c"] if total_education else 0,
    }
