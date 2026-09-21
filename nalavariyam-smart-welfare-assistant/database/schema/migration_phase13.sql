-- ============================================================
-- Phase 13 — Multi-User Google OAuth + Admin Approval Flow
-- ============================================================
-- Adds Google OAuth support, registration request/approval,
-- and user-scoped data isolation.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Update users table — add Google OAuth fields
-- ============================================================

-- google_id: unique identifier from Google OAuth
ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- avatar_url: Google profile picture
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- approval_status: PENDING → APPROVED → REJECTED
ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- requested_at: when the user requested access
ALTER TABLE users ADD COLUMN requested_at TEXT;

-- approved_at: when the admin approved access
ALTER TABLE users ADD COLUMN approved_at TEXT;

-- approved_by: which admin approved (user id)
ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id);

-- rejection_reason: why access was rejected
ALTER TABLE users ADD COLUMN rejection_reason TEXT;

-- ============================================================
-- 2. Registration Requests table
-- ============================================================
-- Tracks pending access requests from new users.
CREATE TABLE IF NOT EXISTS registration_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id       TEXT    NOT NULL,
    email           TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    avatar_url      TEXT,
    status          TEXT    NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    reviewed_at     TEXT,
    reviewed_by     INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_reg_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_reg_requests_google ON registration_requests(google_id);

-- ============================================================
-- 3. Add user_id to workers table for data isolation
-- ============================================================
-- Each worker record is owned by the user who created it.
-- NULL means legacy data (visible to all approved users).
ALTER TABLE workers ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_workers_user ON workers(created_by_user_id);

-- ============================================================
-- 4. Add user_id to cases table for data isolation
-- ============================================================
ALTER TABLE cases ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
