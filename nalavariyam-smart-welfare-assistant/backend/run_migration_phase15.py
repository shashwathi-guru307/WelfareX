"""
Run Phase 15 Migration — Welfare Board Directory Sync
Uses the app's own database layer (app.database), so it runs against whichever
database is configured in .env: DATABASE_URL (PostgreSQL) or local SQLite.

1. Adds all official Tamil Nadu welfare boards missing from the DB.
2. Consolidates duplicate boards by re-pointing workers/registrations/schemes
   to the canonical board and deactivating the duplicate.
Idempotent — safe to run multiple times.

Usage:
  python run_migration_phase15.py              # use whatever .env configures
  python run_migration_phase15.py --sqlite     # force local SQLite
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

if "--sqlite" in sys.argv:
    os.environ.pop("DATABASE_URL", None)

# Import AFTER env is settled — app.database reads env at import time.
from app.database import fetch_all, fetch_one, execute  # noqa: E402

# ============================================================
# Canonical board directory (official TNUWWB list + TN Beedi WB)
# ============================================================

OFFICIAL_BOARDS = [
    ('Tamil Nadu Construction Workers Welfare Board',
     'Welfare board for construction workers across Tamil Nadu.'),
    ('Tamil Nadu Manual Workers Social Security and Welfare Board',
     'Welfare board for manual/unorganised workers across sectors.'),
    ('Tamil Nadu Washermen Welfare Board', 'Welfare board for washermen (laundry workers).'),
    ('Tamil Nadu Hair Dressers Welfare Board', 'Welfare board for hair dressers and beauty parlour workers.'),
    ('Tamil Nadu Tailoring Workers Welfare Board', 'Welfare board for tailoring workers.'),
    ('Tamil Nadu Handicraft Workers Welfare Board', 'Welfare board for handicraft, sculpture and vessels workers.'),
    ('Tamil Nadu Palm Tree Workers Welfare Board', 'Welfare board for palm tree workers (neera tapping, tree climbing).'),
    ('Tamil Nadu Handloom Workers Welfare Board', 'Welfare board for handloom and handloom silk weaving workers.'),
    ('Tamil Nadu Power loom Weaving Workers Welfare Board', 'Welfare board for power loom weaving workers.'),
    ('Tamil Nadu Footwear and Leather Workers Welfare Board', 'Welfare board for footwear, leather goods and tannery workers.'),
    ('Tamil Nadu Artists Welfare Board', 'Welfare board for artists.'),
    ('Tamil Nadu Goldsmiths Welfare Board', 'Welfare board for goldsmiths and gold/silver manufacture workers.'),
    ('Tamil Nadu Pottery Workers Welfare Board', 'Welfare board for pottery workers.'),
    ('Tamil Nadu Domestic Workers Welfare Board', 'Welfare board for domestic workers.'),
    ('Tamil Nadu Street Vending and Shops and Establishments Workers Welfare Board',
     'Welfare board for street vendors and shops & establishments workers.'),
    ('Tamil Nadu Cooking and Catering Workers Welfare Board', 'Welfare board for cooking and catering workers.'),
    ('Tamil Nadu Unorganised Drivers and Automobile Workshop Workers Welfare Board',
     'Welfare board for unorganised drivers and automobile workshop workers.'),
    ('Tamil Nadu Beedi Workers Welfare Board', 'Welfare board for beedi rolling and tobacco industry workers.'),
    ('Tamil Nadu Fire and Match Workers Welfare Board', 'Welfare board for fire works and match industry workers.'),
]

# Duplicate names -> canonical board they should be merged into.
DUPLICATE_MERGE_RULES = [
    ('TN Construction Workers Welfare Board', 'Tamil Nadu Construction Workers Welfare Board'),
    ('TN Manual Workers Social Security Welfare Board', 'Tamil Nadu Manual Workers Social Security and Welfare Board'),
    ('Drivers & Automobile Workshop Workers Welfare Board',
     'Tamil Nadu Unorganised Drivers and Automobile Workshop Workers Welfare Board'),
    ('Tamil Nadu Automobile Workers Welfare Board',
     'Tamil Nadu Unorganised Drivers and Automobile Workshop Workers Welfare Board'),
]

CHILD_TABLES = [
    ('workers', 'board_id'),
    ('registrations', 'board_id'),
    ('welfare_schemes', 'board_id'),
]


def normalize(name: str) -> str:
    name = name.lower().replace('&', ' and ')
    name = re.sub(r'\btamil nadu\b|\btn\b|\bwelfare board\b', ' ', name)
    return re.sub(r'[^a-z]+', ' ', name).strip()


def run_migration():
    rows = fetch_all("SELECT id, name FROM welfare_boards")
    boards = {r["id"]: r["name"] for r in rows}
    print(f"{len(boards)} board row(s) found")

    by_norm = {}
    for bid, name in boards.items():
        by_norm.setdefault(normalize(name), []).append(bid)

    def find_board_id(target_name: str):
        """Exact name first; then normalized match preferring the longest name."""
        for bid, name in boards.items():
            if name == target_name:
                return bid
        candidates = by_norm.get(normalize(target_name)) or []
        if not candidates:
            return None
        return max(candidates, key=lambda bid: len(boards[bid]))

    # 1. Insert missing official boards
    existing_norm = {normalize(n) for n in boards.values()}
    added = 0
    for name, desc in OFFICIAL_BOARDS:
        if normalize(name) in existing_norm:
            continue
        new_id = execute(
            "INSERT INTO welfare_boards (name, description, is_active) VALUES (?, ?, 1)",
            (name, desc),
        )
        boards[new_id] = name
        by_norm.setdefault(normalize(name), []).append(new_id)
        existing_norm.add(normalize(name))
        added += 1
        print(f"[ADD] {name} (id={new_id})")
    print(f"Added {added} missing board(s).")

    # 2. Merge duplicates into canonical boards
    for dup_name, canonical_name in DUPLICATE_MERGE_RULES:
        dup_id = find_board_id(dup_name)
        canon_id = find_board_id(canonical_name)
        if dup_id is None:
            continue
        if canon_id is None or canon_id == dup_id:
            # No separate canonical board — keep this one but use the full canonical name.
            if boards[dup_id] != canonical_name:
                execute("UPDATE welfare_boards SET name = ? WHERE id = ?", (canonical_name, dup_id))
                boards[dup_id] = canonical_name
                print(f"[RENAME] board {dup_id}: -> {canonical_name}")
            continue
        for table, col in CHILD_TABLES:
            try:
                moved = execute(f"UPDATE {table} SET {col} = ? WHERE {col} = ?", (canon_id, dup_id))
                if moved:
                    print(f"[MERGE] {table}.{col}: moved {moved} row(s) from board {dup_id} -> {canon_id}")
            except Exception as e:
                print(f"[WARN] could not update {table}: {e}")
        execute("UPDATE welfare_boards SET is_active = 0 WHERE id = ?", (dup_id,))
        print(f"[DEACTIVATE] duplicate board {dup_id}: {boards[dup_id]}")

    # 3. Summary
    rows = fetch_all("SELECT id, name FROM welfare_boards WHERE is_active = 1 ORDER BY name")
    print(f"\nActive boards now: {len(rows)}")
    for r in rows:
        print(f"  {r['id']:>3}  {r['name']}")


if __name__ == '__main__':
    run_migration()
