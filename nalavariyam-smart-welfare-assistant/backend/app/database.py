"""
Database connection module for Nalavariyam Smart Welfare Assistant.

Supports:
  - PostgreSQL / Supabase (production) via psycopg2
  - SQLite (development fallback) via built-in sqlite3

Configure via environment variables (loaded from .env by python-dotenv
in server.py / main.py):
  DATABASE_URL  — postgres://... or postgresql://... connection string.
                  If missing, falls back to local SQLite for offline dev.
  DATABASE_PATH — local SQLite file path (fallback only, default).
"""

import os
import sqlite3
from urllib.parse import urlsplit, urlunsplit, quote as _urlquote
from contextlib import contextmanager
from typing import Any, Optional

import psycopg2
import psycopg2.extras as psycopg2_st  # noqa: F401  (module ref for exception types)

# ============================================================
# Configuration
# ============================================================


def normalize_database_url(raw_url: str) -> str:
    """Normalize a DATABASE_URL so it always works with psycopg2.

    Handles the common deployment pitfalls:
      1. Scheme upgrade: "postgres://" → "postgresql://"
         (older drivers/tools emit postgres://; psycopg2 and most
         platforms expect postgresql://).
      2. Supabase copy/paste leftovers: passwords wrapped in literal
         brackets, e.g.  postgres://postgres:[YOUR-PASSWORD]@host/...
         → strips the brackets.
      3. Unencoded special characters in the password (like @ or /)
         that break URL parsing → percent-encode the password properly.
      4. Ensures sslmode is present for cloud providers when not set
         (Supabase/Neon require SSL; local Postgres ignores it).
    """
    if not raw_url:
        return raw_url

    url = raw_url.strip()

    # 1. postgres:// → postgresql://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    if not url.startswith("postgresql://"):
        return url  # not a postgres URL we can parse — pass through

    # 2 & 3. Parse manually so we can fix the password safely.
    #     postgresql://user:pass@host:port/db?params
    try:
        scheme, rest = url.split("://", 1)
        netloc, _, query = rest.partition("?")
    except ValueError:
        return url

    # Supabase template brackets: [YOUR-PASSWORD] → YOUR-PASSWORD
    netloc = netloc.replace("[", "").replace("]", "")

    userinfo, sep, hostport = netloc.rpartition("@")
    if sep:
        user, _, password = userinfo.partition(":")
        if password and ("%" not in password):
            # Password contains raw special chars → percent-encode.
            # (If it's already encoded this would double-encode.)
            if any(c in password for c in "@/:?#[]"):
                password = _urlquote(password, safe="")
        netloc = f"{user}:{password}@{hostport}" if password else user + "@" + hostport
    else:
        netloc = userinfo or hostport

    url = f"{scheme}://{netloc}"
    if query:
        url += "?" + query

    # 4. Default sslmode=require for cloud databases unless already set.
    #    Supabase enforces SSL; local postgres just ignores the param.
    if "sslmode" not in url:
        is_local = any(h in url for h in ("localhost", "127.0.0.1", "::1"))
        if not is_local:
            url += ("&" if "?" in url else "?") + "sslmode=require"

    return url


DATABASE_URL = normalize_database_url(os.environ.get("DATABASE_URL", ""))
DATABASE_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "database", "nalavariyam.db"),
)

USE_POSTGRES = DATABASE_URL.startswith("postgres")


# ============================================================
# SQLite → PostgreSQL query translation
# ============================================================
# The application SQL was originally written for SQLite (? placeholders,
# datetime('now'), case-insensitive LIKE). This layer translates those
# constructs so the same queries run on PostgreSQL (e.g. Neon / Cloud SQL).

import re as _re

_DATETIME_NOW_RE = _re.compile(r"\bdatetime\('now'\)", _re.IGNORECASE)
# datetime('now', ?) with a bound modifier like '-14 days' (SQLite modifer syntax)
_DATETIME_NOW_PARAM_RE = _re.compile(
    r"\bdatetime\(\s*'now'\s*,\s*%s\s*\)", _re.IGNORECASE
)
_DATE_NOW_RE = _re.compile(r"\bdate\(\s*'now'\s*\)", _re.IGNORECASE)
# date(<expr>) on a column/timestamp (e.g. date(created_at)) -> (<expr>)::date
_DATE_EXPR_RE = _re.compile(r"\bdate\(\s*(?!\s*'now'\s*\))(.+?)\s*\)", _re.IGNORECASE)


def _translate_query_for_pg(query: str) -> str:
    """Translate SQLite-style SQL to PostgreSQL-compatible SQL."""
    # ? placeholders -> %s
    q = _translate_placeholders(query)
    # datetime('now', ?) with SQLite modifier param -> NOW() + interval
    # (modifier like '-14 days' -> interval '-14 days' AFTER placeholder swap)
    q = _DATETIME_NOW_PARAM_RE.sub(
        lambda m: "(NOW() + CAST(%s AS interval))", q
    )
    # datetime('now') -> NOW()
    q = _DATETIME_NOW_RE.sub("NOW()", q)
    # date('now') -> CURRENT_DATE (works for DATE columns)
    q = _DATE_NOW_RE.sub("CURRENT_DATE", q)
    # date(<expr>) -> (<expr>)::date (SQLite date() on a timestamp/text value)
    q = _DATE_EXPR_RE.sub(r"(\1)::date", q)
    # SQLite LIKE is case-insensitive; Postgres LIKE is not -> use ILIKE
    q = _re.sub(r"\bLIKE\b", "ILIKE", q)
    return q


def _translate_placeholders(query: str) -> str:
    """Convert ? placeholders to %s, skipping ? inside string literals."""
    if "?" not in query:
        return query
    out = []
    in_string = False
    for ch in query:
        if ch == "'":
            in_string = not in_string
            out.append(ch)
        elif ch == "?" and not in_string:
            out.append("%s")
        else:
            out.append(ch)
    return "".join(out)


# ============================================================
# PostgreSQL helpers (lazy import — only loaded when needed)
# ============================================================

# Pooled connections: opening a fresh TLS connection to a remote
# PostgreSQL (e.g. Neon) for every query costs ~0.5–1.5s per query,
# which makes pages take tens of seconds. We keep a small pool of
# warm connections instead.
_pg_pool = None


def _get_pg_pool():
    """Lazily create the thread-safe connection pool."""
    global _pg_pool
    if _pg_pool is None:
        import psycopg2.pool
        _pg_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1, maxconn=10, dsn=DATABASE_URL,
        )
    return _pg_pool


def _pg_conn_is_alive(conn) -> bool:
    """Check a pooled connection is still usable (remote servers drop idle ones)."""
    if conn.closed:
        return False
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.rollback()
        return True
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        return False


def _get_pg_connection():
    """Get a PostgreSQL connection from the pool.

    No liveness pre-check round-trip: that doubles the queries per
    request over a high-latency link (Neon in Singapore from India is
    ~150ms per round-trip). Instead, stale connections surface as
    OperationalError in fetch_one/fetch_all/execute, which retry once
    on a fresh connection.
    """
    import psycopg2
    try:
        pool = _get_pg_pool()
        conn = pool.getconn()
        conn.autocommit = True
        return conn
    except Exception:
        pass  # pool unavailable — fall through to a direct connection
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn


def _put_pg_connection(conn, discard: bool = False) -> None:
    """Return a connection to the pool (or close it if the pool is gone / broken)."""
    try:
        if _pg_pool is not None:
            _pg_pool.putconn(conn, close=discard)
            return
    except Exception:
        pass
    try:
        conn.close()
    except Exception:
        pass


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
            # autocommit is enabled on pooled/direct connections; every
            # helper runs exactly one statement, so no explicit commit is
            # needed — skipping it saves a round-trip per query (~80ms on
            # high-latency remote databases).
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            _put_pg_connection(conn)
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
    for attempt in (1, 2):
        with get_connection() as (conn, db_type):
            if db_type == "postgres":
                cur = conn.cursor()
                try:
                    cur.execute(_translate_query_for_pg(query), params)
                    row = cur.fetchone()
                    return _pg_row_to_dict(cur, row)
                except psycopg2.errors.OperationalError:
                    # Stale pooled connection (remote server closed it) — retry on a fresh one
                    conn.rollback()
                    _put_pg_connection(conn, discard=True)
                    if attempt == 2:
                        raise
                    continue
            else:
                cursor = conn.execute(query, params)
                row = cursor.fetchone()
                return dict(row) if row else None
    return None


def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a query and return all rows as a list of dictionaries."""
    for attempt in (1, 2):
        with get_connection() as (conn, db_type):
            if db_type == "postgres":
                cur = conn.cursor()
                try:
                    cur.execute(_translate_query_for_pg(query), params)
                    rows = cur.fetchall()
                    return _pg_rows_to_dicts(cur, rows)
                except psycopg2.errors.OperationalError:
                    conn.rollback()
                    _put_pg_connection(conn, discard=True)
                    if attempt == 2:
                        raise
                    continue
            else:
                cursor = conn.execute(query, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
    return []


def execute(query: str, params: tuple = ()) -> int:
    """
    Execute an INSERT/UPDATE/DELETE query and return the row ID or
    affected row count.
    """
    with get_connection() as (conn, db_type):
        if db_type == "postgres":
            cur = conn.cursor()
            query_type = query.strip().split()[0].upper()
            pg_query = _translate_query_for_pg(query)
            if query_type == "INSERT":
                # Append RETURNING id so callers get the generated row id
                if "RETURNING" not in pg_query.upper():
                    pg_query = pg_query.rstrip().rstrip(";") + " RETURNING id"
                cur.execute(pg_query, params)
                try:
                    result = cur.fetchone()
                    if result:
                        return result[0]
                except Exception:
                    pass
                return cur.rowcount
            cur.execute(pg_query, params)
            if query_type in ("DELETE", "UPDATE"):
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
            cur.executemany(_translate_query_for_pg(query), params_list)
        else:
            conn.executemany(query, params_list)
            conn.commit()


def execute_script(sql_script: str) -> None:
    """Execute a multi-statement SQL script (used for migrations)."""
    if USE_POSTGRES:
        conn = _get_pg_connection()
        try:
            cur = conn.cursor()
            cur.execute(sql_script)
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            _put_pg_connection(conn)
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
