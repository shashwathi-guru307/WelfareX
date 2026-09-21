#!/usr/bin/env python3
"""
Export the live PostgreSQL schema to database/schema/schema_pg.sql.

Generates fully idempotent DDL (CREATE TABLE IF NOT EXISTS / CREATE INDEX
IF NOT EXISTS) so the file can be re-run safely by app.db_init.ensure_schema()
on every server startup, and against a fresh Supabase project to bootstrap
the whole schema.

Usage:
  python scripts/export_pg_schema.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env"))

from app.database import USE_POSTGRES, DATABASE_URL, fetch_all  # noqa: E402

OUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "database", "schema", "schema_pg.sql"
)

HEADER = """-- ============================================================
-- Nalavariyam Smart Welfare Assistant — PostgreSQL Schema
-- ============================================================
-- Generated from the live database by backend/scripts/export_pg_schema.py.
-- Fully idempotent: safe to run on every server startup
-- (see backend/app/db_init.py) and against a fresh Supabase project.
-- ============================================================
"""


def export():
    if not USE_POSTGRES:
        print("ERROR: DATABASE_URL not configured — this script exports from PostgreSQL.")
        sys.exit(1)

    tables = [r["table_name"] for r in fetch_all(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
    )]
    print(f"Found {len(tables)} tables: {', '.join(tables)}")

    parts = [HEADER]

    for t in tables:
        cols = fetch_all(
            """
            SELECT column_name, data_type, character_maximum_length,
                   numeric_precision, numeric_scale, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=?
            ORDER BY ordinal_position
            """,
            (t,),
        )
        # Primary key columns
        pk_rows = fetch_all(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema='public' AND tc.table_name=? AND tc.constraint_type='PRIMARY KEY'
            ORDER BY kcu.ordinal_position
            """,
            (t,),
        )
        pk_cols = [r["column_name"] for r in pk_rows]

        # CHECK constraints (skip PK/FK/UNIQUE which we handle separately)
        checks = fetch_all(
            """
            SELECT conname, pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE contype='c' AND conrelid = ?::regclass
            ORDER BY conname
            """,
            (f"public.{t}",),
        )

        lines = [f"CREATE TABLE IF NOT EXISTS {t} ("]
        col_defs = []
        for c in cols:
            name = c["column_name"]
            dt = c["data_type"]
            default = c["column_default"] or ""
            # SERIAL pattern: nextval('<table>_<col>_seq') on an integer column
            if "nextval(" in default:
                if name in pk_cols and len(pk_cols) == 1:
                    col_defs.append(f"    {name} SERIAL PRIMARY KEY")
                else:
                    col_defs.append(f"    {name} SERIAL")
                continue
            # Map internal types to friendly SQL types
            type_map = {
                "character varying": "VARCHAR",
                "timestamp without time zone": "TIMESTAMP",
                "timestamp with time zone": "TIMESTAMPTZ",
            }
            sql_type = type_map.get(dt, dt.upper())
            if dt == "character varying" and c["character_maximum_length"]:
                sql_type += f"({c['character_maximum_length']})"
            if dt == "numeric" and c["numeric_precision"]:
                scale = c["numeric_scale"] or 0
                sql_type += f"({c['numeric_precision']},{scale})"
            if dt == "array":
                sql_type = "TEXT[]"  # generic fallback

            pieces = [f"    {name} {sql_type}"]
            if c["is_nullable"] == "NO" and name not in pk_cols:
                pieces.append("NOT NULL")
            if default and "nextval(" not in default:
                pieces.append(f"DEFAULT {default}")
            if name in pk_cols and len(pk_cols) > 1:
                pass  # composite PK handled below
            col_defs.append(" ".join(pieces))

        if len(pk_cols) > 1:
            col_defs.append(f"    PRIMARY KEY ({', '.join(pk_cols)})")

        for chk in checks:
            # Inline CHECK constraints
            d = chk["def"]
            if d.upper().startswith("CHECK"):
                col_defs.append(f"    {d}")

        # Foreign keys
        fks = fetch_all(
            """
            SELECT conname, pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE contype='f' AND conrelid = ?::regclass
            ORDER BY conname
            """,
            (f"public.{t}",),
        )
        for fk in fks:
            col_defs.append(f"    CONSTRAINT {fk['conname']} {fk['def']}")

        # Unique table-level constraints
        uqs = fetch_all(
            """
            SELECT conname, pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE contype='u' AND conrelid = ?::regclass
            ORDER BY conname
            """,
            (f"public.{t}",),
        )
        for uq in uqs:
            col_defs.append(f"    CONSTRAINT {uq['conname']} {uq['def']}")

        lines.append(",\n".join(col_defs))
        lines.append(");")
        parts.append("\n".join(lines) + "\n")

        # Indexes
        idx = fetch_all(
            """
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname='public'              AND tablename=?
              AND indexname NOT LIKE '%_pkey'
            ORDER BY indexname
            """,
            (t,),
        )
        for i in idx:
            ddl = i["indexdef"]
            # Make idempotent: CREATE INDEX x ON ... -> CREATE INDEX IF NOT EXISTS x ON ...
            ddl = ddl.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ", 1)
            ddl = ddl.replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ", 1)
            parts.append(ddl + ";\n")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(parts))
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    export()
