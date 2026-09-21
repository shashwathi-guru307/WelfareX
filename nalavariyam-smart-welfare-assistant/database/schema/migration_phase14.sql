-- ============================================================
-- Phase 14 — Per-User Data Isolation
-- ============================================================
-- Adds created_by_user_id to workers, cases, reminders so
-- each user only sees their own data. Admin sees everything.
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. Workers — add created_by_user_id
ALTER TABLE workers ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_workers_created_by ON workers(created_by_user_id);

-- 2. Cases — add created_by_user_id
ALTER TABLE cases ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by_user_id);

-- 3. Reminders — add created_by_user_id
ALTER TABLE reminders ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by_user_id);
