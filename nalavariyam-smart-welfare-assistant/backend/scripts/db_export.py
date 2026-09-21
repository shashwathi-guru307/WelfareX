#!/usr/bin/env python3
"""
Database Export Script — Phase 9
Exports all data from SQLite to JSON for migration to PostgreSQL.

Usage:
    python db_export.py [--input path/to/nalavariyam.db] [--output db_export.json]

This reads the SQLite database and writes a JSON file containing
all table data that can be imported into PostgreSQL.
"""

import os
import sys
import json
import sqlite3
import argparse
from datetime import datetime

# Tables to export (in order for foreign key compatibility)
TABLES = [
    "welfare_boards",
    "scheme_categories",
    "welfare_schemes",
    "scheme_benefits",
    "scheme_qualifications",
    "scheme_rules",
    "eligibility_rules",
    "workers",
    "registrations",
    "family_members",
    "education_records",
    "scheme_applications",
    "eligibility_audit_log",
    "alerts",
    "renewal_config",
    "cases",
    "case_documents",
    "case_tasks",
    "case_notes",
    "case_activity_log",
    "users",
    "login_attempts",
    "system_settings",
]


def export_table(cursor, table_name):
    """Export all rows from a table."""
    try:
        cursor.execute(f"SELECT * FROM {table_name}")
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                val = row[i]
                if isinstance(val, datetime):
                    val = val.isoformat()
                row_dict[col] = val
            data.append(row_dict)
        return {"columns": columns, "count": len(data), "data": data}
    except sqlite3.OperationalError:
        return {"columns": [], "count": 0, "data": []}


def main():
    parser = argparse.ArgumentParser(description="Export SQLite database to JSON")
    parser.add_argument(
        "--input",
        default=os.path.join(
            os.path.dirname(__file__), "..", "..", "database", "nalavariyam.db"
        ),
        help="Path to SQLite database",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            os.path.dirname(__file__), "..", "..", "database", "db_export.json"
        ),
        help="Path to output JSON file",
    )
    args = parser.parse_args()

    db_path = os.path.abspath(args.input)
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        sys.exit(1)

    print(f"Exporting database: {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    export_data = {
        "exported_at": datetime.now().isoformat(),
        "source": "sqlite",
        "tables": {},
        "summary": {},
    }

    total_rows = 0
    for table in TABLES:
        table_data = export_table(conn.cursor(), table)
        export_data["tables"][table] = table_data
        export_data["summary"][table] = table_data["count"]
        total_rows += table_data["count"]
        print(f"  {table}: {table_data['count']} rows")

    export_data["total_rows"] = total_rows
    conn.close()

    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, default=str)

    print(f"\nExport complete: {total_rows} total rows across {len(TABLES)} tables")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
