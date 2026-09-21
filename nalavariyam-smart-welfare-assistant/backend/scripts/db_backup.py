#!/usr/bin/env python3
"""
Database Backup & Restore Script — Phase 9

SQLite (development):
    python db_backup.py backup --sqlite
    python db_backup.py restore --sqlite --file backup_20260827_120000.db

PostgreSQL (production):
    python db_backup.py backup --pg
    python db_backup.py restore --pg --file backup_20260827.dump
    python db_backup.py restore --pg --file backup_20260827.sql

Backups are stored in: ../../database/backups/
"""

import os
import sys
import shutil
import subprocess
import argparse
from datetime import datetime


BACKUP_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "database", "backups"
)


def timestamp():
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def get_sqlite_path():
    return os.environ.get(
        "DATABASE_PATH",
        os.path.join(os.path.dirname(__file__), "..", "..", "database", "nalavariyam.db"),
    )


def get_pg_url():
    return os.environ.get("DATABASE_URL", "")


def backup_sqlite():
    """Create a backup of the SQLite database."""
    db_path = os.path.abspath(get_sqlite_path())
    if not os.path.exists(db_path):
        print(f"Error: SQLite database not found at {db_path}")
        sys.exit(1)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    backup_name = f"nalavariyam_backup_{timestamp()}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    shutil.copy2(db_path, backup_path)
    size_mb = os.path.getsize(backup_path) / (1024 * 1024)
    print(f"SQLite backup created: {backup_name} ({size_mb:.2f} MB)")
    return backup_path


def restore_sqlite(file_path):
    """Restore a SQLite database from backup."""
    if not os.path.exists(file_path):
        print(f"Error: Backup file not found: {file_path}")
        sys.exit(1)

    db_path = os.path.abspath(get_sqlite_path())

    # Create a backup of current database before restore
    pre_restore = os.path.join(BACKUP_DIR, f"pre_restore_{timestamp()}.db")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    if os.path.exists(db_path):
        shutil.copy2(db_path, pre_restore)
        print(f"Pre-restore backup: {os.path.basename(pre_restore)}")

    shutil.copy2(file_path, db_path)
    print(f"SQLite database restored from: {os.path.basename(file_path)}")


def backup_postgres():
    """Create a backup of the PostgreSQL database."""
    pg_url = get_pg_url()
    if not pg_url:
        print("Error: DATABASE_URL environment variable required for PostgreSQL backup")
        sys.exit(1)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    backup_name = f"nalavariyam_backup_{timestamp()}.sql"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    try:
        # Use pg_dump
        cmd = [
            "pg_dump",
            "--no-owner",
            "--no-privileges",
            "--clean",
            "--if-exists",
            pg_url,
        ]
        with open(backup_path, "w") as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)

        if result.returncode != 0:
            print(f"Error during pg_dump: {result.stderr}")
            sys.exit(1)

        size_mb = os.path.getsize(backup_path) / (1024 * 1024)
        print(f"PostgreSQL backup created: {backup_name} ({size_mb:.2f} MB)")
        return backup_path

    except FileNotFoundError:
        print("Error: pg_dump not found. Install PostgreSQL client tools.")
        print("Alternative: Use your hosting provider's backup feature.")
        sys.exit(1)


def restore_postgres(file_path):
    """Restore a PostgreSQL database from backup."""
    if not os.path.exists(file_path):
        print(f"Error: Backup file not found: {file_path}")
        sys.exit(1)

    pg_url = get_pg_url()
    if not pg_url:
        print("Error: DATABASE_URL environment variable required")
        sys.exit(1)

    print("WARNING: This will overwrite the current database!")
    print(f"Database: {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")
    confirm = input("Type 'YES' to confirm: ")
    if confirm != "YES":
        print("Aborted.")
        sys.exit(0)

    try:
        if file_path.endswith(".dump"):
            cmd = ["pg_restore", "--no-owner", "--no-privileges", "-d", pg_url, file_path]
        else:
            cmd = ["psql", pg_url, "-f", file_path]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error during restore: {result.stderr}")
            sys.exit(1)

        print("PostgreSQL database restored successfully.")

    except FileNotFoundError:
        print("Error: PostgreSQL client tools not found.")
        sys.exit(1)


def list_backups():
    """List available backups."""
    if not os.path.exists(BACKUP_DIR):
        print("No backups directory found.")
        return

    backups = sorted(os.listdir(BACKUP_DIR))
    if not backups:
        print("No backups found.")
        return

    print(f"Backups in {BACKUP_DIR}:\n")
    for b in backups:
        path = os.path.join(BACKUP_DIR, b)
        size = os.path.getsize(path) / (1024 * 1024)
        mtime = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")
        print(f"  {b}  ({size:.2f} MB)  {mtime}")


def main():
    parser = argparse.ArgumentParser(description="Database backup and restore")
    sub = parser.add_subparsers(dest="command")

    # Backup
    bp = sub.add_parser("backup", help="Create a database backup")
    bp.add_argument("--sqlite", action="store_true", help="Backup SQLite database")
    bp.add_argument("--pg", action="store_true", help="Backup PostgreSQL database")

    # Restore
    rp = sub.add_parser("restore", help="Restore from backup")
    rp.add_argument("--sqlite", action="store_true", help="Restore SQLite database")
    rp.add_argument("--pg", action="store_true", help="Restore PostgreSQL database")
    rp.add_argument("--file", required=True, help="Backup file path")

    # List
    sub.add_parser("list", help="List available backups")

    args = parser.parse_args()

    if args.command == "backup":
        if args.pg:
            backup_postgres()
        else:
            backup_sqlite()
    elif args.command == "restore":
        if args.pg:
            restore_postgres(args.file)
        else:
            restore_sqlite(args.file)
    elif args.command == "list":
        list_backups()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
