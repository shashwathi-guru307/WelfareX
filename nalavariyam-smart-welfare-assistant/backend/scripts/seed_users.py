"""
Seed the two authorized user accounts into PostgreSQL (production).

Idempotent: creates or resets the ADMIN and STAFF accounts from environment
variables. Safe to run multiple times.

Run locally:
    ADMIN_EMAIL=... ADMIN_PASSWORD=... python scripts/seed_users.py

Or as a Render one-off job (inherits the service environment):
    render jobs create srv-xxx --start-command "python scripts/seed_users.py"
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import execute, fetch_one
from app.services.auth_service import hash_password


def seed() -> None:
    accounts = [
        {
            "role": "ADMIN",
            "env_prefix": "ADMIN",
            "default_username": "admin",
            "default_name": "Administrator",
        },
        {
            "role": "STAFF",
            "env_prefix": "STAFF",
            "default_username": "staff",
            "default_name": "Staff User",
        },
    ]

    for acct in accounts:
        prefix = acct["env_prefix"]
        username = os.environ.get(f"{prefix}_USERNAME", acct["default_username"])
        email = os.environ.get(f"{prefix}_EMAIL", f"{acct['default_username']}@example.com").lower().strip()
        password = os.environ.get(f"{prefix}_PASSWORD")
        name = os.environ.get(f"{prefix}_NAME", acct["default_name"])

        if not password:
            print(f"ERROR: {prefix}_PASSWORD is required (env var).")
            sys.exit(1)

        pw_hash = hash_password(password)
        existing = fetch_one(
            "SELECT id FROM users WHERE role = %s LIMIT 1", (acct["role"],)
        )

        if existing:
            execute(
                """UPDATE users
                   SET username = %s, email = %s, password_hash = %s,
                       display_name = %s, is_active = 1,
                       approval_status = 'APPROVED', updated_at = NOW()
                   WHERE id = %s""",
                (username, email, pw_hash, name, existing["id"]),
            )
            print(f"Updated {acct['role']}: {username} <{email}>")
        else:
            execute(
                """INSERT INTO users
                       (username, email, password_hash, display_name, role,
                        is_active, approval_status)
                   VALUES (%s, %s, %s, %s, %s, 1, 'APPROVED')""",
                (username, email, pw_hash, name, acct["role"]),
            )
            print(f"Created {acct['role']}: {username} <{email}>")

    print("User accounts seeded successfully.")


if __name__ == "__main__":
    seed()
