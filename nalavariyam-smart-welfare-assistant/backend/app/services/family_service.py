"""
Family Member service — CRUD operations for worker family members.
Supports managing family members of registered workers.
"""

from typing import Optional
from datetime import date, datetime
from app.database import fetch_one, fetch_all, execute


def calculate_age_from_dob(dob_str: Optional[str]) -> Optional[int]:
    """Calculate age from DOB string."""
    if not dob_str:
        return None
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except (ValueError, TypeError):
        return None


def get_family_members(worker_id: int) -> list[dict]:
    """Fetch all family members for a worker."""
    members = fetch_all(
        """
        SELECT * FROM family_members
        WHERE worker_id = ?
        ORDER BY
            CASE relationship
                WHEN 'Spouse' THEN 1
                WHEN 'Son' THEN 2
                WHEN 'Daughter' THEN 3
                WHEN 'Father' THEN 4
                WHEN 'Mother' THEN 5
                ELSE 6
            END,
            date_of_birth ASC
        """,
        (worker_id,),
    )
    # Add computed age
    for member in members:
        member['age'] = calculate_age_from_dob(member.get('date_of_birth'))
    return members


def get_family_member_by_id(member_id: int) -> Optional[dict]:
    """Fetch a single family member by ID."""
    member = fetch_one(
        "SELECT * FROM family_members WHERE id = ?",
        (member_id,),
    )
    if member:
        member['age'] = calculate_age_from_dob(member.get('date_of_birth'))
    return member


def create_family_member(worker_id: int, data: dict) -> dict:
    """Create a new family member record."""
    fields = [
        'name', 'relationship', 'date_of_birth', 'gender',
        'mobile_number', 'education_level', 'occupation', 'marital_status',
        'has_disability', 'disability_details', 'disability_type',
        'disability_percentage', 'disability_certificate_available',
        'is_dependent', 'is_employed', 'monthly_income',
        'is_currently_studying', 'course_or_class', 'institution_name',
        'academic_year', 'aadhaar_hash', 'notes',
    ]
    present_fields = [f for f in fields if f in data]
    placeholders = ', '.join(['?'] * (len(present_fields) + 1))
    columns = ', '.join(['worker_id'] + present_fields)
    values = [worker_id] + [data[f] for f in present_fields]

    member_id = execute(
        f"INSERT INTO family_members ({columns}) VALUES ({placeholders})",
        tuple(values),
    )
    return get_family_member_by_id(member_id)


def update_family_member(member_id: int, data: dict) -> Optional[dict]:
    """Update an existing family member record."""
    fields = [
        'name', 'relationship', 'date_of_birth', 'gender',
        'mobile_number', 'education_level', 'occupation', 'marital_status',
        'has_disability', 'disability_details', 'disability_type',
        'disability_percentage', 'disability_certificate_available',
        'is_dependent', 'is_employed', 'monthly_income',
        'is_currently_studying', 'course_or_class', 'institution_name',
        'academic_year', 'aadhaar_hash', 'notes',
    ]
    present_fields = [f for f in fields if f in data]
    if not present_fields:
        return get_family_member_by_id(member_id)

    set_clause = ', '.join([f"{f} = ?" for f in present_fields])
    values = [data[f] for f in present_fields]
    values.append(member_id)

    execute(
        f"UPDATE family_members SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        tuple(values),
    )
    return get_family_member_by_id(member_id)


def delete_family_member(member_id: int) -> bool:
    """Permanently delete a family member record."""
    affected = execute(
        "DELETE FROM family_members WHERE id = ?",
        (member_id,),
    )
    return affected > 0


def get_family_member_count(worker_id: int) -> int:
    """Return the count of family members for a worker."""
    result = fetch_one(
        "SELECT COUNT(*) as count FROM family_members WHERE worker_id = ?",
        (worker_id,),
    )
    return result["count"] if result else 0


def get_family_member_count_by_relationship(worker_id: int, relationship: str) -> int:
    """Return count of family members with a specific relationship."""
    result = fetch_one(
        "SELECT COUNT(*) as count FROM family_members WHERE worker_id = ? AND relationship = ?",
        (worker_id, relationship),
    )
    return result["count"] if result else 0
