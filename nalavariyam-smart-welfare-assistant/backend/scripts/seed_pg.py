#!/usr/bin/env python3
"""
One-off: seed the PostgreSQL (Neon) database with the demo data from
database/seed/seed_data.sql, adapting SQLite-specific syntax:
  - INSERT OR IGNORE -> INSERT (rows are guarded by pre-clearing)
  - family_members.name -> full_name
  - remap legacy board ids (1,2,4,5) to the actual board row ids in PG
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

import psycopg2


def main():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()

    # Existing boards in PG
    cur.execute("SELECT id, name FROM welfare_boards")
    boards = {name: bid for bid, name in cur.fetchall()}
    id_map = {
        1: boards.get("Tamil Nadu Construction Workers Welfare Board", 1),
        2: boards.get("Tamil Nadu Domestic Workers Welfare Board", 2),
        4: boards.get("Tamil Nadu Handloom Workers Welfare Board", 4),
        5: boards.get("Tamil Nadu Beedi Workers Welfare Board", 5),
    }
    print("board id map:", id_map)

    with open("../database/seed/seed_data.sql", encoding="utf-8") as fh:
        raw = fh.read()
    lines = [l for l in raw.split("\n") if not l.strip().startswith("PRAGMA")]
    sql = "\n".join(lines)
    sql = re.sub(r"INSERT OR IGNORE INTO", "INSERT INTO", sql, flags=re.I)
    sql = sql.replace(
        "INTO family_members (worker_id, name,",
        "INTO family_members (worker_id, full_name,",
    )

    # --- Remap board ids in the workers INSERT block -------------------------
    # Workers row tail looks like: ..., <board_id>, '<education>', '<marital>', <0|1>)
    m = re.search(r"(INSERT INTO workers[^\n]*VALUES\n)(.*?);", sql, re.S)
    workers_rows = m.group(2)
    workers_rows = re.sub(
        r", (\d+)(?=, '(?:Secondary|Primary|Higher Secondary|Graduate|Post Graduate|Illiterate|No Formal Education)',)",
        lambda mm: f", {id_map.get(int(mm.group(1)), mm.group(1))}",
        workers_rows,
    )
    sql = sql[: m.start(2)] + workers_rows + sql[m.end(2):]

    # --- Remap board ids in the registrations INSERT block -------------------
    # Registrations row head looks like: (<worker_id>,  <board_id>, 'TN-XXB-...'
    m = re.search(r"(INSERT INTO registrations[^\n]*VALUES\n)(.*?);", sql, re.S)
    reg_rows = m.group(2)
    reg_rows = re.sub(
        r"(\(\d+,\s*)(\d+), '",
        lambda mm: f"{mm.group(1)}{id_map.get(int(mm.group(2)), mm.group(2))}, '",
        reg_rows,
    )
    sql = sql[: m.start(2)] + reg_rows + sql[m.end(2):]

    # --- Execute statement by statement --------------------------------------
    stmts = [s.strip() for s in sql.split(";") if s.strip()]
    ok = fail = 0
    for s in stmts:
        body = "\n".join(
            l for l in s.split("\n") if not l.strip().startswith("--")
        ).strip()
        if not body:
            continue
        try:
            cur.execute(body)
            ok += 1
        except Exception as e:
            msg = str(e).split("\n")[0][:160]
            print("ERR:", msg, "| stmt:", body[:70].replace("\n", " "))
            fail += 1

    # Fix sequences for tables we inserted explicit ids into
    for t in ("workers", "family_members", "registrations", "education_records"):
        try:
            cur.execute(
                f"SELECT setval(pg_get_serial_sequence('{t}','id'), "
                f"GREATEST((SELECT MAX(id) FROM {t}), 1))"
            )
        except Exception as e:
            print("seq warn:", t, str(e)[:100])

    # Final counts
    for t in ("welfare_boards", "workers", "family_members", "registrations", "education_records"):
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(t, cur.fetchone()[0])

    print(f"done: {ok} ok, {fail} failed")
    conn.close()


if __name__ == "__main__":
    main()
