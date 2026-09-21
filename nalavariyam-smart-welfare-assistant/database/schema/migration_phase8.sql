-- ============================================================
-- Phase 8 Migration — Authentication & User Management
-- Nalavariyam Smart Welfare Assistant
-- ============================================================
-- SAFE MIGRATION: Uses CREATE TABLE IF NOT EXISTS only.
-- No existing tables are dropped or modified.
-- No existing data is deleted.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Users — Authorized accounts (exactly 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    email           TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    display_name    TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'STAFF'
                    CHECK (role IN ('ADMIN', 'STAFF')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login_at   TEXT,
    password_changed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- 2. Login Attempts — Rate limiting
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier      TEXT    NOT NULL,               -- email or username attempted
    ip_address      TEXT,
    success         INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
    attempted_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);
