"""
Worker (Applicant) service — Phase 2 expanded CRUD operations.
Supports advanced search, filtering, sorting, pagination, family, and education.
"""

from typing import Optional
from datetime import date, datetime
from app.database import fetch_one, fetch_all, execute
from app.services.renewal_service import calculate_renewal_status, days_until_renewal, calculate_urgency


# Allowed sort columns mapped to SQL expressions
SORT_COLUMNS = {
    'name': 'w.full_name',
    'registration_number': 'r.registration_number',
    'registration_date': 'r.registration_date',
    'renewal_date': 'r.validity_date',
    'board': 'wb.name',
    'status': 'r.status',
    'district': 'w.district',
    'occupation': 'w.occupation',
    'created_at': 'w.created_at',
    'date_of_birth': 'w.date_of_birth',
}

# Valid sort orders
SORT_ORDERS = {'asc', 'desc'}

# Valid registration statuses
VALID_STATUSES = {'Active', 'Renewal Due', 'Expiring Soon', 'Expired', 'Suspended', 'Pending Verification', 'Cancelled'}

# Renewal filter buckets
RENEWAL_FILTERS = {
    'overdue': {'max_days': 0},        # Expired / overdue
    '7_days': {'max_days': 7},          # Due within 7 days
    '30_days': {'max_days': 30},        # Due within 30 days
    '90_days': {'max_days': 90},        # Due within 90 days
    'active': {'min_days': 91},         # Active (>90 days remaining)
}


def calculate_age(dob_str: Optional[str]) -> Optional[int]:
    """Calculate age from DOB string."""
    if not dob_str:
        return None
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except (ValueError, TypeError):
        return None


def get_all_workers(
    search: Optional[str] = None,
    board_id: Optional[int] = None,
    district: Optional[str] = None,
    occupation: Optional[str] = None,
    status: Optional[str] = None,
    renewal: Optional[str] = None,
    renewal_status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = 'desc',
    page: int = 1,
    per_page: int = 20,
) -> dict:
    """Fetch workers with optional filtering, search, sorting, and pagination."""
    conditions = ["w.is_active = 1", "w.is_archived = 0"]
    params: list = []

    # Search across multiple fields
    if search:
        conditions.append(
            "(w.full_name LIKE ? OR r.registration_number LIKE ? OR w.mobile_number LIKE ? "
            "OR w.occupation LIKE ? OR w.district LIKE ? OR w.worker_category LIKE ?)"
        )
        search_term = f"%{search}%"
        params.extend([search_term] * 6)

    # Board filter
    if board_id:
        conditions.append("w.board_id = ?")
        params.append(board_id)

    # District filter
    if district:
        conditions.append("w.district = ?")
        params.append(district)

    # Occupation filter
    if occupation:
        conditions.append("w.occupation = ?")
        params.append(occupation)

    # Status filter (from registration status)
    if status:
        conditions.append("r.status = ?")
        params.append(status)

    # Renewal-based filter (date calculations)
    if renewal and renewal in RENEWAL_FILTERS:
        today_str = date.today().isoformat()
        bucket = RENEWAL_FILTERS[renewal]
        if 'max_days' in bucket:
            max_date = date.today() + __import__('datetime').timedelta(days=bucket['max_days'])
            conditions.append("r.validity_date <= ?")
            params.append(max_date.isoformat())
            if renewal != 'overdue':
                conditions.append("r.validity_date >= ?")
                params.append(today_str)
        if 'min_days' in bucket:
            min_date = date.today() + __import__('datetime').timedelta(days=bucket['min_days'])
            conditions.append("r.validity_date > ?")
            params.append(min_date.isoformat())

    # Phase 5: Renewal status filter (computed status)
    if renewal_status:
        today_str = date.today().isoformat()
        if renewal_status == 'ACTIVE':
            conditions.append("r.validity_date > ?")
            params.append((date.today() + __import__('datetime').timedelta(days=30)).isoformat())
        elif renewal_status == 'EXPIRING_SOON':
            conditions.append("r.validity_date >= ? AND r.validity_date <= ?")
            params.append(today_str)
            params.append((date.today() + __import__('datetime').timedelta(days=30)).isoformat())
        elif renewal_status == 'EXPIRED':
            conditions.append("r.validity_date < ?")
            params.append(today_str)
        elif renewal_status == 'NO_RENEWAL_DATE':
            conditions.append("(r.validity_date IS NULL OR r.validity_date = '')")

    where_clause = " AND ".join(conditions)

    # Count total
    count_query = f"""
        SELECT COUNT(DISTINCT w.id) as total
        FROM workers w
        LEFT JOIN registrations r ON w.id = r.worker_id
        WHERE {where_clause}
    """
    total_row = fetch_one(count_query, tuple(params))
    total = total_row["total"] if total_row else 0

    # Sort clause
    sort_sql = "w.created_at DESC"  # default
    if sort_by and sort_by in SORT_COLUMNS:
        order = "ASC" if sort_order.lower() == 'asc' else "DESC"
        sort_sql = f"{SORT_COLUMNS[sort_by]} {order} NULLS LAST"

    # Fetch workers with registration info
    offset = (page - 1) * per_page
    query = f"""
        SELECT
            w.id, w.full_name, w.father_husband_name, w.date_of_birth, w.gender,
            w.mobile_number, w.alternate_mobile, w.address, w.district, w.taluk,
            w.village_town, w.pincode, w.ration_card_number, w.nature_of_work,
            w.occupation, w.worker_category, w.board_id, w.education_level,
            w.marital_status, w.has_disability, w.disability_details,
            w.created_at, w.updated_at,
            wb.name as board_name,
            r.id as registration_id, r.registration_number, r.registration_date,
            r.validity_date, r.renewal_date, r.status as registration_status
        FROM workers w
        LEFT JOIN welfare_boards wb ON w.board_id = wb.id
        LEFT JOIN registrations r ON w.id = r.worker_id
        WHERE {where_clause}
        ORDER BY {sort_sql}
        LIMIT ? OFFSET ?
    """
    params.extend([per_page, offset])
    workers = fetch_all(query, tuple(params))

    # Add computed fields
    for worker in workers:
        worker['age'] = calculate_age(worker.get('date_of_birth'))
        if worker.get('validity_date'):
            worker['renewal_summary'] = calculate_renewal_status(worker['validity_date'])
            worker['urgency'] = calculate_urgency(worker['validity_date'])
            from datetime import date as _date
            worker['days_until_renewal'] = (datetime.strptime(worker['validity_date'], '%Y-%m-%d').date() - _date.today()).days
        else:
            worker['renewal_summary'] = 'NO_RENEWAL_DATE'
            worker['urgency'] = 'unknown'
            worker['days_until_renewal'] = None

    return {
        "workers": workers,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page)),
    }


def get_worker_by_id(worker_id: int) -> Optional[dict]:
    """Fetch a single worker by ID with all related information."""
    worker = fetch_one(
        """
        SELECT w.*, wb.name as board_name
        FROM workers w
        LEFT JOIN welfare_boards wb ON w.board_id = wb.id
        WHERE w.id = ? AND w.is_active = 1
        """,
        (worker_id,),
    )
    if not worker:
        return None

    # Computed age
    worker['age'] = calculate_age(worker.get('date_of_birth'))

    # Fetch registrations
    registrations = fetch_all(
        """
        SELECT r.*, wb.name as board_name
        FROM registrations r
        LEFT JOIN welfare_boards wb ON r.board_id = wb.id
        WHERE r.worker_id = ?
        ORDER BY r.created_at DESC
        """,
        (worker_id,),
    )

    # Add renewal info to registrations
    for reg in registrations:
        if reg.get('validity_date'):
            reg['days_until_renewal'] = days_until_renewal(reg['validity_date'])
            reg['computed_status'] = calculate_renewal_status(reg['validity_date'])
        else:
            reg['days_until_renewal'] = None
            reg['computed_status'] = None

    # Fetch family members
    from app.services.family_service import get_family_members
    family_members = get_family_members(worker_id)

    # Fetch education records
    from app.services.education_service import get_education_records
    education_records = get_education_records(worker_id)

    # Fetch scheme applications
    applications = fetch_all(
        """
        SELECT sa.*, ws.name as scheme_name, sc.name as category_name
        FROM scheme_applications sa
        LEFT JOIN welfare_schemes ws ON sa.scheme_id = ws.id
        LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
        WHERE sa.worker_id = ?
        ORDER BY sa.created_at DESC
        """,
        (worker_id,),
    )

    worker['registrations'] = registrations
    worker['family_members'] = family_members
    worker['education_records'] = education_records
    worker['scheme_applications'] = applications

    return worker


def create_worker(data: dict) -> dict:
    """Create a new worker record."""
    fields = [
        'full_name', 'father_husband_name', 'date_of_birth', 'gender',
        'mobile_number', 'alternate_mobile', 'address', 'district', 'taluk',
        'village_town', 'pincode', 'aadhaar_hash', 'ration_card_number',
        'reference_id', 'nature_of_work', 'occupation', 'worker_category',
        'board_id', 'education_level', 'marital_status',
        'has_disability', 'disability_details',
    ]
    present_fields = [f for f in fields if f in data]
    placeholders = ', '.join(['?'] * len(present_fields))
    columns = ', '.join(present_fields)
    values = [data[f] for f in present_fields]

    worker_id = execute(
        f"INSERT INTO workers ({columns}) VALUES ({placeholders})",
        tuple(values),
    )
    return get_worker_by_id(worker_id)


def update_worker(worker_id: int, data: dict) -> Optional[dict]:
    """Update an existing worker record."""
    fields = [
        'full_name', 'father_husband_name', 'date_of_birth', 'gender',
        'mobile_number', 'alternate_mobile', 'address', 'district', 'taluk',
        'village_town', 'pincode', 'aadhaar_hash', 'ration_card_number',
        'reference_id', 'nature_of_work', 'occupation', 'worker_category',
        'board_id', 'education_level', 'marital_status',
        'has_disability', 'disability_details', 'is_active', 'is_archived',
    ]
    present_fields = [f for f in fields if f in data]
    if not present_fields:
        return get_worker_by_id(worker_id)

    set_clause = ', '.join([f"{f} = ?" for f in present_fields])
    values = [data[f] for f in present_fields]
    values.append(worker_id)

    execute(
        f"UPDATE workers SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        tuple(values),
    )
    return get_worker_by_id(worker_id)


def delete_worker(worker_id: int) -> bool:
    """Soft-delete a worker (set is_active = 0)."""
    affected = execute(
        "UPDATE workers SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND is_active = 1",
        (worker_id,),
    )
    return affected > 0


def archive_worker(worker_id: int) -> bool:
    """Archive a worker (set is_archived = 1)."""
    affected = execute(
        "UPDATE workers SET is_archived = 1, updated_at = datetime('now') WHERE id = ? AND is_active = 1",
        (worker_id,),
    )
    return affected > 0


def unarchive_worker(worker_id: int) -> bool:
    """Unarchive a worker (set is_archived = 0)."""
    affected = execute(
        "UPDATE workers SET is_archived = 0, updated_at = datetime('now') WHERE id = ?",
        (worker_id,),
    )
    return affected > 0


def get_worker_count() -> int:
    """Return the total count of active workers."""
    result = fetch_one(
        "SELECT COUNT(*) as count FROM workers WHERE is_active = 1 AND is_archived = 0"
    )
    return result["count"] if result else 0


def get_occupation_list() -> list[str]:
    """Return distinct occupations from the database."""
    rows = fetch_all(
        "SELECT DISTINCT occupation FROM workers WHERE is_active = 1 AND occupation IS NOT NULL ORDER BY occupation"
    )
    return [r['occupation'] for r in rows]


def get_district_list() -> list[str]:
    """Return distinct districts from the database."""
    rows = fetch_all(
        "SELECT DISTINCT district FROM workers WHERE is_active = 1 AND district IS NOT NULL ORDER BY district"
    )
    return [r['district'] for r in rows]


def check_duplicate_registration(registration_number: str, exclude_worker_id: Optional[int] = None) -> Optional[dict]:
    """Check if a registration number already exists."""
    if exclude_worker_id:
        return fetch_one(
            "SELECT id, worker_id, registration_number FROM registrations WHERE registration_number = ? AND worker_id != ?",
            (registration_number, exclude_worker_id),
        )
    return fetch_one(
        "SELECT id, worker_id, registration_number FROM registrations WHERE registration_number = ?",
        (registration_number,),
    )
