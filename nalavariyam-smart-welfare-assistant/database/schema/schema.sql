-- ============================================================
-- Nalavariyam Smart Welfare Assistant — Database Schema (Phase 4)
-- Tamil Nadu Unorganised Workers Welfare Board
-- ============================================================
-- Expanded schema supporting full applicant management,
-- family records, education, board-specific benefits,
-- qualification variants, advanced eligibility, and
-- configurable eligibility analysis engine (Phase 4).
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Welfare Boards
-- ============================================================
CREATE TABLE IF NOT EXISTS welfare_boards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    registration_requirements TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. Scheme Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 3. Workers / Applicants (Phase 2 — expanded)
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Personal Information
    full_name       TEXT    NOT NULL,
    father_husband_name TEXT,
    date_of_birth   TEXT    NOT NULL,              -- ISO 8601 date (YYYY-MM-DD)
    gender          TEXT    NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    mobile_number   TEXT,
    alternate_mobile TEXT,
    address         TEXT,
    district        TEXT,
    taluk           TEXT,
    village_town    TEXT,
    pincode         TEXT,

    -- Identification
    aadhaar_hash    TEXT,                          -- Stored as hash for security
    ration_card_number TEXT,
    reference_id    TEXT,                          -- Alternative identifier / other ID

    -- Worker Information
    nature_of_work  TEXT,
    occupation      TEXT,
    worker_category TEXT,
    board_id        INTEGER,

    -- Education (top-level summary)
    education_level TEXT,

    -- Marital Status
    marital_status  TEXT,

    -- Disability
    has_disability  INTEGER NOT NULL DEFAULT 0 CHECK (has_disability IN (0, 1)),
    disability_details TEXT,

    -- Status
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_archived     INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),

    -- Audit
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (board_id) REFERENCES welfare_boards(id)
);

CREATE INDEX IF NOT EXISTS idx_workers_board ON workers(board_id);
CREATE INDEX IF NOT EXISTS idx_workers_district ON workers(district);
CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(full_name);
CREATE INDEX IF NOT EXISTS idx_workers_dob ON workers(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_workers_occupation ON workers(occupation);
CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(is_active, is_archived);

-- ============================================================
-- 4. Registrations (tracks registration & renewal lifecycle)
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id           INTEGER NOT NULL,
    board_id            INTEGER NOT NULL,
    registration_number TEXT    NOT NULL UNIQUE,
    registration_date   TEXT    NOT NULL,          -- ISO 8601 date
    validity_date       TEXT    NOT NULL,          -- ISO 8601 date (expiry)
    renewal_date        TEXT,                      -- Last renewal date
    next_renewal_date   TEXT,                      -- Computed next renewal
    status              TEXT    NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active', 'Renewal Due', 'Expiring Soon', 'Expired', 'Suspended', 'Pending Verification', 'Cancelled')),
    notes               TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id)  REFERENCES welfare_boards(id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_worker ON registrations(worker_id);
CREATE INDEX IF NOT EXISTS idx_registrations_board ON registrations(board_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_validity ON registrations(validity_date);

-- ============================================================
-- 5. Family Members (Phase 2 — new)
-- ============================================================
CREATE TABLE IF NOT EXISTS family_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER NOT NULL,
    name            TEXT    NOT NULL,
    relationship    TEXT    NOT NULL,              -- Spouse, Son, Daughter, Father, Mother, Brother, Sister, Other Dependent
    date_of_birth   TEXT    NOT NULL,             -- ISO 8601 date (YYYY-MM-DD)
    gender          TEXT    NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    mobile_number   TEXT,
    education_level TEXT,
    occupation      TEXT,
    marital_status  TEXT,
    has_disability  INTEGER NOT NULL DEFAULT 0 CHECK (has_disability IN (0, 1)),
    disability_details TEXT,
    disability_type TEXT,
    disability_percentage REAL CHECK (disability_percentage IS NULL OR (disability_percentage >= 0 AND disability_percentage <= 100)),
    disability_certificate_available INTEGER NOT NULL DEFAULT 0 CHECK (disability_certificate_available IN (0, 1)),
    is_dependent    INTEGER NOT NULL DEFAULT 1 CHECK (is_dependent IN (0, 1)),
    is_employed     INTEGER NOT NULL DEFAULT 0 CHECK (is_employed IN (0, 1)),
    monthly_income  REAL,
    is_currently_studying INTEGER NOT NULL DEFAULT 0 CHECK (is_currently_studying IN (0, 1)),
    course_or_class TEXT,
    institution_name TEXT,
    academic_year   TEXT,
    aadhaar_hash    TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_family_worker ON family_members(worker_id);
CREATE INDEX IF NOT EXISTS idx_family_relationship ON family_members(relationship);

-- ============================================================
-- 6. Education Records (Phase 2 — new)
-- ============================================================
CREATE TABLE IF NOT EXISTS education_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER NOT NULL,
    family_member_id INTEGER,                      -- NULL if worker's own education
    education_level TEXT    NOT NULL,              -- Primary, Secondary, UG, PG, etc.
    course          TEXT,                          -- B.Sc, B.E., MBA, etc.
    institution     TEXT,
    board_university TEXT,
    year_of_study   TEXT,                          -- e.g. "2nd Year" or "2024-2025"
    is_currently_studying INTEGER NOT NULL DEFAULT 0 CHECK (is_currently_studying IN (0, 1)),
    percentage_cgpa TEXT,
    year_of_completion TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_education_worker ON education_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_education_family ON education_records(family_member_id);

-- ============================================================
-- 7. Welfare Schemes
-- ============================================================
CREATE TABLE IF NOT EXISTS welfare_schemes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_code     TEXT    UNIQUE,                  -- Stable idempotent key, e.g. 'EDU_ASSIST', 'MARRIAGE'
    name            TEXT    NOT NULL,
    category_id     INTEGER,
    board_id        INTEGER,                          -- NULL = applicable to all boards (overridden by scheme_benefits)
    description     TEXT,
    benefit_description TEXT,
    amount_details  TEXT,                              -- Summary amount text (may be overridden per-board)
    eligibility_summary TEXT,
    qualification_text TEXT,                           -- Exact source qualification/detail text from Excel
    claimant_type   TEXT    DEFAULT 'WORKER'
                    CHECK (claimant_type IN (
                        'WORKER', 'SPOUSE', 'CHILD', 'SON', 'DAUGHTER',
                        'DEPENDENT', 'NOMINEE', 'FAMILY_MEMBER', 'WORKER_OR_CHILD',
                        'WORKER_OR_FAMILY', 'FEMALE_WORKER', 'ANY',
                        'WORKER_OR_SPOUSE', 'FAMILY_OR_NOMINEE'
                    )),
    max_usage       INTEGER,                          -- NULL = unlimited; e.g. 2 for Marriage Assistance
    required_documents TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (category_id) REFERENCES scheme_categories(id),
    FOREIGN KEY (board_id)    REFERENCES welfare_boards(id)
);

CREATE INDEX IF NOT EXISTS idx_schemes_category ON welfare_schemes(category_id);
CREATE INDEX IF NOT EXISTS idx_schemes_board ON welfare_schemes(board_id);
CREATE INDEX IF NOT EXISTS idx_schemes_active ON welfare_schemes(is_active);
CREATE INDEX IF NOT EXISTS idx_schemes_code ON welfare_schemes(scheme_code);

-- ============================================================
-- 7b. Scheme Benefits (board-specific amounts & availability)
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_benefits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_id       INTEGER NOT NULL,
    board_id        INTEGER NOT NULL,
    qualification_id INTEGER,                         -- FK to scheme_qualifications if this is a variant row
    benefit_type    TEXT    DEFAULT 'financial',
    amount          TEXT,                              -- Amount text, e.g. 'Rs. 4,000' or 'Rs. 20,000 (Male & Female)'
    amount_numeric  REAL,                              -- Parsed numeric for future calculations
    amount_unit     TEXT    DEFAULT 'one-time',        -- 'one-time', 'per month', 'per year', etc.
    is_available    INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
    description     TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id)  REFERENCES welfare_boards(id),
    FOREIGN KEY (qualification_id) REFERENCES scheme_qualifications(id) ON DELETE SET NULL,
    UNIQUE(scheme_id, board_id, qualification_id)
);

CREATE INDEX IF NOT EXISTS idx_benefits_scheme ON scheme_benefits(scheme_id);
CREATE INDEX IF NOT EXISTS idx_benefits_board ON scheme_benefits(board_id);

-- ============================================================
-- 7c. Scheme Qualifications (education variants, sub-benefits)
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_qualifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_id       INTEGER NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    qualification_text TEXT NOT NULL,                  -- Exact source text from Excel
    description     TEXT,
    -- Structured eligibility fields (for future rule engine)
    education_level TEXT,                              -- e.g. '6th-9th', '10th', '12th', 'UG', 'PG', etc.
    education_type  TEXT,                              -- 'Regular', 'Hostel', 'Pass', 'Female Children'
    claimant_type   TEXT,                              -- Override for this variant
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qualifications_scheme ON scheme_qualifications(scheme_id);

-- ============================================================
-- 7d. Scheme Rules (structured eligibility rules per benefit variant)
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_id       INTEGER NOT NULL,
    qualification_id INTEGER,                          -- NULL = applies to entire scheme
    rule_type       TEXT    NOT NULL,
    field           TEXT    NOT NULL,                  -- e.g. 'education_level', 'gender', 'claimant_type'
    operator        TEXT    NOT NULL DEFAULT '=',
    value           TEXT    NOT NULL,
    value_type      TEXT    DEFAULT 'string',          -- 'string', 'number', 'boolean', 'json'
    description     TEXT,
    priority        INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_id) REFERENCES scheme_qualifications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheme_rules_scheme ON scheme_rules(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_rules_qualification ON scheme_rules(qualification_id);

-- ============================================================
-- 8. Eligibility Rules (configurable rule definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS eligibility_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_id       INTEGER NOT NULL,
    rule_name       TEXT    NOT NULL,
    rule_type       TEXT    NOT NULL
                    CHECK (rule_type IN (
                        'board_jurisdiction',
                        'registration_valid',
                        'min_tenure',
                        'max_age', 'min_age',
                        'max_children',
                        'gender', 'education_level',
                        'claimant_type',
                        'worker_category',
                        'has_disability',
                        'accommodation_type',
                        'registration_required',
                        'custom'
                    )),
    rule_value      TEXT    NOT NULL,
    operator        TEXT    NOT NULL DEFAULT '='
                    CHECK (operator IN ('=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains')),
    is_mandatory    INTEGER NOT NULL DEFAULT 1 CHECK (is_mandatory IN (0, 1)),
    priority        INTEGER NOT NULL DEFAULT 0,
    description     TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eligibility_scheme ON eligibility_rules(scheme_id);

-- ============================================================
-- 9. Scheme Applications (worker applications to schemes)
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_applications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER NOT NULL,
    scheme_id       INTEGER NOT NULL,
    application_date TEXT   NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled')),
    eligibility_status TEXT,
    eligibility_reasons TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_worker ON scheme_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_scheme ON scheme_applications(scheme_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON scheme_applications(status);

-- ============================================================
-- 10. Eligibility Audit Log (Phase 4 — new)
-- ============================================================
-- Records every eligibility analysis run for audit/history.
CREATE TABLE IF NOT EXISTS eligibility_audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER NOT NULL,
    analysis_date   TEXT    NOT NULL DEFAULT (datetime('now')),
    engine_version  TEXT    NOT NULL DEFAULT '4.0.0',
    total_schemes   INTEGER NOT NULL DEFAULT 0,
    eligible_count  INTEGER NOT NULL DEFAULT 0,
    potential_count INTEGER NOT NULL DEFAULT 0,
    not_eligible    INTEGER NOT NULL DEFAULT 0,
    insufficient    INTEGER NOT NULL DEFAULT 0,
    family_members_evaluated INTEGER NOT NULL DEFAULT 0,
    result_json     TEXT,                              -- Full serialized analysis for audit
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_worker ON eligibility_audit_log(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON eligibility_audit_log(analysis_date);

-- ============================================================
-- 11. Alerts & Notifications (Phase 5)
-- ============================================================
-- Centralized alert/notification system for renewals, eligibility,
-- follow-ups, and system-generated notifications.
CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER,                          -- NULL = system-wide alert
    type            TEXT    NOT NULL
                    CHECK (type IN (
                        'renewal_expired',
                        'renewal_expiring_soon',
                        'renewal_missing',
                        'eligibility_match',
                        'eligibility_insufficient_data',
                        'follow_up_required',
                        'document_missing',
                        'registration_pending',
                        'system'
                    )),
    title           TEXT    NOT NULL,
    message         TEXT    NOT NULL,
    severity        TEXT    NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status          TEXT    NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'read', 'resolved', 'dismissed')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    due_at          TEXT,                              -- When action is needed by
    read_at         TEXT,
    resolved_at     TEXT,
    metadata        TEXT,                              -- JSON for flexible additional data

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_worker ON alerts(worker_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

-- ============================================================
-- 12. Renewal Configuration (Phase 5 — configurable thresholds)
-- ============================================================
CREATE TABLE IF NOT EXISTS renewal_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key      TEXT    NOT NULL UNIQUE,
    config_value    TEXT    NOT NULL,
    description     TEXT,
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Default renewal thresholds
INSERT OR IGNORE INTO renewal_config (config_key, config_value, description) VALUES
    ('alert_days_expiry', '30', 'Days before expiry to generate alert'),
    ('critical_days', '7', 'Days threshold for critical urgency'),
    ('high_days', '14', 'Days threshold for high urgency'),
    ('medium_days', '30', 'Days threshold for medium urgency'),
    ('low_days', '90', 'Days threshold for low urgency');

-- ============================================================
-- 13. Reminders (Phase 5 — extended)
-- ============================================================
-- Staff-created reminders for follow-ups, renewals, and tasks.
CREATE TABLE IF NOT EXISTS reminders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER,                          -- NULL = general reminder
    title           TEXT    NOT NULL,
    description     TEXT,
    reminder_type   TEXT    NOT NULL DEFAULT 'OTHER'
                    CHECK (reminder_type IN ('RENEWAL', 'DOCUMENT', 'FOLLOW_UP', 'ELIGIBILITY', 'OTHER')),
    reminder_date   TEXT    NOT NULL,                  -- When reminder is due (ISO date)
    priority        TEXT    NOT NULL DEFAULT 'MEDIUM'
                    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status          TEXT    NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    cancelled_at    TEXT,
    metadata        TEXT,                              -- JSON for flexible data

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_worker ON reminders(worker_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(reminder_type);

-- ============================================================
-- 14. Activity Log (Phase 5 — lightweight timeline)
-- ============================================================
-- Lightweight activity/timeline for applicant profiles.
CREATE TABLE IF NOT EXISTS activity_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id       INTEGER NOT NULL,
    activity_type   TEXT    NOT NULL
                    CHECK (activity_type IN (
                        'alert_generated',
                        'eligibility_analyzed',
                        'reminder_created',
                        'reminder_completed',
                        'alert_read',
                        'alert_resolved',
                        'alert_dismissed',
                        'worker_updated',
                        'family_member_added',
                        'family_member_updated',
                        'registration_added',
                        'registration_renewed',
                        'scheme_application',
                        'renewal_alert_generated',
                        'other'
                    )),
    title           TEXT    NOT NULL,
    description     TEXT,
    metadata        TEXT,                              -- JSON for additional data
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_worker ON activity_log(worker_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

-- ============================================================
-- 15. Notification Preferences (Phase 5 — configurable)
-- ============================================================
-- System-wide notification preferences.
CREATE TABLE IF NOT EXISTS notification_preferences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key      TEXT    NOT NULL UNIQUE,
    config_value    TEXT    NOT NULL,                  -- 'true' or 'false' or numeric threshold
    description     TEXT,
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Default notification preferences
INSERT OR IGNORE INTO notification_preferences (config_key, config_value, description) VALUES
    ('renewal_alerts_enabled', 'true', 'Enable renewal expiry alerts'),
    ('eligibility_alerts_enabled', 'true', 'Enable eligibility match alerts'),
    ('missing_info_alerts_enabled', 'true', 'Enable missing information alerts'),
    ('followup_alerts_enabled', 'true', 'Enable follow-up reminder alerts'),
    ('alert_threshold_days', '30', 'Default days threshold for renewal alerts');

-- ============================================================
-- 16. System Settings (Phase 6 — persistent configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key     TEXT    NOT NULL UNIQUE,
    setting_value   TEXT    NOT NULL,
    setting_type    TEXT    NOT NULL DEFAULT 'string'
                    CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    category        TEXT    NOT NULL DEFAULT 'general',
    description     TEXT,
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);

-- Default system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('application_name', 'Nalavariyam Smart Welfare Assistant', 'string', 'general', 'Application display name'),
    ('office_name', 'District Welfare Office', 'string', 'general', 'Organization / Office name'),
    ('district', 'Chennai', 'string', 'general', 'District / Office location'),
    ('date_format', 'DD-MM-YYYY', 'string', 'general', 'Default date format'),
    ('language', 'English', 'string', 'general', 'Default language'),
    ('timezone', 'Asia/Kolkata', 'string', 'general', 'System timezone'),
    ('renewal_alert_days', '30', 'number', 'renewal', 'Days before expiry to trigger alert'),
    ('renewal_critical_days', '7', 'number', 'renewal', 'Critical urgency threshold (days)'),
    ('renewal_high_days', '14', 'number', 'renewal', 'High urgency threshold (days)'),
    ('renewal_medium_days', '30', 'number', 'renewal', 'Medium urgency threshold (days)'),
    ('renewal_low_days', '90', 'number', 'renewal', 'Low urgency threshold (days)'),
    ('renewal_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable renewal alerts'),
    ('expired_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable expired registration alerts'),
    ('missing_info_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable missing info alerts'),
    ('eligibility_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable eligibility match alerts'),
    ('reminder_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable reminder alerts'),
    ('system_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable system notifications'),
    ('auto_eligibility_enabled', 'true', 'boolean', 'eligibility', 'Automatic eligibility analysis'),
    ('show_potential_matches', 'true', 'boolean', 'eligibility', 'Show potential matches in results'),
    ('show_insufficient_data', 'true', 'boolean', 'eligibility', 'Show insufficient data results'),
    ('require_manual_verification', 'true', 'boolean', 'eligibility', 'Require manual verification flag'),
    ('eligibility_result_display', 'all', 'string', 'eligibility', 'Default result display order'),
    ('table_density', 'comfortable', 'string', 'display', 'Table row density'),
    ('report_org_name', 'Nalavariyam Smart Welfare Assistant', 'string', 'reports', 'Report organization name'),
    ('report_footer_text', 'Preliminary administrative report. Final eligibility and benefit decisions are subject to official verification.', 'string', 'reports', 'Report footer disclaimer'),
    ('report_format', 'PDF', 'string', 'reports', 'Default report format'),
    ('report_include_family', 'true', 'boolean', 'reports', 'Include family members in reports'),
    ('report_include_eligibility', 'true', 'boolean', 'reports', 'Include eligibility results in reports'),
    ('report_include_renewal', 'true', 'boolean', 'reports', 'Include renewal info in reports'),
    ('report_include_case_history', 'true', 'boolean', 'reports', 'Include case history in reports'),
    ('default_reminder_priority', 'MEDIUM', 'string', 'reminders', 'Default reminder priority');
