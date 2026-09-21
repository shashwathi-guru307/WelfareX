"""
Run Phase 13 migration: Multi-User Google OAuth + Admin Approval
Idempotent - safe to run multiple times.
"""
import os
import sys
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'nalavariyam.db')

def table_has_column(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def table_exists(cursor, name):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cursor.fetchone() is not None

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)
    
    print(f"Database: {DB_PATH}")
    print("Running Phase 13 migration (idempotent)...")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA foreign_keys = ON")
        cursor = conn.cursor()
        
        # 1. users table columns
        users_cols = [
            ("google_id", "TEXT"),
            ("avatar_url", "TEXT"),
            ("approval_status", "TEXT NOT NULL DEFAULT 'APPROVED'"),
            ("requested_at", "TEXT"),
            ("approved_at", "TEXT"),
            ("approved_by", "INTEGER REFERENCES users(id)"),
            ("rejection_reason", "TEXT"),
        ]
        for col, typedef in users_cols:
            if not table_has_column(cursor, "users", col):
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
                print(f"  [OK] users.{col} added")
            else:
                print(f"  [SKIP] users.{col} already exists")
        
        # Index on google_id
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)")
        
        # 2. registration_requests table
        if not table_exists(cursor, "registration_requests"):
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS registration_requests (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_id       TEXT    NOT NULL,
                    email           TEXT    NOT NULL,
                    display_name    TEXT    NOT NULL,
                    avatar_url      TEXT,
                    status          TEXT    NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                    requested_at    TEXT    NOT NULL DEFAULT (datetime('now')),
                    reviewed_at     TEXT,
                    reviewed_by     INTEGER REFERENCES users(id),
                    rejection_reason TEXT,
                    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
                    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
                )
            """)
            print("  [OK] registration_requests table created")
        else:
            print("  [SKIP] registration_requests table already exists")
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_requests_email ON registration_requests(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_requests_google ON registration_requests(google_id)")
        
        # 3. workers table
        if not table_has_column(cursor, "workers", "created_by_user_id"):
            cursor.execute("ALTER TABLE workers ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)")
            print("  [OK] workers.created_by_user_id added")
        else:
            print("  [SKIP] workers.created_by_user_id already exists")
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_workers_user ON workers(created_by_user_id)")
        
        # 4. cases table
        if not table_has_column(cursor, "cases", "created_by_user_id"):
            cursor.execute("ALTER TABLE cases ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)")
            print("  [OK] cases.created_by_user_id added")
        else:
            print("  [SKIP] cases.created_by_user_id already exists")
        
        conn.commit()
        conn.close()
        
        print("\n[OK] Phase 13 migration completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_migration()
