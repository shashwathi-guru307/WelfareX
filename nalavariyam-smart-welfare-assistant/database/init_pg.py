#!/usr/bin/env python3
"""
PostgreSQL Database Initialization — Cloud SQL Deployment
Nalavariyam Smart Welfare Assistant

Usage:
  export DATABASE_URL="postgresql://user:pass@//cloudsql/PROJECT:REGION:INSTANCE/nalavariyam"
  python init_pg.py              # Apply schema only
  python init_pg.py --seed       # Apply schema + seed data
"""

import os
from dotenv import load_dotenv

load_dotenv()

import sys
import glob as globmod

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema", "schema_pg.sql")
SEED_PATH = os.path.join(BASE_DIR, "seed", "seed_data.sql")
SCHEME_SEED_PATH = os.path.join(BASE_DIR, "seed", "welfare_schemes_seed.sql")


def run_pg_init(seed: bool = False):
    """Initialize PostgreSQL database."""
    import psycopg2

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is required.")
        print("Example: postgresql://user:pass@localhost:5432/nalavariyam")
        sys.exit(1)

    print(f"Connecting to PostgreSQL...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        # Apply schema
        print(f"Applying schema from {SCHEMA_PATH}...")
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            sql = f.read()
        cur.execute(sql)
        print("Schema applied successfully.")

        if seed:
            # Apply seed data (with SQLite → PG adaptation)
            for seed_file in [SEED_PATH, SCHEME_SEED_PATH]:
                if os.path.exists(seed_file):
                    print(f"Applying seed data from {seed_file}...")
                    with open(seed_file, "r", encoding="utf-8") as f:
                        sql = f.read()
                    # Skip SQLite-specific PRAGMA lines
                    lines = sql.split("\n")
                    filtered = [l for l in lines if not l.strip().startswith("PRAGMA")]
                    cur.execute("\n".join(filtered))
                    print(f"  Seed data loaded from {seed_file}.")

        # Verify
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name"
        )
        tables = [row[0] for row in cur.fetchall()]
        print(f"\nPostgreSQL database has {len(tables)} tables:")
        for t in tables:
            print(f"  - {t}")

        print("\nDatabase initialization complete!")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed = "--seed" in sys.argv
    run_pg_init(seed=seed)
