-- ============================================================
-- Phase 12 Migration — Renewal History Tracking
-- Safe migration: no data destroyed
-- ============================================================

-- 1. Renewal History — tracks each renewal event for a worker's registration
CREATE TABLE IF NOT EXISTS renewal_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_renewal_history_worker ON renewal_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_registration ON renewal_history(registration_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_created ON renewal_history(created_at);

-- 2. Add last_reviewed_at and last_reviewed_by to workers if not already present
-- (Phase 11 migration may have already added these)
-- Safe: PRAGMA table_info check done in Python, not SQL
