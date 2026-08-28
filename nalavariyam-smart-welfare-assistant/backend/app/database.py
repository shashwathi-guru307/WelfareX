"""
Database connection module for Nalavariyam Smart Welfare Assistant.

Supports:
  - SQLite (development) via built-in sqlite3
  - PostgreSQL (production) via psycopg2

Configure via environment variables:
  DATABASE_URL  — postgres://... connection string (production)
  DATABASE_PATH — local SQLite file path (development, default)
"""

import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Optional

# ============================================================
# Configuration
# ============================================================

DATABASE_URL = os.environ.get("DATABASE_URL", "")
DATABASE_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "database", "nalavariyam.db"),
)

USE_POSTGRES = DATABASE_URL.startswith("postgres")


# ============================================================
# PostgreSQL helpers (lazy import — only loaded when needed)
# ============================================================

def _get_pg_connection():
    """Create a PostgreSQL connection using psycopg2."""
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def _pg_row_to_dict(cursor, row):
    """Convert a psycopg2 row to a dict using cursor.description."""
    if row is None:
        return None
    columns = [desc[0] for desc in cursor.description]
    return dict(zip(columns, row))


def _pg_rows_to_dicts(cursor, rows):
    """Convert a list of psycopg2 rows to dicts."""
    if not rows:
        return []
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in rows]


# ============================================================
# SQLite helpers
# ============================================================

def _get_sqlite_connection() -> sqlite3.Connection:
    """Create a SQLite connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ============================================================
# Unified connection context manager
# ============================================================

@contextmanager
def get_connection():
    """
    Context manager that yields (connection, db_type) where db_type
    is 'sqlite' or 'postgres'.
    """
    if USE_POSTGRES:
        conn = _get_pg_connection()
        try:
            yield conn, "postgres"
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        conn = _get_sqlite_connection()
        try:
            yield conn, "sqlite"
        finally:
            conn.close()


# ============================================================
# Unified query functions
# ============================================================

def fetch_one(query: str, params: tuple = ()) -> Optional[dict]:
    """Execute a query and return a single row as a dictionary."""
    with get_connection() as (conn, db_type):
        if db_type == "postgres":
            cur = conn.cursor()
            cur.execute(query, params)
            row = cur.fetchone()
            return _pg_row_to_dict(cur, row)
        else:
            cursor = conn.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None


def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a query and return all rows as a list of dictionaries."""
    with get_connection() as (conn, db_type):
        if db_type == "postgres":
            cur = conn.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()
            return _pg_rows_to_dicts(cur, rows)
        else:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]


def execute(query: str, params: tuple = ()) -> int:
    """
    Execute an INSERT/UPDATE/DELETE query and return the row ID or
    affected row count.
    """
    with get_connection() as (conn, db_type):
        if db_type == "postgres":
            cur = conn.cursor()
            cur.execute(query, params)
            query_type = query.strip().split()[0].upper()
            if query_type == "INSERT":
                # Try to get the inserted row id
                try:
                    result = cur.fetchone()
                    if result:
                        return result[0]
                except Exception:
                    pass
                return cur.rowcount
            elif query_type in ("DELETE", "UPDATE"):
                return cur.rowcount
            return 0
        else:
            cursor = conn.execute(query, params)
            conn.commit()
            query_type = query.strip().split()[0].upper()
            if query_type in ("DELETE", "UPDATE"):
                return cursor.rowcount
            return cursor.lastrowid


def execute_many(query: str, params_list: list[tuple]) -> None:
    """Execute a query with multiple parameter sets."""
    with get_connection() as (conn, db_type):
        if db_type == "postgres":
            cur = conn.cursor()
            cur.executemany(query, params_list)
        else:
            conn.executemany(query, params_list)
            conn.commit()


def execute_script(sql_script: str) -> None:
    """Execute a multi-statement SQL script (used for migrations)."""
    if USE_POSTGRES:
        import psycopg2
        conn = _get_pg_connection()
        try:
            cur = conn.cursor()
            cur.execute(sql_script)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        conn = _get_sqlite_connection()
        try:
            conn.executescript(sql_script)
        finally:
            conn.close()


def get_database_info() -> dict:
    """Return information about the current database connection."""
    if USE_POSTGRES:
        return {
            "type": "postgresql",
            "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "configured",
            "path": None,
        }
    else:
        return {
            "type": "sqlite",
            "url": None,
            "path": os.path.abspath(DATABASE_PATH),
        }
