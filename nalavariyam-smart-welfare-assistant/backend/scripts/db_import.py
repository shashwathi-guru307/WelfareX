#!/usr/bin/env python3
"""
Database Import Script — Phase 9
Imports data from a JSON export into a PostgreSQL database.

Usage:
    python db_import.py [--input db_export.json] [--database-url postgres://...]

Prerequisites:
    1. Run schema.sql against the PostgreSQL database first
    2. Run all migration SQL files against PostgreSQL
    3. Then run this import script

The script:
    - Disables foreign key checks during import
    - Truncates target tables before import
    - Re-enables foreign key checks after import
"""

import os
import sys
import json
import argparse
import time


def get_pg_connection(database_url):
    """Create a PostgreSQL connection."""
    import psycopg2
    return psycopg2.connect(database_url)


def import_table(cursor, table_name, table_data):
    """Import data into a single table."""
    if not table_data.get("data"):
        return 0

    columns = table_data["columns"]
    count = table_data["count"]

    # Truncate existing data
    cursor.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE")

    if count == 0:
        return 0

    # Build INSERT statement
    placeholders = ", ".join(["%s"] * len(columns))
    col_names = ", ".join(columns)
    insert_sql = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"

    # Insert rows in batches
    batch_size = 500
    rows = [tuple(row) for row in table_data["data"]]

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        cursor.executemany(insert_sql, batch)

    return count


def main():
    parser = argparse.ArgumentParser(description="Import data into PostgreSQL")
    parser.add_argument(
        "--input",
        default=os.path.join(
            os.path.dirname(__file__), "..", "..", "database", "db_export.json"
        ),
        help="Path to JSON export file",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", ""),
        help="PostgreSQL connection URL",
    )
    parser.add_argument(
        "--apply-schema",
        action="store_true",
        help="Run schema.sql before importing data",
    )
    args = parser.parse_args()

    if not args.database_url:
        print("Error: DATABASE_URL environment variable or --database-url required")
        print("Example: DATABASE_URL=postgres://user:pass@host/dbname python db_import.py")
        sys.exit(1)

    if not args.database_url.startswith("postgres"):
        print("Error: DATABASE_URL must start with postgres:// or postgresql://")
        sys.exit(1)

    # Load export data
    export_path = os.path.abspath(args.input)
    if not os.path.exists(export_path):
        print(f"Error: Export file not found at {export_path}")
        sys.exit(1)

    print(f"Loading export data from: {export_path}")
    with open(export_path, "r", encoding="utf-8") as f:
        export_data = json.load(f)

    print(f"Export date: {export_data.get('exported_at', 'unknown')}")
    print(f"Total rows: {export_data.get('total_rows', 0)}")

    # Connect to PostgreSQL
    print(f"\nConnecting to PostgreSQL...")
    conn = get_pg_connection(args.database_url)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        # Optionally apply schema
        if args.apply_schema:
            schema_path = os.path.join(
                os.path.dirname(__file__), "..", "..", "database", "schema", "schema.sql"
            )
            if os.path.exists(schema_path):
                print(f"Applying schema from: {schema_path}")
                with open(schema_path, "r") as f:
                    schema_sql = f.read()
                cursor.execute(schema_sql)
                conn.commit()

            # Apply migrations
            schema_dir = os.path.join(
                os.path.dirname(__file__), "..", "..", "database", "schema"
            )
            for fname in sorted(os.listdir(schema_dir)):
                if fname.startswith("migration_") and fname.endswith(".sql"):
                    migration_path = os.path.join(schema_dir, fname)
                    print(f"  Applying migration: {fname}")
                    with open(migration_path, "r") as f:
                        migration_sql = f.read()
                    cursor.execute(migration_sql)
                    conn.commit()

        # Disable foreign key checks
        cursor.execute("SET session_replication_role = 'replica'")
        conn.commit()

        # Import tables
        print("\nImporting data...")
        total_imported = 0
        for table_name, table_data in export_data.get("tables", {}).items():
            count = import_table(cursor, table_name, table_data)
            total_imported += count
            if count > 0:
                print(f"  {table_name}: {count} rows imported")

        # Re-enable foreign key checks
        cursor.execute("SET session_replication_role = 'origin'")
        conn.commit()

        print(f"\nImport complete: {total_imported} total rows imported")

        # Verify counts
        print("\nVerifying counts...")
        for table_name, expected_count in export_data.get("summary", {}).items():
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            actual_count = cursor.fetchone()[0]
            status = "OK" if actual_count == expected_count else "MISMATCH"
            print(f"  {table_name}: {actual_count} (expected {expected_count}) [{status}]")

    except Exception as e:
        conn.rollback()
        print(f"\nError during import: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

    print("\nDone!")


if __name__ == "__main__":
    main()
