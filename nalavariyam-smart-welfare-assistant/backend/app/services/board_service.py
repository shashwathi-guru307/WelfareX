"""
Welfare Board service — CRUD operations for welfare boards.
"""

from typing import Optional
from app.database import fetch_one, fetch_all, execute


def get_all_boards() -> list[dict]:
    """Fetch all active welfare boards."""
    return fetch_all(
        """
        SELECT wb.*,
            (SELECT COUNT(*) FROM workers w WHERE w.board_id = wb.id AND w.is_active = 1) as worker_count,
            (SELECT COUNT(*) FROM registrations r WHERE r.board_id = wb.id AND r.status = 'Active') as active_registrations
        FROM welfare_boards wb
        WHERE wb.is_active = 1
        ORDER BY wb.name
        """
    )


def get_board_by_id(board_id: int) -> Optional[dict]:
    """Fetch a single welfare board by ID."""
    return fetch_one(
        """
        SELECT wb.*,
            (SELECT COUNT(*) FROM workers w WHERE w.board_id = wb.id AND w.is_active = 1) as worker_count,
            (SELECT COUNT(*) FROM registrations r WHERE r.board_id = wb.id AND r.status = 'Active') as active_registrations
        FROM welfare_boards wb
        WHERE wb.id = ? AND wb.is_active = 1
        """,
        (board_id,),
    )


def create_board(data: dict) -> dict:
    """Create a new welfare board."""
    board_id = execute(
        """
        INSERT INTO welfare_boards (name, description, is_active, registration_requirements)
        VALUES (?, ?, ?, ?)
        """,
        (
            data["name"],
            data.get("description", ""),
            data.get("is_active", 1),
            data.get("registration_requirements", ""),
        ),
    )
    return get_board_by_id(board_id)


def update_board(board_id: int, data: dict) -> Optional[dict]:
    """Update an existing welfare board."""
    fields = ["name", "description", "is_active", "registration_requirements"]
    present_fields = [f for f in fields if f in data]
    if not present_fields:
        return get_board_by_id(board_id)

    set_clause = ", ".join([f"{f} = ?" for f in present_fields])
    values = [data[f] for f in present_fields]
    values.append(board_id)

    execute(
        f"UPDATE welfare_boards SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        tuple(values),
    )
    return get_board_by_id(board_id)


def delete_board(board_id: int) -> bool:
    """Soft-delete a welfare board."""
    affected = execute(
        "UPDATE welfare_boards SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND is_active = 1",
        (board_id,),
    )
    return affected > 0
