"""
Education Record service — CRUD operations for worker/family education records.
Supports managing education information for workers and their family members.
"""

from typing import Optional
from app.database import fetch_one, fetch_all, execute


# Controlled set of education levels
EDUCATION_LEVELS = [
    'No Formal Education',
    'Primary',
    'Secondary',
    'Higher Secondary',
    'Diploma',
    'Undergraduate',
    'Postgraduate',
    'PhD',
    'Other',
]


def get_education_records(worker_id: int, family_member_id: Optional[int] = None) -> list[dict]:
    """Fetch education records for a worker, optionally filtered by family member."""
    conditions = ["er.worker_id = ?"]
    params: list = [worker_id]

    if family_member_id is not None:
        conditions.append("er.family_member_id = ?")
        params.append(family_member_id)

    where_clause = " AND ".join(conditions)

    return fetch_all(
        f"""
        SELECT er.*, fm.name as family_member_name, fm.relationship
        FROM education_records er
        LEFT JOIN family_members fm ON er.family_member_id = fm.id
        WHERE {where_clause}
        ORDER BY er.created_at DESC
        """,
        tuple(params),
    )


def get_education_record_by_id(record_id: int) -> Optional[dict]:
    """Fetch a single education record by ID."""
    return fetch_one(
        """
        SELECT er.*, fm.name as family_member_name, fm.relationship
        FROM education_records er
        LEFT JOIN family_members fm ON er.family_member_id = fm.id
        WHERE er.id = ?
        """,
        (record_id,),
    )


def create_education_record(worker_id: int, data: dict) -> dict:
    """Create a new education record."""
    fields = [
        'family_member_id', 'education_level', 'course', 'institution',
        'board_university', 'year_of_study', 'is_currently_studying',
        'percentage_cgpa', 'year_of_completion',
    ]
    present_fields = [f for f in fields if f in data]
    placeholders = ', '.join(['?'] * (len(present_fields) + 1))
    columns = ', '.join(['worker_id'] + present_fields)
    values = [worker_id] + [data[f] for f in present_fields]

    record_id = execute(
        f"INSERT INTO education_records ({columns}) VALUES ({placeholders})",
        tuple(values),
    )
    return get_education_record_by_id(record_id)


def update_education_record(record_id: int, data: dict) -> Optional[dict]:
    """Update an existing education record."""
    fields = [
        'family_member_id', 'education_level', 'course', 'institution',
        'board_university', 'year_of_study', 'is_currently_studying',
        'percentage_cgpa', 'year_of_completion',
    ]
    present_fields = [f for f in fields if f in data]
    if not present_fields:
        return get_education_record_by_id(record_id)

    set_clause = ', '.join([f"{f} = ?" for f in present_fields])
    values = [data[f] for f in present_fields]
    values.append(record_id)

    execute(
        f"UPDATE education_records SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        tuple(values),
    )
    return get_education_record_by_id(record_id)


def delete_education_record(record_id: int) -> bool:
    """Permanently delete an education record."""
    affected = execute(
        "DELETE FROM education_records WHERE id = ?",
        (record_id,),
    )
    return affected > 0


def get_education_levels() -> list[str]:
    """Return the list of valid education levels."""
    return EDUCATION_LEVELS.copy()
