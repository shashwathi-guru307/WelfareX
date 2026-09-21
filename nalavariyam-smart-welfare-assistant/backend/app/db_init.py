"""
Automatic database initialization — runs on server startup.

When DATABASE_URL is configured (Supabase / any PostgreSQL), this module:
  1. Creates all tables, foreign keys and indexes from
     database/schema/schema_pg.sql  (fully idempotent — CREATE ... IF NOT
     EXISTS everywhere, so existing data is never touched).
  2. Seeds baseline data idempotently:
       - the 19 official Tamil Nadu welfare boards
       - default system settings / notification preferences

When no DATABASE_URL is set (local SQLite dev), schema is assumed to exist
(database/init_db.py) and seeding is skipped — SQLite dev DBs are managed
manually.

Call ensure_schema() from create_app(); failures are logged but never crash
the server (e.g. transient network issues at boot — the app will still serve,
and the next restart will retry).
"""
import logging
import os

logger = logging.getLogger("nwsa.db_init")

_SCHEMA_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "database", "schema", "schema_pg.sql",
)

OFFICIAL_BOARDS = [
    "Tamil Nadu Construction Workers Welfare Board",
    "Tamil Nadu Manual Workers Social Security and Welfare Board",
    "Tamil Nadu Washermen Welfare Board",
    "Tamil Nadu Hair Dressers Welfare Board",
    "Tamil Nadu Tailoring Workers Welfare Board",
    "Tamil Nadu Handicraft Workers Welfare Board",
    "Tamil Nadu Palm Tree Workers Welfare Board",
    "Tamil Nadu Handloom Workers Welfare Board",
    "Tamil Nadu Power loom Weaving Workers Welfare Board",
    "Tamil Nadu Footwear and Leather Workers Welfare Board",
    "Tamil Nadu Artists Welfare Board",
    "Tamil Nadu Goldsmiths Welfare Board",
    "Tamil Nadu Pottery Workers Welfare Board",
    "Tamil Nadu Domestic Workers Welfare Board",
    "Tamil Nadu Street Vending and Shops and Establishments Workers Welfare Board",
    "Tamil Nadu Cooking and Catering Workers Welfare Board",
    "Tamil Nadu Unorganised Drivers and Automobile Workshop Workers Welfare Board",
    "Tamil Nadu Beedi Workers Welfare Board",
    "Tamil Nadu Fire and Match Workers Welfare Board",
]

DEFAULT_SETTINGS = [
    # (key, value, type, category, description)
    ("application_name", "Nalavariyam Smart Welfare Assistant", "string", "general", "Application display name"),
    ("office_name", "District Welfare Office", "string", "general", "Organization / Office name"),
    ("district", "Chennai", "string", "general", "District / Office location"),
    ("date_format", "DD-MM-YYYY", "string", "general", "Default date format"),
    ("language", "English", "string", "general", "Default language"),
    ("timezone", "Asia/Kolkata", "string", "general", "System timezone"),
    ("renewal_alert_days", "30", "number", "renewal", "Days before expiry to trigger alert"),
    ("renewal_critical_days", "7", "number", "renewal", "Critical urgency threshold (days)"),
    ("renewal_high_days", "14", "number", "renewal", "High urgency threshold (days)"),
    ("renewal_medium_days", "30", "number", "renewal", "Medium urgency threshold (days)"),
    ("renewal_low_days", "90", "number", "renewal", "Low urgency threshold (days)"),
    ("renewal_notifications_enabled", "true", "boolean", "notifications", "Enable renewal alerts"),
    ("expired_notifications_enabled", "true", "boolean", "notifications", "Enable expired registration alerts"),
    ("missing_info_notifications_enabled", "true", "boolean", "notifications", "Enable missing info alerts"),
    ("eligibility_notifications_enabled", "true", "boolean", "notifications", "Enable eligibility match alerts"),
    ("reminder_notifications_enabled", "true", "boolean", "notifications", "Enable reminder alerts"),
    ("system_notifications_enabled", "true", "boolean", "notifications", "Enable system notifications"),
    ("auto_eligibility_enabled", "true", "boolean", "eligibility", "Automatic eligibility analysis"),
    ("show_potential_matches", "true", "boolean", "eligibility", "Show potential matches in results"),
    ("show_insufficient_data", "true", "boolean", "eligibility", "Show insufficient data results"),
    ("require_manual_verification", "true", "boolean", "eligibility", "Require manual verification flag"),
    ("eligibility_result_display", "all", "string", "eligibility", "Default result display order"),
    ("table_density", "comfortable", "string", "display", "Table row density"),
    ("report_org_name", "Nalavariyam Smart Welfare Assistant", "string", "reports", "Report organization name"),
    ("report_footer_text", "Preliminary administrative report. Final eligibility and benefit decisions are subject to official verification.", "string", "reports", "Report footer disclaimer"),
    ("report_format", "PDF", "string", "reports", "Default report format"),
    ("report_include_family", "true", "boolean", "reports", "Include family members in reports"),
    ("report_include_eligibility", "true", "boolean", "reports", "Include eligibility results in reports"),
    ("report_include_renewal", "true", "boolean", "reports", "Include renewal info in reports"),
    ("report_include_case_history", "true", "boolean", "reports", "Include case history in reports"),
    ("default_reminder_priority", "MEDIUM", "string", "reminders", "Default reminder priority"),
]

DEFAULT_NOTIFICATION_PREFS = [
    ("renewal_alerts_enabled", "true", "Enable renewal expiry alerts"),
    ("eligibility_alerts_enabled", "true", "Enable eligibility match alerts"),
    ("missing_info_alerts_enabled", "true", "Enable missing information alerts"),
    ("followup_alerts_enabled", "true", "Enable follow-up reminder alerts"),
    ("alert_threshold_days", "30", "Default days threshold for renewal alerts"),
]


def ensure_schema() -> bool:
    """Create schema + seed baseline data on the configured PostgreSQL database.

    Returns True when the database was initialized/verified, False when
    initialization was skipped or failed (never raises).
    """
    from app.database import USE_POSTGRES, execute_script, fetch_one, execute

    if not USE_POSTGRES:
        logger.info("DATABASE_URL not set — using local SQLite; skipping PG schema init.")
        return False

    # --- 1. Schema ---
    try:
        with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
            script = f.read()
        execute_script(script)
        logger.info("PostgreSQL schema applied/verified (29 tables).")
    except Exception as e:
        logger.error(f"Could not apply PostgreSQL schema: {e}")
        return False

    # --- 2. Seed baseline data (idempotent) ---
    try:
        boards = fetch_one("SELECT COUNT(*) AS c FROM welfare_boards")
        if boards and boards["c"] == 0:
            for name in OFFICIAL_BOARDS:
                execute(
                    "INSERT INTO welfare_boards (name, description, is_active) VALUES (?, ?, 1)",
                    (name, f"Welfare board for workers registered under the board."),
                )
            logger.info(f"Seeded {len(OFFICIAL_BOARDS)} official welfare boards.")

        settings = fetch_one("SELECT COUNT(*) AS c FROM system_settings")
        if settings and settings["c"] == 0:
            for key, value, stype, category, desc in DEFAULT_SETTINGS:
                execute(
                    "INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (key, value, stype, category, desc),
                )
            logger.info(f"Seeded {len(DEFAULT_SETTINGS)} default system settings.")

        prefs = fetch_one("SELECT COUNT(*) AS c FROM notification_preferences")
        if prefs and prefs["c"] == 0:
            for key, value, desc in DEFAULT_NOTIFICATION_PREFS:
                execute(
                    "INSERT INTO notification_preferences (config_key, config_value, description) VALUES (?, ?, ?)",
                    (key, value, desc),
                )
            logger.info(f"Seeded {len(DEFAULT_NOTIFICATION_PREFS)} notification preferences.")

        # Renewal config defaults
        renewal = fetch_one("SELECT COUNT(*) AS c FROM renewal_config")
        if renewal and renewal["c"] == 0:
            for key, value, desc in [
                ("alert_days_expiry", "30", "Days before expiry to generate alert"),
                ("critical_days", "7", "Days threshold for critical urgency"),
                ("high_days", "14", "Days threshold for high urgency"),
                ("medium_days", "30", "Days threshold for medium urgency"),
                ("low_days", "90", "Days threshold for low urgency"),
            ]:
                execute(
                    "INSERT INTO renewal_config (config_key, config_value, description) VALUES (?, ?, ?)",
                    (key, value, desc),
                )
            logger.info("Seeded renewal configuration defaults.")

        return True
    except Exception as e:
        logger.error(f"Schema OK, but baseline seeding failed: {e}")
        return False
