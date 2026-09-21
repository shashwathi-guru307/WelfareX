"""
User Initialization Script — Phase 8
Creates the two authorized accounts for the Nalavariyam Smart Welfare Assistant.

Usage:
    python init_users.py
    python init_users.py --admin-email admin@yourdomain.com --admin-password YOUR_PASSWORD
    python init_users.py --staff-email staff@yourdomain.com --staff-password YOUR_PASSWORD

Environment Variables (alternative to CLI args):
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, ADMIN_NAME
    STAFF_EMAIL, STAFF_PASSWORD, STAFF_USERNAME, STAFF_NAME

IMPORTANT:
    ADMIN_PASSWORD and STAFF_PASSWORD are REQUIRED.
    The script will fail with a clear error if they are not provided
    via environment variables or CLI arguments.
"""

import os
import sys
import sqlite3

# Load .env file from the project root
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import hash_password

DATABASE_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "database", "nalavariyam.db"),
)


def init_users(
    admin_email: str = "admin@example.com",
    admin_password: str | None = None,
    admin_name: str = "Administrator",
    admin_username: str = "admin",
    staff_email: str = "staff@example.com",
    staff_password: str | None = None,
    staff_name: str = "Staff User",
    staff_username: str = "staff",
):
    """Initialize or update the two authorized user accounts.

    Raises:
        SystemExit: If admin_password or staff_password is not provided.
    """
    if not admin_password:
        print(
            "ERROR: ADMIN_PASSWORD is required. "
            "Set it via the ADMIN_PASSWORD environment variable "
            "or the --admin-password CLI argument."
        )
        sys.exit(1)

    if not staff_password:
        print(
            "ERROR: STAFF_PASSWORD is required. "
            "Set it via the STAFF_PASSWORD environment variable "
            "or the --staff-password CLI argument."
        )
        sys.exit(1)

    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]

        if count >= 2:
            print(f"Database has {count} user(s). Updating existing accounts.")

            # Update ADMIN
            admin_hash = hash_password(admin_password)
            conn.execute(
                """UPDATE users SET username = ?, email = ?, password_hash = ?,
                   display_name = ?, updated_at = datetime('now')
                   WHERE role = 'ADMIN'""",
                (admin_username, admin_email.lower().strip(), admin_hash, admin_name),
            )
            print(f"Admin account updated: {admin_username} / {admin_email}")

            # Update STAFF
            staff_hash = hash_password(staff_password)
            conn.execute(
                """UPDATE users SET username = ?, email = ?, password_hash = ?,
                   display_name = ?, updated_at = datetime('now')
                   WHERE role = 'STAFF'""",
                (staff_username, staff_email.lower().strip(), staff_hash, staff_name),
            )
            print(f"Staff account updated: {staff_username} / {staff_email}")

            conn.commit()
            print("\nUser accounts updated successfully!")
            print("Password hashes are securely stored. Plaintext passwords are NOT saved.")
            return True

        # Create Admin account
        admin_hash = hash_password(admin_password)
        conn.execute(
            """INSERT OR IGNORE INTO users
               (username, email, password_hash, display_name, role, is_active)
               VALUES (?, ?, ?, ?, 'ADMIN', 1)""",
            (admin_username, admin_email.lower().strip(), admin_hash, admin_name),
        )
        print(f"Admin account created: {admin_username} / {admin_email}")

        # Create Staff account
        staff_hash = hash_password(staff_password)
        conn.execute(
            """INSERT OR IGNORE INTO users
               (username, email, password_hash, display_name, role, is_active)
               VALUES (?, ?, ?, ?, 'STAFF', 1)""",
            (staff_username, staff_email.lower().strip(), staff_hash, staff_name),
        )
        print(f"Staff account created: {staff_username} / {staff_email}")

        conn.commit()
        print("\nUser accounts created successfully!")
        print("Password hashes are securely stored. Plaintext passwords are NOT saved.")
        return True

    except sqlite3.IntegrityError as e:
        print(f"User already exists: {e}")
        conn.rollback()
        return False
    except Exception as e:
        print(f"Error initializing users: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    # Parse CLI args or use env vars
    import argparse

    parser = argparse.ArgumentParser(description="Initialize authorized user accounts")
    parser.add_argument("--admin-email", default=os.environ.get("ADMIN_EMAIL", "admin@example.com"))
    parser.add_argument("--admin-password", default=os.environ.get("ADMIN_PASSWORD"))
    parser.add_argument("--admin-name", default=os.environ.get("ADMIN_NAME", "Administrator"))
    parser.add_argument("--admin-username", default=os.environ.get("ADMIN_USERNAME", "admin"))
    parser.add_argument("--staff-email", default=os.environ.get("STAFF_EMAIL", "staff@example.com"))
    parser.add_argument("--staff-password", default=os.environ.get("STAFF_PASSWORD"))
    parser.add_argument("--staff-name", default=os.environ.get("STAFF_NAME", "Staff User"))
    parser.add_argument("--staff-username", default=os.environ.get("STAFF_USERNAME", "staff"))
    args = parser.parse_args()

    init_users(
        admin_email=args.admin_email,
        admin_password=args.admin_password,
        admin_name=args.admin_name,
        admin_username=args.admin_username,
        staff_email=args.staff_email,
        staff_password=args.staff_password,
        staff_name=args.staff_name,
        staff_username=args.staff_username,
    )
