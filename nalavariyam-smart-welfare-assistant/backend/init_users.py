"""
User Initialization Script — Phase 8
Creates the two authorized accounts for the Nalavariyam Smart Welfare Assistant.

Usage:
    python init_users.py
    python init_users.py --admin-email admin@example.com --admin-password secret123
    python init_users.py --staff-email staff@example.com --staff-password secret456

Environment Variables (alternative to CLI args):
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
    STAFF_EMAIL, STAFF_PASSWORD, STAFF_NAME
"""

import os
import sys
import sqlite3

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import hash_password

DATABASE_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "database", "nalavariyam.db"),
)


def init_users(
    admin_email: str = "rselva1204@gmail.com",
    admin_password: str = "selva1204",
    admin_name: str = "Administrator",
    admin_username: str = "rselva1204",
    staff_email: str = "thorfinn@example.com",
    staff_password: str = "thorfinn1204",
    staff_name: str = "Staff User",
    staff_username: str = "thorfinn",
):
    """Initialize or update the two authorized user accounts."""
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
    parser.add_argument("--admin-email", default=os.environ.get("ADMIN_EMAIL", "rselva1204@gmail.com"))
    parser.add_argument("--admin-password", default=os.environ.get("ADMIN_PASSWORD", "selva1204"))
    parser.add_argument("--admin-name", default=os.environ.get("ADMIN_NAME", "Administrator"))
    parser.add_argument("--admin-username", default=os.environ.get("ADMIN_USERNAME", "rselva1204"))
    parser.add_argument("--staff-email", default=os.environ.get("STAFF_EMAIL", "thorfinn@example.com"))
    parser.add_argument("--staff-password", default=os.environ.get("STAFF_PASSWORD", "thorfinn1204"))
    parser.add_argument("--staff-name", default=os.environ.get("STAFF_NAME", "Staff User"))
    parser.add_argument("--staff-username", default=os.environ.get("STAFF_USERNAME", "thorfinn"))
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
