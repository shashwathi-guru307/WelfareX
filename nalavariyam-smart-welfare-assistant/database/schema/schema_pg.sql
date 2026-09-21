-- ============================================================
-- Nalavariyam Smart Welfare Assistant — PostgreSQL Schema
-- ============================================================
-- Generated from the local SQLite schema by
-- backend/scripts/sqlite_to_pg_schema.py — do not edit by hand.
-- Fully idempotent: safe to run on every server startup
-- (see backend/app/db_init.py) and against a fresh Supabase project.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        TEXT    NOT NULL UNIQUE,
    email           TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'STAFF'
                    CHECK (role IN ('ADMIN', 'STAFF')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),
    last_login_at   TEXT,
    password_changed_at TEXT
, profile_picture TEXT, google_id TEXT, avatar_url TEXT, approval_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')), requested_at TEXT, approved_at TEXT, approved_by INTEGER REFERENCES users(id), rejection_reason TEXT);

CREATE TABLE IF NOT EXISTS welfare_boards (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    registration_requirements TEXT,
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(), last_reviewed_by TEXT, last_reviewed_at TEXT, created_by_user_id INTEGER REFERENCES users(id),

    FOREIGN KEY (board_id) REFERENCES welfare_boards(id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    due_at          TEXT,                              -- When action is needed by
    read_at         TEXT,
    resolved_at     TEXT,
    metadata        TEXT,                              -- JSON for flexible additional data

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheme_categories (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welfare_schemes (
    id              SERIAL PRIMARY KEY,
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
                        'DEPENDENT', 'NOMINEE', 'FAMILY_MEMBER',
                        'WORKER_OR_CHILD', 'WORKER_OR_FAMILY',
                        'FEMALE_WORKER', 'ANY'
                    )),
    max_usage       INTEGER,                          -- NULL = unlimited; e.g. 2 for Marriage Assistance
    required_documents TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (category_id) REFERENCES scheme_categories(id),
    FOREIGN KEY (board_id)    REFERENCES welfare_boards(id)
);

CREATE TABLE IF NOT EXISTS scheme_qualifications (
    id              SERIAL PRIMARY KEY,
    scheme_id       INTEGER NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    qualification_text TEXT NOT NULL,                  -- Exact source text from Excel
    description     TEXT,
    -- Structured eligibility fields (for future rule engine)
    education_level TEXT,                              -- e.g. '6th-9th', '10th', '12th', 'UG', 'PG', etc.
    education_type  TEXT,                              -- 'Regular', 'Hostel', 'Pass', 'Female Children'
    claimant_type   TEXT,                              -- Override for this variant
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cases (
    id                  SERIAL PRIMARY KEY,
    case_number         TEXT    NOT NULL UNIQUE,
    worker_id           INTEGER NOT NULL,
    scheme_id           INTEGER,
    scheme_variant_id   INTEGER,
    claimant_id         INTEGER,                     -- worker_id or family_member_id
    claimant_type       TEXT    DEFAULT 'WORKER'
                        CHECK (claimant_type IN ('WORKER', 'FAMILY_MEMBER')),
    title               TEXT    NOT NULL,
    description         TEXT,
    status              TEXT    NOT NULL DEFAULT 'NEW'
                        CHECK (status IN (
                            'NEW',
                            'UNDER_REVIEW',
                            'DOCUMENTS_PENDING',
                            'ELIGIBILITY_REVIEW',
                            'READY_FOR_SUBMISSION',
                            'FOLLOW_UP_REQUIRED',
                            'COMPLETED',
                            'REJECTED',
                            'CLOSED'
                        )),
    priority            TEXT    NOT NULL DEFAULT 'MEDIUM'
                        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to         TEXT,                         -- Staff name (future: FK to users)
    assigned_at         TEXT,
    assignment_notes    TEXT,
    opened_at           TEXT    NOT NULL DEFAULT NOW(),
    updated_at          TEXT    NOT NULL DEFAULT NOW(),
    closed_at           TEXT,
    created_by          TEXT,                         -- Staff who created the case
    created_at          TEXT    NOT NULL DEFAULT NOW(),
    closure_reason      TEXT
                        CHECK (closure_reason IS NULL OR closure_reason IN (
                            'BENEFIT_PROCESSED',
                            'NOT_ELIGIBLE',
                            'APPLICANT_WITHDREW',
                            'DUPLICATE_CASE',
                            'NO_RESPONSE',
                            'OTHER'
                        )), created_by_user_id INTEGER REFERENCES users(id),

    FOREIGN KEY (worker_id)       REFERENCES workers(id),
    FOREIGN KEY (scheme_id)       REFERENCES welfare_schemes(id),
    FOREIGN KEY (scheme_variant_id) REFERENCES scheme_qualifications(id)
);

CREATE TABLE IF NOT EXISTS case_activity_log (
    id                  SERIAL PRIMARY KEY,
    case_id             INTEGER NOT NULL,
    activity_type       TEXT    NOT NULL
                        CHECK (activity_type IN (
                            'CASE_CREATED',
                            'STATUS_CHANGED',
                            'DOCUMENT_UPLOADED',
                            'DOCUMENT_VERIFIED',
                            'DOCUMENT_REJECTED',
                            'NOTE_ADDED',
                            'TASK_CREATED',
                            'TASK_COMPLETED',
                            'TASK_CANCELLED',
                            'ASSIGNED',
                            'REASSIGNED',
                            'CASE_COMPLETED',
                            'CASE_CLOSED',
                            'CASE_REOPENED',
                            'ELIGIBILITY_ATTACHED',
                            'OTHER'
                        )),
    title               TEXT    NOT NULL,
    description         TEXT,
    old_value           TEXT,                          -- Previous status/value for transitions
    new_value           TEXT,                          -- New status/value
    metadata            TEXT,                          -- JSON for additional data
    created_at          TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_documents (
    id                  SERIAL PRIMARY KEY,
    case_id             INTEGER NOT NULL,
    document_type       TEXT    NOT NULL,              -- e.g. 'EDUCATION_CERTIFICATE', 'ID_PROOF'
    document_name       TEXT    NOT NULL,              -- Human-readable name
    required            INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
    status              TEXT    NOT NULL DEFAULT 'NOT_SUBMITTED'
                        CHECK (status IN (
                            'NOT_SUBMITTED',
                            'SUBMITTED',
                            'UNDER_VERIFICATION',
                            'VERIFIED',
                            'REJECTED',
                            'NOT_REQUIRED'
                        )),
    file_name           TEXT,
    file_path           TEXT,                         -- Internal reference, NOT exposed
    file_size           INTEGER,                      -- Bytes
    uploaded_at         TEXT,
    verified_at         TEXT,
    verified_by         TEXT,
    rejection_reason    TEXT,
    remarks             TEXT,
    created_at          TEXT    NOT NULL DEFAULT NOW(),
    updated_at          TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_notes (
    id                  SERIAL PRIMARY KEY,
    case_id             INTEGER NOT NULL,
    author              TEXT    NOT NULL,
    content             TEXT    NOT NULL,
    is_internal         INTEGER NOT NULL DEFAULT 1 CHECK (is_internal IN (0, 1)),
    created_at          TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_tasks (
    id                  SERIAL PRIMARY KEY,
    case_id             INTEGER NOT NULL,
    task_type           TEXT    NOT NULL
                        CHECK (task_type IN (
                            'CALL_APPLICANT',
                            'DOCUMENT_COLLECTION',
                            'DOCUMENT_VERIFICATION',
                            'ELIGIBILITY_REVIEW',
                            'RENEWAL_FOLLOWUP',
                            'SCHEME_REVIEW',
                            'OTHER'
                        )),
    title               TEXT    NOT NULL,
    description         TEXT,
    status              TEXT    NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority            TEXT    NOT NULL DEFAULT 'MEDIUM'
                        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to         TEXT,
    due_date            TEXT,
    completed_at        TEXT,
    cancelled_at        TEXT,
    created_at          TEXT    NOT NULL DEFAULT NOW(),
    updated_at          TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_members (
    id              SERIAL PRIMARY KEY,
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
    disability_percentage DOUBLE PRECISION CHECK (disability_percentage IS NULL OR (disability_percentage >= 0 AND disability_percentage <= 100)),
    disability_certificate_available INTEGER NOT NULL DEFAULT 0 CHECK (disability_certificate_available IN (0, 1)),
    is_dependent    INTEGER NOT NULL DEFAULT 1 CHECK (is_dependent IN (0, 1)),
    is_employed     INTEGER NOT NULL DEFAULT 0 CHECK (is_employed IN (0, 1)),
    monthly_income  DOUBLE PRECISION,
    is_currently_studying INTEGER NOT NULL DEFAULT 0 CHECK (is_currently_studying IN (0, 1)),
    course_or_class TEXT,
    institution_name TEXT,
    academic_year   TEXT,
    aadhaar_hash    TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS education_records (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS eligibility_audit_log (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    analysis_date TEXT NOT NULL DEFAULT NOW(),
    engine_version TEXT NOT NULL DEFAULT '4.0.0',
    total_schemes INTEGER NOT NULL DEFAULT 0,
    eligible_count INTEGER NOT NULL DEFAULT 0,
    potential_count INTEGER NOT NULL DEFAULT 0,
    not_eligible INTEGER NOT NULL DEFAULT 0,
    insufficient INTEGER NOT NULL DEFAULT 0,
    family_members_evaluated INTEGER NOT NULL DEFAULT 0,
    result_json TEXT,
    created_at TEXT NOT NULL DEFAULT NOW(),
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eligibility_rules (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id              SERIAL PRIMARY KEY,
    identifier      TEXT    NOT NULL,               -- email or username attempted
    ip_address      TEXT,
    success         INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
    attempted_at    TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id              SERIAL PRIMARY KEY,
    config_key      TEXT    NOT NULL UNIQUE,
    config_value    TEXT    NOT NULL,                  -- 'true' or 'false' or numeric threshold
    description     TEXT,
    updated_at      TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registration_requests (
    id              SERIAL PRIMARY KEY,
    google_id       TEXT    NOT NULL,
    email           TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    avatar_url      TEXT,
    status          TEXT    NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_at    TEXT    NOT NULL DEFAULT NOW(),
    reviewed_at     TEXT,
    reviewed_by     INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrations (
    id                  SERIAL PRIMARY KEY,
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
    created_at          TEXT    NOT NULL DEFAULT NOW(),
    updated_at          TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id)  REFERENCES welfare_boards(id)
);

CREATE TABLE IF NOT EXISTS reminders (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    completed_at    TEXT,
    cancelled_at    TEXT,
    metadata        TEXT, created_by_user_id INTEGER REFERENCES users(id),                              -- JSON for flexible data

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS renewal_config (
    id              SERIAL PRIMARY KEY,
    config_key      TEXT    NOT NULL UNIQUE,
    config_value    TEXT    NOT NULL,
    description     TEXT,
    updated_at      TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS renewal_history (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER NOT NULL,
    registration_id INTEGER,
    old_validity_date TEXT,
    new_validity_date TEXT,
    old_renewal_date TEXT,
    new_renewal_date TEXT,
    action          TEXT NOT NULL DEFAULT 'RENEWED'
                    CHECK (action IN ('RENEWED', 'INITIAL', 'EXTENDED', 'CORRECTED', 'CANCELLED')),
    performed_by    TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheme_applications (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER NOT NULL,
    scheme_id       INTEGER NOT NULL,
    application_date TEXT   NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled')),
    eligibility_status TEXT,
    eligibility_reasons TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheme_benefits (
    id              SERIAL PRIMARY KEY,
    scheme_id       INTEGER NOT NULL,
    board_id        INTEGER NOT NULL,
    qualification_id INTEGER,                         -- FK to scheme_qualifications if this is a variant row
    benefit_type    TEXT    DEFAULT 'financial',
    amount          TEXT,                              -- Amount text, e.g. 'Rs. 4,000' or 'Rs. 20,000 (Male & Female)'
    amount_numeric  DOUBLE PRECISION,                              -- Parsed numeric for future calculations
    amount_unit     TEXT    DEFAULT 'one-time',        -- 'one-time', 'per month', 'per year', etc.
    is_available    INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
    description     TEXT,
    created_at      TEXT    NOT NULL DEFAULT NOW(),
    updated_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id)  REFERENCES welfare_boards(id),
    FOREIGN KEY (qualification_id) REFERENCES scheme_qualifications(id) ON DELETE SET NULL,
    UNIQUE(scheme_id, board_id, qualification_id)
);

CREATE TABLE IF NOT EXISTS scheme_rules (
    id              SERIAL PRIMARY KEY,
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
    created_at      TEXT    NOT NULL DEFAULT NOW(),

    FOREIGN KEY (scheme_id) REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_id) REFERENCES scheme_qualifications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
    id              SERIAL PRIMARY KEY,
    setting_key     TEXT    NOT NULL UNIQUE,
    setting_value   TEXT    NOT NULL,
    setting_type    TEXT    NOT NULL DEFAULT 'string'
                    CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    category        TEXT    NOT NULL DEFAULT 'general',
    description     TEXT,
    updated_at      TEXT    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_notes (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Staff',
    is_internal INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT NOW(),
    updated_at TEXT NOT NULL DEFAULT NOW(),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);


-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(activity_type);

CREATE INDEX IF NOT EXISTS idx_activity_worker ON activity_log(worker_id);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

CREATE INDEX IF NOT EXISTS idx_alerts_worker ON alerts(worker_id);

CREATE INDEX IF NOT EXISTS idx_applications_scheme ON scheme_applications(scheme_id);

CREATE INDEX IF NOT EXISTS idx_applications_status ON scheme_applications(status);

CREATE INDEX IF NOT EXISTS idx_applications_worker ON scheme_applications(worker_id);

CREATE INDEX IF NOT EXISTS idx_audit_date ON eligibility_audit_log(analysis_date);

CREATE INDEX IF NOT EXISTS idx_audit_worker ON eligibility_audit_log(worker_id);

CREATE INDEX IF NOT EXISTS idx_benefits_board ON scheme_benefits(board_id);

CREATE INDEX IF NOT EXISTS idx_benefits_scheme ON scheme_benefits(scheme_id);

CREATE INDEX IF NOT EXISTS idx_case_activity_case   ON case_activity_log(case_id);

CREATE INDEX IF NOT EXISTS idx_case_activity_created ON case_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_case_activity_type   ON case_activity_log(activity_type);

CREATE INDEX IF NOT EXISTS idx_casedocs_case   ON case_documents(case_id);

CREATE INDEX IF NOT EXISTS idx_casedocs_status ON case_documents(status);

CREATE INDEX IF NOT EXISTS idx_casenotes_case ON case_notes(case_id);

CREATE INDEX IF NOT EXISTS idx_cases_assigned    ON cases(assigned_to);

CREATE INDEX IF NOT EXISTS idx_cases_created     ON cases(created_at);

CREATE INDEX IF NOT EXISTS idx_cases_number      ON cases(case_number);

CREATE INDEX IF NOT EXISTS idx_cases_priority    ON cases(priority);

CREATE INDEX IF NOT EXISTS idx_cases_scheme      ON cases(scheme_id);

CREATE INDEX IF NOT EXISTS idx_cases_status      ON cases(status);

CREATE INDEX IF NOT EXISTS idx_cases_worker      ON cases(worker_id);

CREATE INDEX IF NOT EXISTS idx_casetasks_case   ON case_tasks(case_id);

CREATE INDEX IF NOT EXISTS idx_casetasks_due    ON case_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_casetasks_status ON case_tasks(status);

CREATE INDEX IF NOT EXISTS idx_casetasks_type   ON case_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_education_family ON education_records(family_member_id);

CREATE INDEX IF NOT EXISTS idx_education_worker ON education_records(worker_id);

CREATE INDEX IF NOT EXISTS idx_eligibility_scheme ON eligibility_rules(scheme_id);

CREATE INDEX IF NOT EXISTS idx_family_relationship ON family_members(relationship);

CREATE INDEX IF NOT EXISTS idx_family_worker ON family_members(worker_id);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);

CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

CREATE INDEX IF NOT EXISTS idx_qualifications_scheme ON scheme_qualifications(scheme_id);

CREATE INDEX IF NOT EXISTS idx_reg_requests_email ON registration_requests(email);

CREATE INDEX IF NOT EXISTS idx_reg_requests_google ON registration_requests(google_id);

CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);

CREATE INDEX IF NOT EXISTS idx_registrations_board ON registrations(board_id);

CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

CREATE INDEX IF NOT EXISTS idx_registrations_validity ON registrations(validity_date);

CREATE INDEX IF NOT EXISTS idx_registrations_worker ON registrations(worker_id);

CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);

CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(reminder_type);

CREATE INDEX IF NOT EXISTS idx_reminders_worker ON reminders(worker_id);

CREATE INDEX IF NOT EXISTS idx_renewal_history_created ON renewal_history(created_at);

CREATE INDEX IF NOT EXISTS idx_renewal_history_registration ON renewal_history(registration_id);

CREATE INDEX IF NOT EXISTS idx_renewal_history_worker ON renewal_history(worker_id);

CREATE INDEX IF NOT EXISTS idx_scheme_rules_qualification ON scheme_rules(qualification_id);

CREATE INDEX IF NOT EXISTS idx_scheme_rules_scheme ON scheme_rules(scheme_id);

CREATE INDEX IF NOT EXISTS idx_schemes_active ON welfare_schemes(is_active);

CREATE INDEX IF NOT EXISTS idx_schemes_board ON welfare_schemes(board_id);

CREATE INDEX IF NOT EXISTS idx_schemes_category ON welfare_schemes(category_id);

CREATE INDEX IF NOT EXISTS idx_schemes_code ON welfare_schemes(scheme_code);

CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);

CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_worker_notes_created_at ON worker_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_worker_notes_worker_id ON worker_notes(worker_id);

CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(is_active, is_archived);

CREATE INDEX IF NOT EXISTS idx_workers_board ON workers(board_id);

CREATE INDEX IF NOT EXISTS idx_workers_district ON workers(district);

CREATE INDEX IF NOT EXISTS idx_workers_dob ON workers(date_of_birth);

CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(full_name);

CREATE INDEX IF NOT EXISTS idx_workers_occupation ON workers(occupation);

CREATE INDEX IF NOT EXISTS idx_workers_user ON workers(created_by_user_id);
