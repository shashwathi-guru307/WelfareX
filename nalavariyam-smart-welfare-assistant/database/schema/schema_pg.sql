-- ============================================================
-- Nalavariyam Smart Welfare Assistant — PostgreSQL Schema
-- ============================================================
-- Auto-converted from SQLite schema for Cloud SQL deployment.
-- All AUTOINCREMENT → SERIAL, datetime('now') → NOW(),
-- PRAGMA removed (PostgreSQL enforces FK by default).
-- ============================================================

-- ============================================================
-- 1. Welfare Boards
-- ============================================================
CREATE TABLE IF NOT EXISTS welfare_boards (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    registration_requirements TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Scheme Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_categories (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Workers / Applicants
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
    id              SERIAL PRIMARY KEY,
    full_name       TEXT    NOT NULL,
    father_husband_name TEXT,
    date_of_birth   DATE    NOT NULL,
    gender          TEXT    NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    mobile_number   TEXT,
    alternate_mobile TEXT,
    email           TEXT,
    aadhaar_number  TEXT,
    voter_id        TEXT,
    -- Address
    address_line1   TEXT,
    address_line2   TEXT,
    district        TEXT,
    taluk           TEXT,
    village         TEXT,
    pincode         TEXT,
    state           TEXT    DEFAULT 'Tamil Nadu',
    -- Occupation
    occupation      TEXT,
    annual_income   NUMERIC(12, 2),
    is_unorganised  BOOLEAN DEFAULT TRUE,
    -- Registration
    registration_number TEXT UNIQUE,
    registration_date   DATE,
    registration_status TEXT DEFAULT 'PENDING'
                        CHECK (registration_status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED', 'SUSPENDED')),
    -- Welfare Board
    board_id        INTEGER REFERENCES welfare_boards(id),
    -- Meta
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(full_name);
CREATE INDEX IF NOT EXISTS idx_workers_mobile ON workers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_workers_board ON workers(board_id);

-- ============================================================
-- 4. Family Members
-- ============================================================
CREATE TABLE IF NOT EXISTS family_members (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    full_name       TEXT    NOT NULL,
    relationship    TEXT    NOT NULL,
    date_of_birth   DATE,
    gender          TEXT,
    is_dependent    BOOLEAN DEFAULT TRUE,
    occupation      TEXT,
    annual_income   NUMERIC(12, 2),
    disability      BOOLEAN DEFAULT FALSE,
    disability_percentage NUMERIC(5, 2),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_worker ON family_members(worker_id);

-- ============================================================
-- 5. Education Records
-- ============================================================
CREATE TABLE IF NOT EXISTS education_records (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER REFERENCES workers(id) ON DELETE CASCADE,
    family_member_id INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
    institution     TEXT,
    qualification   TEXT,
    field_of_study  TEXT,
    year_of_passing INTEGER,
    percentage      NUMERIC(5, 2),
    is_currently_studying BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. Welfare Schemes
-- ============================================================
CREATE TABLE IF NOT EXISTS welfare_schemes (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL,
    category_id     INTEGER REFERENCES scheme_categories(id),
    board_id        INTEGER REFERENCES welfare_boards(id),
    description     TEXT,
    benefits        TEXT,
    eligibility_criteria TEXT,
    required_documents TEXT,
    application_process TEXT,
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemes_category ON welfare_schemes(category_id);
CREATE INDEX IF NOT EXISTS idx_schemes_board ON welfare_schemes(board_id);

-- ============================================================
-- 7. Scheme Benefits
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_benefits (
    id              SERIAL PRIMARY KEY,
    scheme_id       INTEGER NOT NULL REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    benefit_type    TEXT    NOT NULL,
    amount          NUMERIC(12, 2),
    description     TEXT,
    frequency       TEXT,
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. Scheme Qualifications
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_qualifications (
    id              SERIAL PRIMARY KEY,
    scheme_id       INTEGER NOT NULL REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    criterion_type  TEXT    NOT NULL,
    criterion_value TEXT,
    min_value       NUMERIC(12, 2),
    max_value       NUMERIC(12, 2),
    is_mandatory    BOOLEAN DEFAULT TRUE,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. Scheme Rules
-- ============================================================
CREATE TABLE IF NOT EXISTS scheme_rules (
    id              SERIAL PRIMARY KEY,
    scheme_id       INTEGER NOT NULL REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    rule_type       TEXT    NOT NULL,
    rule_expression TEXT,
    rule_value      TEXT,
    priority        INTEGER DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. Welfare Board Scheme Mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS board_schemes (
    id              SERIAL PRIMARY KEY,
    board_id        INTEGER NOT NULL REFERENCES welfare_boards(id) ON DELETE CASCADE,
    scheme_id       INTEGER NOT NULL REFERENCES welfare_schemes(id) ON DELETE CASCADE,
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, scheme_id)
);

-- ============================================================
-- 11. Worker Registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_registrations (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    board_id        INTEGER NOT NULL REFERENCES welfare_boards(id),
    registration_number TEXT UNIQUE NOT NULL,
    registration_date   DATE    NOT NULL,
    expiry_date         DATE,
    status          TEXT    NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED', 'SUSPENDED')),
    renewal_status  TEXT    DEFAULT 'NOT_DUE'
                    CHECK (renewal_status IN ('NOT_DUE', 'DUE', 'OVERDUE', 'RENEWED')),
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_worker ON worker_registrations(worker_id);
CREATE INDEX IF NOT EXISTS idx_registrations_board ON worker_registrations(board_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON worker_registrations(status);

-- ============================================================
-- 12. Eligibility Evaluations
-- ============================================================
CREATE TABLE IF NOT EXISTS eligibility_evaluations (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    scheme_id       INTEGER NOT NULL REFERENCES welfare_schemes(id),
    family_member_id INTEGER REFERENCES family_members(id),
    is_eligible     BOOLEAN DEFAULT FALSE,
    score           NUMERIC(5, 2),
    criteria_met    JSONB,
    criteria_failed JSONB,
    recommendations TEXT,
    evaluated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. Cases
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL PRIMARY KEY,
    case_number     TEXT    UNIQUE NOT NULL,
    title           TEXT    NOT NULL,
    description     TEXT,
    worker_id       INTEGER NOT NULL REFERENCES workers(id),
    scheme_id       INTEGER REFERENCES welfare_schemes(id),
    scheme_variant_id INTEGER,
    claimant_id     INTEGER,
    claimant_type   TEXT    DEFAULT 'WORKER'
                    CHECK (claimant_type IN ('WORKER', 'FAMILY_MEMBER')),
    status          TEXT    NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'PENDING_DOCUMENTS',
                                      'APPROVED', 'REJECTED', 'CLOSED', 'REOPENED', 'COMPLETED')),
    priority        TEXT    DEFAULT 'MEDIUM'
                    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to     TEXT,
    created_by      TEXT,
    document_checklist JSONB,
    closure_reason  TEXT,
    opened_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_worker ON cases(worker_id);
CREATE INDEX IF NOT EXISTS idx_cases_scheme ON cases(scheme_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_number ON cases(case_number);

-- ============================================================
-- 14. Case Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS case_documents (
    id              SERIAL PRIMARY KEY,
    case_id         INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type   TEXT    NOT NULL,
    document_name   TEXT    NOT NULL,
    required        BOOLEAN DEFAULT TRUE,
    file_name       TEXT,
    file_path       TEXT,
    file_size       INTEGER,
    status          TEXT    DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    verified_by     TEXT,
    verified_at     TIMESTAMP,
    rejection_reason TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_case ON case_documents(case_id);

-- ============================================================
-- 15. Case Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS case_tasks (
    id              SERIAL PRIMARY KEY,
    case_id         INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    task_type       TEXT    NOT NULL,
    title           TEXT    NOT NULL,
    description     TEXT,
    status          TEXT    DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority        TEXT    DEFAULT 'MEDIUM'
                    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to     TEXT,
    due_date        DATE,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_case ON case_tasks(case_id);

-- ============================================================
-- 16. Case Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS case_notes (
    id              SERIAL PRIMARY KEY,
    case_id         INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author          TEXT    NOT NULL,
    content         TEXT    NOT NULL,
    is_internal     BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 17. Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    alert_type      TEXT    NOT NULL,
    title           TEXT    NOT NULL,
    message         TEXT    NOT NULL,
    severity        TEXT    DEFAULT 'INFO'
                    CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    is_read         BOOLEAN DEFAULT FALSE,
    worker_id       INTEGER REFERENCES workers(id),
    case_id         INTEGER REFERENCES cases(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);

-- ============================================================
-- 18. Reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
    id              SERIAL PRIMARY KEY,
    title           TEXT    NOT NULL,
    description     TEXT,
    reminder_type   TEXT    NOT NULL,
    due_date        TIMESTAMP NOT NULL,
    is_completed    BOOLEAN DEFAULT FALSE,
    worker_id       INTEGER REFERENCES workers(id),
    case_id         INTEGER REFERENCES cases(id),
    assigned_to     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(is_completed);

-- ============================================================
-- 19. Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
    id              SERIAL PRIMARY KEY,
    setting_key     TEXT    UNIQUE NOT NULL,
    setting_value   TEXT,
    setting_type    TEXT    DEFAULT 'string',
    description     TEXT,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 20. Users — Authorized accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        TEXT    NOT NULL UNIQUE,
    email           TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'STAFF'
                    CHECK (role IN ('ADMIN', 'STAFF')),
    is_active       SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP,
    password_changed_at TIMESTAMP,
    profile_picture TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- 21. Login Attempts — Rate limiting
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id              SERIAL PRIMARY KEY,
    identifier      TEXT    NOT NULL,
    ip_address      TEXT,
    success         SMALLINT NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
    attempted_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- ============================================================
-- 22. Sessions — Persistent session storage (for Cloud Functions)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id              SERIAL PRIMARY KEY,
    token           TEXT    NOT NULL UNIQUE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username        TEXT    NOT NULL,
    role            TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
