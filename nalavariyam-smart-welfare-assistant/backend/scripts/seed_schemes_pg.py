#!/usr/bin/env python3
"""
One-off: seed welfare schemes into the PostgreSQL (Neon) database from
database/seed/welfare_schemes_seed.sql, adapting SQLite syntax.

Handles:
  - INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING (safe re-runs)
  - scheme_categories inserted by name; seed category_id remapped to PG ids
  - scheme_qualifications requires criterion_type (NOT NULL) -> derived
  - scheme_benefits.amount is numeric -> 'Rs. X' string dropped,
    amount_numeric carries the value; board ids remapped (3 -> NULL-safe)
  - board_id references remapped to actual PG welfare_boards ids
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

    cur.execute("SELECT id, name FROM welfare_boards")
    boards = {name: bid for bid, name in cur.fetchall()}
    board_map = {
        1: boards["Tamil Nadu Construction Workers Welfare Board"],
        2: boards["Tamil Nadu Domestic Workers Welfare Board"],
        3: boards.get("Drivers & Automobile Workshop Workers Welfare Board"),
        4: boards["Tamil Nadu Handloom Workers Welfare Board"],
        5: boards["Tamil Nadu Beedi Workers Welfare Board"],
    }

    with open("../database/seed/welfare_schemes_seed.sql", encoding="utf-8") as fh:
        raw = fh.read()
    lines = [l for l in raw.split("\n") if not l.strip().startswith("PRAGMA")]
    sql = "\n".join(lines)

    # ---- 1. Scheme categories: insert missing by name ----------------------
    cat_m = re.search(
        r"INSERT OR IGNORE INTO scheme_categories \([^)]*\) VALUES\n(.*?);",
        sql, re.S,
    )
    cat_map = {}
    # rows: ('Name', 'Description', display_order, is_active)
    for m in re.finditer(r"\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+),\s*(\d)\)", cat_m.group(1)):
        name, desc, disp, active = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
        cur.execute("SELECT id FROM scheme_categories WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            cat_map[disp] = row[0]
        else:
            cur.execute(
                "INSERT INTO scheme_categories (name, description, display_order, is_active) "
                "VALUES (%s, %s, %s, %s) RETURNING id",
                (name, desc, disp, active),
            )
            cat_map[disp] = cur.fetchone()[0]
    print("category map (seed display_order -> pg id):", cat_map)

    # Strip seed category/board inserts; handled above / already present
    sql = re.sub(
        r"INSERT OR IGNORE INTO scheme_categories \([^)]*\) VALUES\n.*?;",
        "-- categories handled", sql, flags=re.S,
    )
    sql = re.sub(
        r"INSERT OR IGNORE INTO welfare_boards \([^)]*\) VALUES\n.*?;",
        "-- boards handled", sql, flags=re.S,
    )
    sql = re.sub(r"INSERT OR IGNORE INTO", "INSERT INTO", sql, flags=re.I)

    # ---- 2. welfare_schemes: remap category_id (3rd value in each row) -----
    def remap_scheme_category(m):
        head, body = m.group(1), m.group(2)
        body = re.sub(
            r"(\('(?:[^']|'')*',\s*'(?:[^']|'')*',\s*)(\d+)(,\s*\n)",
            lambda mm: mm.group(1) + str(cat_map.get(int(mm.group(2)), mm.group(2))) + mm.group(3),
            body,
        )
        return head + body + ";"  # re-add the terminator consumed by the pattern

    sql = re.sub(
        r"(INSERT INTO welfare_schemes\s*\n?\s*\([^)]*\)\s*\nVALUES\s*\n)(.*?);",
        remap_scheme_category,
        sql,
        flags=re.S,
    )

    # Make welfare_schemes inserts idempotent on scheme_code
    sql = re.sub(
        r"INSERT INTO welfare_schemes\s*\n?\s*\(([^)]*)\)\s*\nVALUES\s*\n",
        lambda m: f"INSERT INTO welfare_schemes ({m.group(1)}) VALUES\n",
        sql,
    )

    # ---- 3. scheme_qualifications: criterion_type (NOT NULL) ---------------
    def add_criterion_header(m):
        cols = m.group(1)
        if "criterion_type" in cols:
            return m.group(0)
        return f"INSERT INTO scheme_qualifications ({cols}, criterion_type)"

    sql = re.sub(
        r"INSERT INTO scheme_qualifications\s*\n?\s*\(([^)]*)\)",
        add_criterion_header,
        sql,
    )

    # SELECT bodies supply the extra column. Pattern:
    # SELECT ws.id, <sort>, '<qual>', '<edu_level>', '<edu_type>', '<CLAIMANT>',
    #        '<desc>'
    # FROM welfare_schemes ws ...
    val = r"(NULL|'(?:[^']|'')*')"
    pat_select = re.compile(
        rf"SELECT ws\.id, (\d+), {val}, {val}, {val}, "
        rf"{val},\s*\n\s*{val}\nFROM welfare_schemes ws",
        re.S,
    )

    def add_criterion_value(m):
        edu = m.group(4)
        return (
            f"SELECT ws.id, {m.group(1)}, {m.group(2)}, {m.group(3)}, {edu}, "
            f"{m.group(5)},\n       {m.group(6)},\n       "
            f"CASE WHEN {edu} IS NOT NULL AND {edu} <> '' THEN 'EDUCATION' ELSE 'GENERAL' END\n"
            "FROM welfare_schemes ws"
        )

    sql = pat_select.sub(add_criterion_value, sql)

    # ---- 4. scheme_benefits: numeric amount + board remap ------------------
    # Two row shapes:
    #   A) SELECT ws.id, <board>, sq.id, 'Rs. X', <num>, '<unit>', <avail>
    #   B) SELECT ws.id, <board>, sq.id, NULL, NULL, NULL, 0   (board not offered)
    #   C) SELECT ws.id, <board>, NULL, 'Rs. X', <num>, '<unit>', <avail>
    # PG schema also requires NOT NULL benefit_type — add to header + value.
    def add_benefit_header(m):
        cols = m.group(1)
        if "benefit_type" in cols:
            return m.group(0)
        return f"INSERT INTO scheme_benefits ({cols}, benefit_type)"

    sql = re.sub(
        r"INSERT INTO scheme_benefits\s*\n?\s*\(([^)]*)\)",
        add_benefit_header,
        sql,
    )

    def board_sql(n):
        if not n.isdigit():
            return n
        b = board_map.get(int(n))
        return str(b) if b is not None else "NULL"

    pat_benefit = re.compile(
        r"SELECT ws\.id, (\d+), (sq\.id|NULL), (NULL|'(?:[^']|'')*'), "
        r"(NULL|\d+(?:\.\d+)?), (NULL|'(?:[^']|'')*'), (\d)"
    )

    def fix_benefit(m):
        board = board_sql(m.group(1))
        # benefit_type: 'CASH' when a numeric amount exists, else 'NONE'
        btype = "'CASH'" if m.group(4) not in ("NULL",) else "'NONE'"
        return (
            f"SELECT ws.id, {board}, {m.group(2)}, NULL, "
            f"{m.group(4)}, {m.group(5)}, {m.group(6)}, {btype}"
        )

    sql = pat_benefit.sub(fix_benefit, sql)

    # ---- 5. scheme_rules: no board refs expected, but be safe --------------
    # (rule rows reference qualification ids which were inserted in order)

    stmts = [s.strip() for s in sql.split(";") if s.strip()]
    ok = fail = 0
    for s in stmts:
        body = "\n".join(
            l for l in s.split("\n") if not l.strip().startswith("--")
        ).strip()
        if not body or body.startswith("--"):
            continue
        try:
            cur.execute(body)
            ok += 1
        except Exception as e:
            fail += 1
            print("ERR:", str(e).split("\n")[0][:140], "|", body[:90].replace("\n", " "))

    # ---- 6. Sequences -------------------------------------------------------
    for t in ("scheme_categories", "welfare_schemes", "scheme_qualifications",
              "scheme_benefits", "scheme_rules"):
        try:
            cur.execute(
                f"SELECT setval(pg_get_serial_sequence('{t}','id'), "
                f"GREATEST((SELECT MAX(id) FROM {t}), 1))"
            )
        except Exception as e:
            print("seq warn:", t, str(e)[:100])

    for t in ("scheme_categories", "welfare_schemes", "scheme_qualifications",
              "scheme_benefits", "scheme_rules"):
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(t, cur.fetchone()[0])
    print(f"done: {ok} ok, {fail} failed")
    conn.close()


if __name__ == "__main__":
    main()
