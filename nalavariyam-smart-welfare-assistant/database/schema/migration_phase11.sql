-- ============================================================
-- Phase 11: Applicant & Family Management Improvements
-- Safe migration — uses IF NOT EXISTS for all CREATE statements
-- ============================================================

-- Add last reviewed tracking to workers table
ALTER TABLE workers ADD COLUMN last_reviewed_at TEXT;
ALTER TABLE workers ADD COLUMN last_reviewed_by TEXT;

-- Worker notes table
CREATE TABLE IF NOT EXISTS worker_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Staff',
    is_internal INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

CREATE INDEX IF NOT EXISTS idx_worker_notes_worker_id ON worker_notes(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_notes_created_at ON worker_notes(created_at);
