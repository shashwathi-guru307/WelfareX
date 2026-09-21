"""
Welfare Scheme service — CRUD operations for schemes, categories,
board-specific benefits, qualifications, and eligibility rules.
"""

from typing import Optional
from app.database import fetch_one, fetch_all, execute


def get_all_schemes(
    category_id: Optional[int] = None,
    board_id: Optional[int] = None,
    search: Optional[str] = None,
) -> list[dict]:
    """Fetch all active welfare schemes with optional filtering."""
    conditions = ["ws.is_active = 1"]
    params: list = []

    if category_id:
        conditions.append("ws.category_id = ?")
        params.append(category_id)

    if board_id:
        # Filter by board: either scheme.board_id matches OR a scheme_benefit exists for this board
        conditions.append("(ws.board_id = ? OR ws.id IN (SELECT scheme_id FROM scheme_benefits WHERE board_id = ? AND is_available = 1))")
        params.extend([board_id, board_id])

    if search:
        conditions.append("(ws.name LIKE ? OR ws.description LIKE ? OR ws.qualification_text LIKE ?)")
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])

    where_clause = " AND ".join(conditions)

    schemes = fetch_all(
        f"""
        SELECT ws.*, sc.name as category_name, wb.name as board_name
        FROM welfare_schemes ws
        LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
        LEFT JOIN welfare_boards wb ON ws.board_id = wb.id
        WHERE {where_clause}
        ORDER BY sc.display_order, ws.name
        """,
        tuple(params),
    )

    # Attach summary stats for each scheme
    for scheme in schemes:
        benefit_count = fetch_one(
            "SELECT COUNT(*) as cnt FROM scheme_benefits WHERE scheme_id = ? AND is_available = 1",
            (scheme["id"],),
        )
        qual_count = fetch_one(
            "SELECT COUNT(*) as cnt FROM scheme_qualifications WHERE scheme_id = ?",
            (scheme["id"],),
        )
        scheme["available_boards"] = benefit_count["cnt"] if benefit_count else 0
        scheme["qualification_count"] = qual_count["cnt"] if qual_count else 0

    return schemes


def get_scheme_by_id(scheme_id: int) -> Optional[dict]:
    """Fetch a single welfare scheme by ID with benefits, qualifications, and rules."""
    scheme = fetch_one(
        """
        SELECT ws.*, sc.name as category_name, wb.name as board_name
        FROM welfare_schemes ws
        LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
        LEFT JOIN welfare_boards wb ON ws.board_id = wb.id
        WHERE ws.id = ? AND ws.is_active = 1
        """,
        (scheme_id,),
    )
    if not scheme:
        return None

    # Fetch board-specific benefits
    benefits = fetch_all(
        """
        SELECT sb.*, wb.name as board_name
        FROM scheme_benefits sb
        LEFT JOIN welfare_boards wb ON sb.board_id = wb.id
        WHERE sb.scheme_id = ?
        ORDER BY sb.board_id, sb.qualification_id
        """,
        (scheme_id,),
    )
    scheme["board_benefits"] = benefits

    # Fetch qualification variants
    qualifications = fetch_all(
        """
        SELECT * FROM scheme_qualifications
        WHERE scheme_id = ?
        ORDER BY sort_order
        """,
        (scheme_id,),
    )
    scheme["qualifications"] = qualifications

    # Fetch structured scheme rules
    scheme_rules = fetch_all(
        """
        SELECT * FROM scheme_rules
        WHERE scheme_id = ?
        ORDER BY priority DESC
        """,
        (scheme_id,),
    )
    scheme["scheme_rules"] = scheme_rules

    # Fetch legacy eligibility rules (if any)
    rules = fetch_all(
        """
        SELECT * FROM eligibility_rules
        WHERE scheme_id = ?
        ORDER BY priority DESC
        """,
        (scheme_id,),
    )
    scheme["eligibility_rules"] = rules

    return scheme


def get_scheme_benefits(scheme_id: int, board_id: Optional[int] = None) -> list[dict]:
    """Fetch board-specific benefits for a scheme."""
    conditions = ["sb.scheme_id = ?"]
    params: list = [scheme_id]

    if board_id:
        conditions.append("sb.board_id = ?")
        params.append(board_id)

    where_clause = " AND ".join(conditions)

    return fetch_all(
        f"""
        SELECT sb.*, wb.name as board_name,
               sq.qualification_text, sq.education_level, sq.education_type, sq.sort_order
        FROM scheme_benefits sb
        LEFT JOIN welfare_boards wb ON sb.board_id = wb.id
        LEFT JOIN scheme_qualifications sq ON sb.qualification_id = sq.id
        WHERE {where_clause}
        ORDER BY sq.sort_order, sb.board_id
        """,
        tuple(params),
    )


def get_scheme_qualifications(scheme_id: int) -> list[dict]:
    """Fetch qualification variants for a scheme."""
    return fetch_all(
        """
        SELECT * FROM scheme_qualifications
        WHERE scheme_id = ?
        ORDER BY sort_order
        """,
        (scheme_id,),
    )


def get_scheme_rules(scheme_id: int) -> list[dict]:
    """Fetch structured eligibility rules for a scheme."""
    return fetch_all(
        """
        SELECT * FROM scheme_rules
        WHERE scheme_id = ?
        ORDER BY priority DESC
        """,
        (scheme_id,),
    )


def get_all_boards() -> list[dict]:
    """Fetch all active welfare boards."""
    return fetch_all(
        """
        SELECT wb.*,
            (SELECT COUNT(DISTINCT sb.scheme_id) FROM scheme_benefits sb WHERE sb.board_id = wb.id AND sb.is_available = 1) as scheme_count
        FROM welfare_boards wb
        WHERE wb.is_active = 1
        ORDER BY wb.name
        """
    )


def create_scheme(data: dict) -> dict:
    """Create a new welfare scheme."""
    scheme_id = execute(
        """
        INSERT INTO welfare_schemes
        (name, category_id, board_id, description, benefit_description,
         amount_details, eligibility_summary, required_documents, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["name"],
            data.get("category_id"),
            data.get("board_id"),
            data.get("description", ""),
            data.get("benefit_description", ""),
            data.get("amount_details", ""),
            data.get("eligibility_summary", ""),
            data.get("required_documents", ""),
            data.get("is_active", 1),
        ),
    )
    return get_scheme_by_id(scheme_id)


def update_scheme(scheme_id: int, data: dict) -> Optional[dict]:
    """Update an existing welfare scheme."""
    fields = [
        "name", "category_id", "board_id", "description",
        "benefit_description", "amount_details", "eligibility_summary",
        "required_documents", "is_active",
    ]
    present_fields = [f for f in fields if f in data]
    if not present_fields:
        return get_scheme_by_id(scheme_id)

    set_clause = ", ".join([f"{f} = ?" for f in present_fields])
    values = [data[f] for f in present_fields]
    values.append(scheme_id)

    execute(
        f"UPDATE welfare_schemes SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        tuple(values),
    )
    return get_scheme_by_id(scheme_id)


def delete_scheme(scheme_id: int) -> bool:
    """Soft-delete a welfare scheme."""
    affected = execute(
        "UPDATE welfare_schemes SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND is_active = 1",
        (scheme_id,),
    )
    return affected > 0


# ============================================================
# Scheme Categories
# ============================================================

def get_all_scheme_categories() -> list[dict]:
    """Fetch all active scheme categories."""
    return fetch_all(
        """
        SELECT sc.*,
            (SELECT COUNT(*) FROM welfare_schemes ws WHERE ws.category_id = sc.id AND ws.is_active = 1) as scheme_count
        FROM scheme_categories sc
        WHERE sc.is_active = 1
        ORDER BY sc.display_order, sc.name
        """
    )


def get_scheme_category_by_id(category_id: int) -> Optional[dict]:
    """Fetch a single scheme category by ID."""
    return fetch_one(
        """
        SELECT sc.*,
            (SELECT COUNT(*) FROM welfare_schemes ws WHERE ws.category_id = sc.id AND ws.is_active = 1) as scheme_count
        FROM scheme_categories sc
        WHERE sc.id = ? AND sc.is_active = 1
        """,
        (category_id,),
    )


def create_scheme_category(data: dict) -> dict:
    """Create a new scheme category."""
    cat_id = execute(
        """
        INSERT INTO scheme_categories (name, description, display_order, is_active)
        VALUES (?, ?, ?, ?)
        """,
        (
            data["name"],
            data.get("description", ""),
            data.get("display_order", 0),
            data.get("is_active", 1),
        ),
    )
    return get_scheme_category_by_id(cat_id)


def update_scheme_category(category_id: int, data: dict) -> Optional[dict]:
    """Update an existing scheme category."""
    fields = ["name", "description", "display_order", "is_active"]
    present_fields = [f for f in fields if f in data]
    if not present_fields:
        return get_scheme_category_by_id(category_id)

    set_clause = ", ".join([f"{f} = ?" for f in present_fields])
    values = [data[f] for f in present_fields]
    values.append(category_id)

    execute(
        f"UPDATE scheme_categories SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        tuple(values),
    )
    return get_scheme_category_by_id(category_id)
