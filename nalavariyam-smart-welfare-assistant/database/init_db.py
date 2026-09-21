"""
Database initialization script for Nalavariyam Smart Welfare Assistant.
Creates SQLite database, applies schema, and loads seed data.

Usage:
  python init_db.py              # Full init: schema + demo seed + scheme seed
  python init_db.py --schemes    # Scheme seed only (idempotent)
  python init_db.py --reset      # Drop all tables, reapply schema + all seeds
"""

import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema", "schema.sql")
SEED_PATH = os.path.join(BASE_DIR, "seed", "seed_data.sql")
SCHEME_SEED_PATH = os.path.join(BASE_DIR, "seed", "welfare_schemes_seed.sql")
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "nalavariyam.db")


def get_database_path() -> str:
    """Get database path from environment or use default."""
    return os.environ.get("DATABASE_PATH", DEFAULT_DB_PATH)


def _run_sql_file(cursor: sqlite3.Cursor, path: str, label: str) -> None:
    """Read and execute a SQL file."""
    if not os.path.exists(path):
        print(f"  Skipping {label}: file not found at {path}")
        return
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    cursor.executescript(sql)
    print(f"  {label} loaded successfully.")


def initialize_database(db_path: str = None, seed: bool = True, schemes_only: bool = False, reset: bool = False) -> None:
    """Initialize the database with schema and optional seed data."""
    if db_path is None:
        db_path = get_database_path()

    print(f"Initializing database at: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")

        if reset:
            # Disable foreign keys during drop phase
            cursor.execute("PRAGMA foreign_keys = OFF;")
            # Drop all existing tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = [row[0] for row in cursor.fetchall()]
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table};")
            print(f"Dropped {len(tables)} existing tables.")
            cursor.execute("PRAGMA foreign_keys = ON;")

        if not schemes_only or reset:
            # Apply schema
            _run_sql_file(cursor, SCHEMA_PATH, "Schema")

            if seed and not schemes_only:
                # Load demo seed data (workers, registrations, etc.)
                _run_sql_file(cursor, SEED_PATH, "Demo seed data")

        # Always load scheme seed (idempotent via INSERT OR IGNORE)
        _run_sql_file(cursor, SCHEME_SEED_PATH, "Welfare schemes seed data")

        conn.commit()

        # Verify table count
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
        )
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Database has {len(tables)} tables: {', '.join(tables)}")

        # Print scheme stats
        try:
            cursor.execute("SELECT COUNT(*) FROM welfare_schemes WHERE is_active = 1;")
            scheme_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM scheme_benefits;")
            benefit_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM scheme_qualifications;")
            qual_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM scheme_rules;")
            rule_count = cursor.fetchone()[0]
            print(f"Schemes: {scheme_count}, Benefits: {benefit_count}, Qualifications: {qual_count}, Rules: {rule_count}")
        except Exception:
            pass

    except Exception as e:
        conn.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    db_path = None
    schemes_only = "--schemes" in args
    reset = "--reset" in args

    # First non-flag argument is the db path
    for arg in args:
        if not arg.startswith("--"):
            db_path = arg
            break

    initialize_database(db_path, seed=True, schemes_only=schemes_only, reset=reset)
