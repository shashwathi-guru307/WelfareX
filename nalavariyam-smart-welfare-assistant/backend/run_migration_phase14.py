"""
Run Phase 14 Migration — Per-User Data Isolation
Adds created_by_user_id to workers, cases, reminders.
"""
import os
import sqlite3

DB_PATH = os.environ.get(
    'DATABASE_PATH',
    os.path.join(os.path.dirname(__file__), '..', 'database', 'nalavariyam.db'),
)

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check which columns already exist
        def has_column(table, column):
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [row[1] for row in cursor.fetchall()]
            return column in cols

        # 1. Add created_by_user_id to workers
        if not has_column('workers', 'created_by_user_id'):
            print("Adding created_by_user_id to workers...")
            cursor.execute("ALTER TABLE workers ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_workers_created_by ON workers(created_by_user_id)")
            print("[OK] workers table updated")
        else:
            print("[SKIP] workers.created_by_user_id already exists")

        # 2. Add created_by_user_id to cases
        if has_column('cases', 'created_by_user_id'):
            print("[SKIP] cases.created_by_user_id already exists")
        else:
            print("Adding created_by_user_id to cases...")
            cursor.execute("ALTER TABLE cases ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by_user_id)")
            print("[OK] cases table updated")

        # 3. Add created_by_user_id to reminders
        if has_column('reminders', 'created_by_user_id'):
            print("[SKIP] reminders.created_by_user_id already exists")
        else:
            print("Adding created_by_user_id to reminders...")
            cursor.execute("ALTER TABLE reminders ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by_user_id)")
            print("[OK] reminders table updated")

        conn.commit()
        print("\n[OK] Phase 14 migration completed successfully!")

    except Exception as e:
        print(f"ERROR: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
