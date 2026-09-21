-- ============================================================
-- Firebase Migration — Database-Backed Sessions
-- Nalavariyam Smart Welfare Assistant
-- ============================================================
-- Cloud Functions are stateless — in-memory sessions don't
-- persist across invocations. This migration adds a sessions
-- table so auth tokens are stored in the database.
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. Sessions — Persistent session storage
CREATE TABLE IF NOT EXISTS sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    token           TEXT    NOT NULL UNIQUE,
    user_id         INTEGER NOT NULL,
    username        TEXT    NOT NULL,
    role            TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at      TEXT    NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
