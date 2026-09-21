-- ============================================================
-- Phase 7 Migration — Case Management, Documents & Tasks
-- Nalavariyam Smart Welfare Assistant
-- ============================================================
-- SAFE MIGRATION: Uses CREATE TABLE IF NOT EXISTS only.
-- No existing tables are dropped or modified.
-- No existing data is deleted.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Cases — Core case management table
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
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
    opened_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    closed_at           TEXT,
    created_by          TEXT,                         -- Staff who created the case
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    closure_reason      TEXT
                        CHECK (closure_reason IS NULL OR closure_reason IN (
                            'BENEFIT_PROCESSED',
                            'NOT_ELIGIBLE',
                            'APPLICANT_WITHDREW',
                            'DUPLICATE_CASE',
                            'NO_RESPONSE',
                            'OTHER'
                        )),

    FOREIGN KEY (worker_id)       REFERENCES workers(id),
    FOREIGN KEY (scheme_id)       REFERENCES welfare_schemes(id),
    FOREIGN KEY (scheme_variant_id) REFERENCES scheme_qualifications(id)
);

CREATE INDEX IF NOT EXISTS idx_cases_worker      ON cases(worker_id);
CREATE INDEX IF NOT EXISTS idx_cases_scheme      ON cases(scheme_id);
CREATE INDEX IF NOT EXISTS idx_cases_status      ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority    ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_created     ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_number      ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_assigned    ON cases(assigned_to);

-- ============================================================
-- 2. Case Documents — Document checklist and tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS case_documents (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_casedocs_case   ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_casedocs_status ON case_documents(status);

-- ============================================================
-- 3. Case Tasks — Follow-up tasks, verification tasks, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS case_tasks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_casetasks_case   ON case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_casetasks_status ON case_tasks(status);
CREATE INDEX IF NOT EXISTS idx_casetasks_due    ON case_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_casetasks_type   ON case_tasks(task_type);

-- ============================================================
-- 4. Case Notes — Internal staff notes
-- ============================================================
CREATE TABLE IF NOT EXISTS case_notes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id             INTEGER NOT NULL,
    author              TEXT    NOT NULL,
    content             TEXT    NOT NULL,
    is_internal         INTEGER NOT NULL DEFAULT 1 CHECK (is_internal IN (0, 1)),
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_casenotes_case ON case_notes(case_id);

-- ============================================================
-- 5. Case Activity Log — Timeline of all case events
-- ============================================================
CREATE TABLE IF NOT EXISTS case_activity_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_activity_case   ON case_activity_log(case_id);
CREATE INDEX IF NOT EXISTS idx_case_activity_type   ON case_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_case_activity_created ON case_activity_log(created_at);

-- ============================================================
-- 6. System Settings — Case Management defaults
-- ============================================================
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('case_inactivity_days', '14', 'number', 'case_management', 'Days of inactivity before generating follow-up alert'),
    ('case_default_priority', 'MEDIUM', 'string', 'case_management', 'Default priority for new cases'),
    ('case_default_task_priority', 'MEDIUM', 'string', 'case_management', 'Default priority for new tasks'),
    ('case_auto_alerts_enabled', 'true', 'boolean', 'case_management', 'Enable automatic case alerts'),
    ('case_document_reminders_enabled', 'true', 'boolean', 'case_management', 'Enable document verification reminders');
