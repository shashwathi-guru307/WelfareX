#!/usr/bin/env python3
"""
Generate database/schema/schema_pg.sql from the local SQLite database.

Reads the DDL of every table/index in the SQLite database (which includes
all applied phase migrations) and translates it to idempotent PostgreSQL DDL:

  - INTEGER PRIMARY KEY AUTOINCREMENT  ->  SERIAL PRIMARY KEY
  - DEFAULT (datetime('now'))          ->  DEFAULT NOW()
  - TEXT                                ->  TEXT
  - INTEGER                             ->  INTEGER
  - REAL                                ->  DOUBLE PRECISION
  - CREATE TABLE IF NOT EXISTS          ->  kept as-is (idempotent)
  - CREATE INDEX ...                    ->  CREATE INDEX IF NOT EXISTS ...
  - PRAGMA lines                        ->  dropped

Tables are emitted in foreign-key dependency order so the file can be run
in one pass against a fresh Supabase project. Indexes are emitted after
all tables.

Usage:
  python backend/scripts/sqlite_to_pg_schema.py
"""
import os
import re
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "database", "nalavariyam.db")
OUT_PATH = os.path.join(BASE_DIR, "database", "schema", "schema_pg.sql")

HEADER = """-- ============================================================
-- Nalavariyam Smart Welfare Assistant — PostgreSQL Schema
-- ============================================================
-- Generated from the local SQLite schema by
-- backend/scripts/sqlite_to_pg_schema.py — do not edit by hand.
-- Fully idempotent: safe to run on every server startup
-- (see backend/app/db_init.py) and against a fresh Supabase project.
-- ============================================================
"""


def translate_ddl(ddl: str) -> str:
    """Translate one SQLite CREATE TABLE statement to PostgreSQL."""
    sql = ddl

    # Drop SQLite-only pragmas inside statements (defensive)
    sql = re.sub(r"(?im)^\s*PRAGMA .*?;?\s*$", "", sql)

    # AUTOINCREMENT
    sql = re.sub(
        r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
        "SERIAL PRIMARY KEY",
        sql,
        flags=re.IGNORECASE,
    )

    # DEFAULT (datetime('now')) / DEFAULT CURRENT_TIMESTAMP
    sql = re.sub(
        r"DEFAULT\s*\(\s*datetime\s*\(\s*'now'\s*\)\s*\)",
        "DEFAULT NOW()",
        sql,
        flags=re.IGNORECASE,
    )
    sql = re.sub(r"DEFAULT\s+CURRENT_TIMESTAMP", "DEFAULT NOW()", sql, flags=re.IGNORECASE)
    sql = re.sub(
        r"DEFAULT\s*\(\s*date\s*\(\s*'now'\s*\)\s*\)",
        "DEFAULT CURRENT_DATE",
        sql,
        flags=re.IGNORECASE,
    )

    # SQLite REAL -> DOUBLE PRECISION
    sql = re.sub(r"\bREAL\b", "DOUBLE PRECISION", sql, flags=re.IGNORECASE)

    # Always idempotent: CREATE TABLE x -> CREATE TABLE IF NOT EXISTS x
    sql = re.sub(
        r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?",
        "CREATE TABLE IF NOT EXISTS ",
        sql,
        count=1,
        flags=re.IGNORECASE,
    )

    return sql


def extract_dependencies(ddl: str) -> set:
    """Return the set of tables this DDL references via FOREIGN KEY."""
    return set(
        m.lower()
        for m in re.findall(
            r"REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)", ddl, flags=re.IGNORECASE
        )
    )


def index_statements(conn: sqlite3.Connection) -> list:
    rows = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name"
    ).fetchall()
    out = []
    for (sql,) in rows:
        s = sql.strip()
        if not s:
            continue
        # Idempotent
        if re.search(r"CREATE\s+UNIQUE\s+INDEX\s+", s, re.IGNORECASE):
            s = re.sub(
                r"CREATE\s+UNIQUE\s+INDEX\s+(IF\s+NOT\s+EXISTS\s+)?",
                "CREATE UNIQUE INDEX IF NOT EXISTS ",
                s,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            s = re.sub(
                r"CREATE\s+INDEX\s+(IF\s+NOT\s+EXISTS\s+)?",
                "CREATE INDEX IF NOT EXISTS ",
                s,
                count=1,
                flags=re.IGNORECASE,
            )
        out.append(s)
    return out


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: SQLite database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    tables = conn.execute(
        "SELECT name, sql FROM sqlite_master "
        "WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL "
        "ORDER BY name"
    ).fetchall()

    print(f"Source SQLite database: {DB_PATH}")
    print(f"Tables found: {len(tables)}")

    # Topological sort on FK dependencies (self-references ignored)
    name_to_row = {r["name"].lower(): r for r in tables}
    ordered = []
    visited = set()
    in_progress = set()

    def visit(name_lower: str):
        if name_lower in visited or name_lower not in name_to_row:
            return
        if name_lower in in_progress:
            return  # self-reference — safe to emit
        in_progress.add(name_lower)
        row = name_to_row[name_lower]
        deps = extract_dependencies(row["sql"])
        for dep in sorted(deps):
            if dep != name_lower:
                visit(dep)
        in_progress.discard(name_lower)
        visited.add(name_lower)
        ordered.append(row)

    for r in tables:
        visit(r["name"].lower())

    parts = [HEADER]

    table_ddls = []
    for row in ordered:
        ddl = translate_ddl(row["sql"].strip())
        if not ddl.endswith(";"):
            ddl += ";"
        table_ddls.append(ddl + "\n")
    parts.extend(table_ddls)

    parts.append("\n-- ============================================================\n-- Indexes\n-- ============================================================\n")
    for s in index_statements(conn):
        parts.append(s + ";\n")

    conn.close()

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(parts))

    print(f"Wrote {len(ordered)} tables + indexes to {OUT_PATH}")
    print("Order:", ", ".join(r["name"] for r in ordered))


if __name__ == "__main__":
    main()
