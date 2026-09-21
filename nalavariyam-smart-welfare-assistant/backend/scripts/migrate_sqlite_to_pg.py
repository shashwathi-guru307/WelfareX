#!/usr/bin/env python3
"""
One-shot data migration: local SQLite  ->  PostgreSQL (Supabase).

Copies every table's rows from the local SQLite database into the
PostgreSQL database configured via DATABASE_URL in .env (schema must
already exist — run the app once, or app.db_init.ensure_schema()).

- Preserves all IDs (worker references, foreign keys stay intact).
- TRUNCATEs each PG table first (RESTART IDENTITY CASCADE), so it is
  safe to re-run for a clean re-migration.
- Resets every SERIAL sequence to max(id) after import, so new inserts
  continue after the migrated data.

Usage:
  python backend/scripts/migrate_sqlite_to_pg.py            # do it
  python backend/scripts/migrate_sqlite_to_pg.py --dry-run  # show counts only
"""
import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from dotenv import load_dotenv

load_dotenv(os.path.join(BASE_DIR, ".env"))

from app.database import (  # noqa: E402
    USE_POSTGRES, DATABASE_PATH, execute_script, execute, fetch_one,
)

SKIP_SEED_TABLES = set()  # all tables are truncated & copied from SQLite


def get_tables(sqlite_con):
    rows = sqlite_con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    return [r[0] for r in rows]


def get_columns(sqlite_con, table):
    return [r[1] for r in sqlite_con.execute(f"PRAGMA table_info({table})").fetchall()]


def main():
    dry_run = "--dry-run" in sys.argv

    if not USE_POSTGRES:
        print("ERROR: DATABASE_URL is not configured in .env — nothing to migrate to.")
        sys.exit(1)

    if not os.path.exists(DATABASE_PATH):
        print(f"ERROR: SQLite database not found at {DATABASE_PATH}")
        sys.exit(1)

    con = sqlite3.connect(DATABASE_PATH)
    con.row_factory = sqlite3.Row
    tables = get_tables(con)
    print(f"Source: {DATABASE_PATH}")
    print(f"Target: PostgreSQL (from DATABASE_URL)")
    print(f"Tables: {len(tables)}")

    if dry_run:
        total = 0
        for t in tables:
            c = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            total += c
            print(f"  {t}: {c}")
        print(f"Total: {total} rows would be migrated.")
        return

    # Import order: same topological concerns as schema — but we TRUNCATE
    # ... CASCADE and insert with FKs deferred via session_replication_role.
    print("\nTruncating target tables...")
    all_tables = ", ".join(tables)
    execute_script(f"TRUNCATE TABLE {all_tables} RESTART IDENTITY CASCADE;")

    # Bypass FK enforcement during copy so row order never matters
    execute_script("SET session_replication_role = replica;")

    print("Copying rows...")
    grand_total = 0
    for t in tables:
        cols = get_columns(con, t)
        rows = con.execute(f"SELECT {', '.join(cols)} FROM {t}").fetchall()
        if not rows:
            print(f"  {t}: 0")
            continue
        col_list = ", ".join(cols)
        placeholders = ", ".join(["?"] * len(cols))
        inserted = 0
        for r in rows:
            try:
                execute(
                    f"INSERT INTO {t} ({col_list}) VALUES ({placeholders})",
                    tuple(r),
                )
                inserted += 1
            except Exception as e:
                print(f"  [FAIL] {t} row: {e}")
                print(f"         data: {dict(r)}")
        grand_total += inserted
        print(f"  {t}: {inserted}")

    # Restore FK enforcement
    execute_script("SET session_replication_role = origin;")

    # Resync every SERIAL sequence so new inserts don't collide with migrated IDs
    print("\nResyncing sequences...")
    seqs = fetch_one(
        "SELECT string_agg(sequencename, ',') AS s FROM pg_sequences WHERE schemaname='public'"
    )
    if seqs and seqs["s"]:
        for seq in seqs["s"].split(","):
            table = seq.replace("_id_seq", "")
            try:
                execute_script(
                    f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table}), 1));"
                )
            except Exception as e:
                print(f"  [WARN] {seq}: {e}")

    con.close()

    # Verify
    print("\nVerification (SQLite -> PostgreSQL):")
    con = sqlite3.connect(DATABASE_PATH)
    mismatches = 0
    for t in tables:
        src = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        dst = fetch_one(f"SELECT COUNT(*) AS c FROM {t}")["c"]
        status = "OK" if src == dst else "MISMATCH"
        if src != dst:
            mismatches += 1
        print(f"  {t}: {src} -> {dst} [{status}]")
    con.close()

    print(f"\nMigrated {grand_total} rows." + (f" {mismatches} MISMATCHES!" if mismatches else " All counts match."))


if __name__ == "__main__":
    main()
