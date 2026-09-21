"""
Case Management Service — Phase 7
Comprehensive case management for welfare benefit processing.

Provides:
  - Case CRUD with auto-generated case numbers
  - Document checklist management
  - Task/follow-up management
  - Case notes (internal)
  - Activity timeline
  - Status transition validation
  - Duplicate case detection
  - Case readiness calculation
  - Statistics & work queue
"""

import json
from datetime import datetime, date
from typing import Optional
from app.database import fetch_one, fetch_all, execute


# ============================================================
# Constants
# ============================================================

CASE_STATUSES = [
    'NEW', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'ELIGIBILITY_REVIEW',
    'READY_FOR_SUBMISSION', 'FOLLOW_UP_REQUIRED', 'COMPLETED', 'REJECTED', 'CLOSED'
]

VALID_TRANSITIONS = {
    'NEW':              ['UNDER_REVIEW', 'REJECTED', 'CLOSED'],
    'UNDER_REVIEW':     ['DOCUMENTS_PENDING', 'ELIGIBILITY_REVIEW', 'FOLLOW_UP_REQUIRED', 'REJECTED', 'CLOSED'],
    'DOCUMENTS_PENDING':['UNDER_REVIEW', 'ELIGIBILITY_REVIEW', 'FOLLOW_UP_REQUIRED', 'CLOSED'],
    'ELIGIBILITY_REVIEW':['READY_FOR_SUBMISSION', 'DOCUMENTS_PENDING', 'FOLLOW_UP_REQUIRED', 'REJECTED', 'CLOSED'],
    'READY_FOR_SUBMISSION':['ELIGIBILITY_REVIEW', 'COMPLETED', 'FOLLOW_UP_REQUIRED', 'CLOSED'],
    'FOLLOW_UP_REQUIRED':['UNDER_REVIEW', 'DOCUMENTS_PENDING', 'ELIGIBILITY_REVIEW', 'CLOSED'],
    'COMPLETED':        ['CLOSED'],           # Can close after completion
    'REJECTED':         ['UNDER_REVIEW'],     # Can reopen from rejection
    'CLOSED':           ['UNDER_REVIEW'],     # Can reopen
}

TASK_TYPES = [
    'CALL_APPLICANT', 'DOCUMENT_COLLECTION', 'DOCUMENT_VERIFICATION',
    'ELIGIBILITY_REVIEW', 'RENEWAL_FOLLOWUP', 'SCHEME_REVIEW', 'OTHER'
]

CLOSURE_REASONS = [
    'BENEFIT_PROCESSED', 'NOT_ELIGIBLE', 'APPLICANT_WITHDREW',
    'DUPLICATE_CASE', 'NO_RESPONSE', 'OTHER'
]

DOC_STATUSES = [
    'NOT_SUBMITTED', 'SUBMITTED', 'UNDER_VERIFICATION',
    'VERIFIED', 'REJECTED', 'NOT_REQUIRED'
]


# ============================================================
# Case Number Generation
# ============================================================

def generate_case_number() -> str:
    """Generate a unique human-readable case number: NWSA-YYYY-NNNNNN"""
    year = datetime.now().year
    prefix = f"NWSA-{year}-"
    row = fetch_one(
        "SELECT case_number FROM cases WHERE case_number LIKE ? ORDER BY id DESC LIMIT 1",
        (f"{prefix}%",),
    )
    if row:
        last_num = int(row["case_number"].split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f"{prefix}{next_num:06d}"


# ============================================================
# Case CRUD
# ============================================================

def create_case(
    worker_id: int,
    title: str,
    scheme_id: Optional[int] = None,
    scheme_variant_id: Optional[int] = None,
    claimant_id: Optional[int] = None,
    claimant_type: str = 'WORKER',
    description: Optional[str] = None,
    priority: str = 'MEDIUM',
    assigned_to: Optional[str] = None,
    created_by: Optional[str] = None,
    document_checklist: Optional[list] = None,
    created_by_user_id: Optional[int] = None,
) -> dict:
    """Create a new case with optional document checklist."""
    case_number = generate_case_number()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Check for duplicate active case
    dup = _check_duplicate_case(worker_id, scheme_id, claimant_id, claimant_type)
    if dup:
        return {"error": f"An active case already exists for this benefit: {dup['case_number']}"}

    case_id = execute(
        """INSERT INTO cases
           (case_number, worker_id, scheme_id, scheme_variant_id,
            claimant_id, claimant_type, title, description,
            status, priority, assigned_to, assigned_at,
            opened_at, updated_at, created_by, created_by_user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?, ?, ?)""",
        (case_number, worker_id, scheme_id, scheme_variant_id,
         claimant_id, claimant_type, title, description,
         priority, assigned_to, assigned_to, now, now, created_by, created_by_user_id, now),
    )

    # Create document checklist if provided
    if document_checklist:
        for doc in document_checklist:
            execute(
                """INSERT INTO case_documents
                   (case_id, document_type, document_name, required, status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 'NOT_SUBMITTED', ?, ?)""",
                (case_id, doc.get('document_type', 'OTHER'),
                 doc.get('document_name', 'Document'),
                 1 if doc.get('required', True) else 0, now, now),
            )

    # Log activity
    _log_case_activity(case_id, 'CASE_CREATED', 'Case created',
                       new_value='NEW',
                       metadata={'created_by': created_by})

    return get_case_by_id(case_id)


def get_case_by_id(case_id: int) -> Optional[dict]:
    """Get a single case with all related data."""
    row = fetch_one(
        """SELECT c.*,
                  w.full_name as worker_name, w.district as worker_district,
                  w.mobile_number as worker_mobile, w.board_id as worker_board_id,
                  wb.name as board_name,
                  ws.name as scheme_name, ws.scheme_code as scheme_code,
                  sq.qualification_text as variant_name
           FROM cases c
           LEFT JOIN workers w ON c.worker_id = w.id
           LEFT JOIN welfare_boards wb ON w.board_id = wb.id
           LEFT JOIN welfare_schemes ws ON c.scheme_id = ws.id
           LEFT JOIN scheme_qualifications sq ON c.scheme_variant_id = sq.id
           WHERE c.id = ?""",
        (case_id,),
    )
    if not row:
        return None

    case = dict(row)

    # Fetch claimant info
    if case.get('claimant_id') and case.get('claimant_type') == 'FAMILY_MEMBER':
        fm = fetch_one(
            "SELECT name, relationship FROM family_members WHERE id = ?",
            (case['claimant_id'],),
        )
        if fm:
            case['claimant_name'] = fm['name']
            case['claimant_relationship'] = fm['relationship']
    elif case.get('claimant_type') == 'WORKER':
        case['claimant_name'] = case.get('worker_name')
        case['claimant_relationship'] = 'Self'

    # Documents
    case['documents'] = get_case_documents(case_id)
    case['document_summary'] = _compute_doc_summary(case['documents'])

    # Tasks
    case['tasks'] = get_case_tasks(case_id)

    # Notes
    case['notes'] = get_case_notes(case_id)

    # Activity
    case['activities'] = get_case_activities(case_id)

    # Readiness
    case['readiness'] = _compute_case_readiness(case)

    return case


def list_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    board_id: Optional[int] = None,
    scheme_id: Optional[int] = None,
    assigned_to: Optional[str] = None,
    worker_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    user_id: Optional[int] = None,
) -> dict:
    """List cases with filtering, search, and pagination.
    If user_id is provided, only returns cases created by that user.
    """
    conditions = []
    params: list = []

    # Per-user data isolation
    if user_id is not None:
        conditions.append("c.created_by_user_id = ?")
        params.append(user_id)

    if status:
        conditions.append("c.status = ?")
        params.append(status)
    if priority:
        conditions.append("c.priority = ?")
        params.append(priority)
    if board_id:
        conditions.append("w.board_id = ?")
        params.append(board_id)
    if scheme_id:
        conditions.append("c.scheme_id = ?")
        params.append(scheme_id)
    if assigned_to:
        conditions.append("c.assigned_to = ?")
        params.append(assigned_to)
    if worker_id:
        conditions.append("c.worker_id = ?")
        params.append(worker_id)
    if date_from:
        conditions.append("c.created_at >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("c.created_at <= ?")
        params.append(date_to + " 23:59:59")
    if search:
        conditions.append(
            "(c.case_number LIKE ? OR c.title LIKE ? OR w.full_name LIKE ? OR ws.name LIKE ?)"
        )
        s = f"%{search}%"
        params.extend([s, s, s, s])

    where = " AND ".join(conditions) if conditions else "1=1"

    # Count
    count_row = fetch_one(
        f"""SELECT COUNT(*) as total FROM cases c
            LEFT JOIN workers w ON c.worker_id = w.id
            LEFT JOIN welfare_schemes ws ON c.scheme_id = ws.id
            WHERE {where}""",
        tuple(params),
    )
    total = count_row["total"] if count_row else 0

    # Paginate
    offset = (page - 1) * per_page
    rows = fetch_all(
        f"""SELECT c.*,
                   w.full_name as worker_name, w.district as worker_district,
                   wb.name as board_name,
                   ws.name as scheme_name
            FROM cases c
            LEFT JOIN workers w ON c.worker_id = w.id
            LEFT JOIN welfare_boards wb ON w.board_id = wb.id
            LEFT JOIN welfare_schemes ws ON c.scheme_id = ws.id
            WHERE {where}
            ORDER BY
                CASE c.priority
                    WHEN 'URGENT' THEN 0
                    WHEN 'HIGH' THEN 1
                    WHEN 'MEDIUM' THEN 2
                    WHEN 'LOW' THEN 3
                END,
                c.updated_at DESC
            LIMIT ? OFFSET ?""",
        tuple(params + [per_page, offset]),
    )

    cases = []
    for r in rows:
        c = dict(r)
        # Lightweight claimant info
        if c.get('claimant_id') and c.get('claimant_type') == 'FAMILY_MEMBER':
            fm = fetch_one(
                "SELECT name FROM family_members WHERE id = ?",
                (c['claimant_id'],),
            )
            c['claimant_name'] = fm['name'] if fm else 'Unknown'
        elif c.get('claimant_type') == 'WORKER':
            c['claimant_name'] = c.get('worker_name')
        else:
            c['claimant_name'] = '—'

        # Document summary (lightweight)
        docs = fetch_all(
            "SELECT status, required FROM case_documents WHERE case_id = ?",
            (c['id'],),
        )
        total_docs = len(docs)
        verified_docs = sum(1 for d in docs if d['status'] == 'VERIFIED')
        c['document_summary'] = {
            'total': total_docs,
            'verified': verified_docs,
            'completeness': round((verified_docs / total_docs * 100)) if total_docs > 0 else 0,
        }

        cases.append(c)

    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 1

    return {
        "cases": cases,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


def update_case(case_id: int, updates: dict) -> Optional[dict]:
    """Update case fields (non-status changes)."""
    allowed_fields = {
        'title', 'description', 'priority', 'assigned_to',
        'assignment_notes', 'scheme_id', 'scheme_variant_id',
        'claimant_id', 'claimant_type',
    }
    filtered = {k: v for k, v in updates.items() if k in allowed_fields}
    if not filtered:
        return get_case_by_id(case_id)

    set_clauses = []
    params = []
    for key, val in filtered.items():
        set_clauses.append(f"{key} = ?")
        params.append(val)
    set_clauses.append("updated_at = datetime('now')")
    params.append(case_id)

    execute(
        f"UPDATE cases SET {', '.join(set_clauses)} WHERE id = ?",
        tuple(params),
    )

    _log_case_activity(case_id, 'OTHER', f'Case updated: {", ".join(filtered.keys())}',
                       metadata=filtered)

    return get_case_by_id(case_id)


def change_case_status(case_id: int, new_status: str, reason: Optional[str] = None,
                       closure_reason: Optional[str] = None) -> Optional[dict]:
    """Change case status with transition validation."""
    if new_status not in CASE_STATUSES:
        return {"error": f"Invalid status: {new_status}"}

    current = fetch_one("SELECT status FROM cases WHERE id = ?", (case_id,))
    if not current:
        return {"error": "Case not found"}

    old_status = current["status"]

    # Validate transition
    if old_status not in VALID_TRANSITIONS or new_status not in VALID_TRANSITIONS.get(old_status, []):
        return {"error": f"Cannot transition from {old_status} to {new_status}"}

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    extra = ""
    extra_params = []
    if new_status == 'COMPLETED':
        extra = ", closed_at = ?"
        extra_params = [now]
    if new_status == 'CLOSED':
        extra = ", closed_at = ?, closure_reason = ?"
        extra_params = [now, closure_reason]

    execute(
        f"UPDATE cases SET status = ?, updated_at = datetime('now') {extra} WHERE id = ?",
        (new_status, *extra_params, case_id),
    )

    # Log activity
    desc = f"Status changed: {old_status} → {new_status}"
    if reason:
        desc += f"\nReason: {reason}"
    if closure_reason:
        desc += f"\nClosure reason: {closure_reason}"

    _log_case_activity(case_id, 'STATUS_CHANGED', desc,
                       old_value=old_status, new_value=new_status,
                       metadata={'reason': reason, 'closure_reason': closure_reason})

    return get_case_by_id(case_id)


def reopen_case(case_id: int, reason: str) -> Optional[dict]:
    """Reopen a closed/rejected case."""
    current = fetch_one("SELECT status FROM cases WHERE id = ?", (case_id,))
    if not current:
        return {"error": "Case not found"}

    old_status = current["status"]
    if old_status not in ('COMPLETED', 'REJECTED', 'CLOSED'):
        return {"error": f"Cannot reopen a case with status {old_status}"}

    if not reason:
        return {"error": "Reopen reason is required"}

    execute(
        "UPDATE cases SET status = 'UNDER_REVIEW', closed_at = NULL, closure_reason = NULL, updated_at = datetime('now') WHERE id = ?",
        (case_id,),
    )

    _log_case_activity(case_id, 'CASE_REOPENED', f"Case reopened: {reason}",
                       old_value=old_status, new_value='UNDER_REVIEW',
                       metadata={'reason': reason})

    return get_case_by_id(case_id)


def complete_case(case_id: int) -> Optional[dict]:
    """Mark a case as completed (with confirmation checks done by frontend)."""
    result = change_case_status(case_id, 'COMPLETED')
    if isinstance(result, dict) and 'error' in result:
        return result

    _log_case_activity(case_id, 'CASE_COMPLETED', 'Case marked as completed')
    return result


# ============================================================
# Duplicate Detection
# ============================================================

def _check_duplicate_case(
    worker_id: int,
    scheme_id: Optional[int],
    claimant_id: Optional[int],
    claimant_type: str,
) -> Optional[dict]:
    """Check if an active case already exists for the same worker/scheme/claimant."""
    conditions = ["c.worker_id = ?", "c.status NOT IN ('COMPLETED', 'REJECTED', 'CLOSED')"]
    params: list = [worker_id]

    if scheme_id:
        conditions.append("c.scheme_id = ?")
        params.append(scheme_id)
    if claimant_id:
        conditions.append("c.claimant_id = ?")
        params.append(claimant_id)
    if claimant_type:
        conditions.append("c.claimant_type = ?")
        params.append(claimant_type)

    where = " AND ".join(conditions)
    return fetch_one(f"SELECT case_number FROM cases c WHERE {where} LIMIT 1", tuple(params))


# ============================================================
# Case Documents
# ============================================================

def get_case_documents(case_id: int) -> list[dict]:
    """Get all documents for a case."""
    rows = fetch_all(
        "SELECT * FROM case_documents WHERE case_id = ? ORDER BY required DESC, document_name",
        (case_id,),
    )
    return [dict(r) for r in rows]


def add_case_document(
    case_id: int,
    document_type: str,
    document_name: str,
    required: bool = True,
    file_name: Optional[str] = None,
    file_path: Optional[str] = None,
    file_size: Optional[int] = None,
) -> dict:
    """Add a document to a case checklist."""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    doc_id = execute(
        """INSERT INTO case_documents
           (case_id, document_type, document_name, required, status,
            file_name, file_path, file_size, uploaded_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?)""",
        (case_id, document_type, document_name,
         1 if required else 0, file_name, file_path, file_size, now, now, now),
    )

    _log_case_activity(case_id, 'DOCUMENT_UPLOADED', f"Document uploaded: {document_name}",
                       metadata={'document_id': doc_id, 'document_type': document_type})

    return fetch_one("SELECT * FROM case_documents WHERE id = ?", (doc_id,))


def verify_document(doc_id: int, verified_by: str, remarks: Optional[str] = None) -> dict:
    """Mark a document as verified."""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    execute(
        """UPDATE case_documents
           SET status = 'VERIFIED', verified_at = ?, verified_by = ?, remarks = ?, updated_at = ?
           WHERE id = ?""",
        (now, verified_by, remarks, now, doc_id),
    )
    doc = dict(fetch_one("SELECT * FROM case_documents WHERE id = ?", (doc_id,)))
    _log_case_activity(doc['case_id'], 'DOCUMENT_VERIFIED',
                       f"Document verified: {doc['document_name']}",
                       metadata={'document_id': doc_id, 'verified_by': verified_by})
    return doc


def reject_document(doc_id: int, rejected_by: str, reason: str) -> dict:
    """Reject a document with required reason."""
    if not reason or not reason.strip():
        return {"error": "Rejection reason is required"}

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    execute(
        """UPDATE case_documents
           SET status = 'REJECTED', rejection_reason = ?, verified_by = ?, verified_at = ?, updated_at = ?
           WHERE id = ?""",
        (reason.strip(), rejected_by, now, now, doc_id),
    )
    doc = dict(fetch_one("SELECT * FROM case_documents WHERE id = ?", (doc_id,)))
    _log_case_activity(doc['case_id'], 'DOCUMENT_REJECTED',
                       f"Document rejected: {doc['document_name']}\nReason: {reason}",
                       metadata={'document_id': doc_id, 'rejected_by': rejected_by, 'reason': reason})
    return doc


def update_document_status(doc_id: int, status: str) -> dict:
    """Update document status."""
    if status not in DOC_STATUSES:
        return {"error": f"Invalid document status: {status}"}
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    execute(
        "UPDATE case_documents SET status = ?, updated_at = ? WHERE id = ?",
        (status, now, doc_id),
    )
    return dict(fetch_one("SELECT * FROM case_documents WHERE id = ?", (doc_id,)))


def _compute_doc_summary(documents: list[dict]) -> dict:
    """Compute document completeness summary."""
    total = len(documents)
    required = sum(1 for d in documents if d.get('required'))
    verified = sum(1 for d in documents if d.get('status') == 'VERIFIED')
    required_verified = sum(
        1 for d in documents if d.get('required') and d.get('status') == 'VERIFIED'
    )
    return {
        'total': total,
        'required': required,
        'verified': verified,
        'required_verified': required_verified,
        'completeness': round((required_verified / required * 100)) if required > 0 else 100,
        'all_required_verified': required > 0 and required_verified >= required,
    }


# ============================================================
# Case Tasks
# ============================================================

def get_case_tasks(case_id: int) -> list[dict]:
    """Get all tasks for a case."""
    rows = fetch_all(
        """SELECT *,
           CASE WHEN due_date < date('now') AND status IN ('PENDING', 'IN_PROGRESS')
                THEN 1 ELSE 0 END as is_overdue
           FROM case_tasks WHERE case_id = ?
           ORDER BY
               CASE priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
               due_date ASC""",
        (case_id,),
    )
    return [dict(r) for r in rows]


def create_case_task(
    case_id: int,
    task_type: str,
    title: str,
    description: Optional[str] = None,
    priority: str = 'MEDIUM',
    assigned_to: Optional[str] = None,
    due_date: Optional[str] = None,
) -> dict:
    """Create a follow-up or verification task."""
    if task_type not in TASK_TYPES:
        return {"error": f"Invalid task type: {task_type}"}

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    task_id = execute(
        """INSERT INTO case_tasks
           (case_id, task_type, title, description, status, priority,
            assigned_to, due_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)""",
        (case_id, task_type, title, description, priority, assigned_to, due_date, now, now),
    )

    _log_case_activity(case_id, 'TASK_CREATED', f"Task created: {title}",
                       metadata={'task_id': task_id, 'task_type': task_type, 'due_date': due_date})

    task = dict(fetch_one("SELECT * FROM case_tasks WHERE id = ?", (task_id,)))
    task['is_overdue'] = _is_task_overdue(task)
    return task


def update_case_task(task_id: int, updates: dict) -> dict:
    """Update a task."""
    allowed = {'title', 'description', 'priority', 'assigned_to', 'due_date', 'status'}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if not filtered:
        return dict(fetch_one("SELECT * FROM case_tasks WHERE id = ?", (task_id,)))

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    task = dict(fetch_one("SELECT * FROM case_tasks WHERE id = ?", (task_id,)))
    if not task:
        return {"error": "Task not found"}

    set_clauses = []
    params = []
    for key, val in filtered.items():
        set_clauses.append(f"{key} = ?")
        params.append(val)

    if 'status' in filtered:
        if filtered['status'] == 'COMPLETED':
            set_clauses.append("completed_at = ?")
            params.append(now)
        elif filtered['status'] == 'CANCELLED':
            set_clauses.append("cancelled_at = ?")
            params.append(now)

    set_clauses.append("updated_at = ?")
    params.append(now)
    params.append(task_id)

    execute(
        f"UPDATE case_tasks SET {', '.join(set_clauses)} WHERE id = ?",
        tuple(params),
    )

    if 'status' in filtered:
        act_type = 'TASK_COMPLETED' if filtered['status'] == 'COMPLETED' else \
                   'TASK_CANCELLED' if filtered['status'] == 'CANCELLED' else 'OTHER'
        _log_case_activity(task['case_id'], act_type,
                           f"Task {filtered['status'].lower()}: {task['title']}",
                           metadata={'task_id': task_id})

    updated = dict(fetch_one("SELECT * FROM case_tasks WHERE id = ?", (task_id,)))
    updated['is_overdue'] = _is_task_overdue(updated)
    return updated


def get_work_queue_tasks() -> dict:
    """Get tasks across all cases for the work queue."""
    # Overdue tasks
    overdue = fetch_all(
        """SELECT t.*, c.case_number, c.title as case_title, w.full_name as worker_name
           FROM case_tasks t
           JOIN cases c ON t.case_id = c.id
           LEFT JOIN workers w ON c.worker_id = w.id
           WHERE t.due_date < date('now')
             AND t.status IN ('PENDING', 'IN_PROGRESS')
           ORDER BY t.priority ASC, t.due_date ASC
           LIMIT 20""",
    )

    # Due today
    due_today = fetch_all(
        """SELECT t.*, c.case_number, c.title as case_title, w.full_name as worker_name
           FROM case_tasks t
           JOIN cases c ON t.case_id = c.id
           LEFT JOIN workers w ON c.worker_id = w.id
           WHERE t.due_date = date('now')
             AND t.status IN ('PENDING', 'IN_PROGRESS')
           ORDER BY t.priority ASC
           LIMIT 20""",
    )

    # Pending tasks
    pending = fetch_all(
        """SELECT t.*, c.case_number, c.title as case_title, w.full_name as worker_name
           FROM case_tasks t
           JOIN cases c ON t.case_id = c.id
           LEFT JOIN workers w ON c.worker_id = w.id
           WHERE t.status = 'PENDING'
           ORDER BY
               CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
               t.due_date ASC
           LIMIT 20""",
    )

    return {
        "overdue": [dict(r) for r in overdue],
        "due_today": [dict(r) for r in due_today],
        "pending": [dict(r) for r in pending],
    }


def _is_task_overdue(task: dict) -> bool:
    """Check if a task is overdue."""
    if task.get('status') in ('COMPLETED', 'CANCELLED'):
        return False
    if not task.get('due_date'):
        return False
    try:
        due = task['due_date'][:10]
        return due < date.today().isoformat()
    except (ValueError, TypeError):
        return False


# ============================================================
# Case Notes
# ============================================================

def get_case_notes(case_id: int) -> list[dict]:
    """Get all notes for a case."""
    rows = fetch_all(
        "SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at DESC",
        (case_id,),
    )
    return [dict(r) for r in rows]


def add_case_note(case_id: int, author: str, content: str, is_internal: bool = True) -> dict:
    """Add an internal note to a case."""
    if not content or not content.strip():
        return {"error": "Note content is required"}

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    note_id = execute(
        """INSERT INTO case_notes (case_id, author, content, is_internal, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (case_id, author, content.strip(), 1 if is_internal else 0, now),
    )

    _log_case_activity(case_id, 'NOTE_ADDED', f"Note added by {author}",
                       metadata={'note_id': note_id})

    return dict(fetch_one("SELECT * FROM case_notes WHERE id = ?", (note_id,)))


# ============================================================
# Case Activity Timeline
# ============================================================

def get_case_activities(case_id: int, limit: int = 50) -> list[dict]:
    """Get activity timeline for a case."""
    rows = fetch_all(
        """SELECT * FROM case_activity_log
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (case_id, limit),
    )
    return [_format_activity(dict(r)) for r in rows]


def _log_case_activity(
    case_id: int,
    activity_type: str,
    title: str,
    description: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> int:
    """Log a case activity event."""
    meta_json = json.dumps(metadata) if metadata else None
    return execute(
        """INSERT INTO case_activity_log
           (case_id, activity_type, title, description, old_value, new_value, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (case_id, activity_type, title, description, old_value, new_value, meta_json),
    )


def _format_activity(activity: dict) -> dict:
    """Format activity with display helpers."""
    type_icons = {
        'CASE_CREATED': '📋',
        'STATUS_CHANGED': '🔄',
        'DOCUMENT_UPLOADED': '📄',
        'DOCUMENT_VERIFIED': '✅',
        'DOCUMENT_REJECTED': '❌',
        'NOTE_ADDED': '📝',
        'TASK_CREATED': '📌',
        'TASK_COMPLETED': '✅',
        'TASK_CANCELLED': '🚫',
        'ASSIGNED': '👤',
        'REASSIGNED': '👥',
        'CASE_COMPLETED': '🎉',
        'CASE_CLOSED': '🔒',
        'CASE_REOPENED': '🔓',
        'ELIGIBILITY_ATTACHED': '🔍',
        'OTHER': '📌',
    }
    activity['icon'] = type_icons.get(activity.get('activity_type', ''), '📌')

    try:
        dt = datetime.strptime(activity['created_at'], '%Y-%m-%d %H:%M:%S')
        activity['formatted_date'] = dt.strftime('%d %b %Y')
        activity['formatted_time'] = dt.strftime('%I:%M %p')
    except (ValueError, KeyError):
        activity['formatted_date'] = activity.get('created_at', '')[:10]
        activity['formatted_time'] = ''

    return activity


# ============================================================
# Case Readiness
# ============================================================

def _compute_case_readiness(case: dict) -> dict:
    """Compute whether a case is ready for submission."""
    missing = []

    # Check required documents
    docs = case.get('documents', [])
    for doc in docs:
        if doc.get('required') and doc.get('status') not in ('VERIFIED', 'NOT_REQUIRED'):
            missing.append(f"{doc.get('document_name', 'Document')} (not verified)")

    # Check if basic info is present
    if not case.get('scheme_id'):
        missing.append("Welfare scheme not assigned")

    if not case.get('worker_id'):
        missing.append("Applicant not linked")

    return {
        "ready": len(missing) == 0,
        "missing": missing,
        "missing_count": len(missing),
    }


# ============================================================
# Statistics
# ============================================================

def get_case_statistics() -> dict:
    """Get case management statistics."""
    total = fetch_one("SELECT COUNT(*) as c FROM cases")
    by_status = fetch_all(
        "SELECT status, COUNT(*) as count FROM cases GROUP BY status"
    )
    by_priority = fetch_all(
        "SELECT priority, COUNT(*) as count FROM cases WHERE status NOT IN ('COMPLETED', 'REJECTED', 'CLOSED') GROUP BY priority"
    )

    # Tasks
    overdue_tasks = fetch_one(
        """SELECT COUNT(*) as c FROM case_tasks
           WHERE due_date < date('now') AND status IN ('PENDING', 'IN_PROGRESS')"""
    )
    pending_tasks = fetch_one(
        """SELECT COUNT(*) as c FROM case_tasks
           WHERE status IN ('PENDING', 'IN_PROGRESS')"""
    )

    # Documents pending
    docs_pending = fetch_one(
        """SELECT COUNT(DISTINCT c.id) as c FROM cases c
           JOIN case_documents cd ON c.id = cd.case_id
           WHERE cd.required = 1 AND cd.status NOT IN ('VERIFIED', 'NOT_REQUIRED')
           AND c.status NOT IN ('COMPLETED', 'REJECTED', 'CLOSED')"""
    )

    # Cases inactive beyond threshold
    inactive_days = 14  # Default; could come from settings
    try:
        from app.services.settings_service import get_setting_int
        inactive_days = get_setting_int('case_inactivity_days', 14)
    except Exception:
        pass

    inactive_cases = fetch_one(
        f"""SELECT COUNT(*) as c FROM cases
            WHERE status NOT IN ('COMPLETED', 'REJECTED', 'CLOSED')
            AND updated_at < datetime('now', ?)""",
        (f'-{inactive_days} days',),
    )

    stats = {
        "total_cases": total["c"] if total else 0,
        "status_breakdown": {r["status"]: r["count"] for r in by_status},
        "priority_breakdown": {r["priority"]: r["count"] for r in by_priority},
        "new_cases": next((r["count"] for r in by_status if r["status"] == 'NEW'), 0),
        "under_review": next((r["count"] for r in by_status if r["status"] == 'UNDER_REVIEW'), 0),
        "documents_pending": docs_pending["c"] if docs_pending else 0,
        "follow_up_required": next((r["count"] for r in by_status if r["status"] == 'FOLLOW_UP_REQUIRED'), 0),
        "completed": next((r["count"] for r in by_status if r["status"] == 'COMPLETED'), 0),
        "rejected": next((r["count"] for r in by_status if r["status"] == 'REJECTED'), 0),
        "closed": next((r["count"] for r in by_status if r["status"] == 'CLOSED'), 0),
        "ready_for_submission": next((r["count"] for r in by_status if r["status"] == 'READY_FOR_SUBMISSION'), 0),
        "eligibility_review": next((r["count"] for r in by_status if r["status"] == 'ELIGIBILITY_REVIEW'), 0),
        "urgent_cases": next((r["count"] for r in by_priority if r["priority"] == 'URGENT'), 0),
        "high_priority": next((r["count"] for r in by_priority if r["priority"] == 'HIGH'), 0),
        "overdue_tasks": overdue_tasks["c"] if overdue_tasks else 0,
        "pending_tasks": pending_tasks["c"] if pending_tasks else 0,
        "inactive_cases": inactive_cases["c"] if inactive_cases else 0,
    }
    return stats


# ============================================================
# Worker Cases
# ============================================================

def get_worker_cases(worker_id: int) -> list[dict]:
    """Get all cases for a specific worker (for applicant profile integration)."""
    rows = fetch_all(
        """SELECT c.*,
                  ws.name as scheme_name
           FROM cases c
           LEFT JOIN welfare_schemes ws ON c.scheme_id = ws.id
           WHERE c.worker_id = ?
           ORDER BY c.updated_at DESC""",
        (worker_id,),
    )
    return [dict(r) for r in rows]


def check_worker_has_active_case(worker_id: int, scheme_id: int, claimant_id: Optional[int] = None) -> Optional[dict]:
    """Check if worker already has an active case for a scheme."""
    conditions = ["worker_id = ?", "scheme_id = ?",
                  "status NOT IN ('COMPLETED', 'REJECTED', 'CLOSED')"]
    params: list = [worker_id, scheme_id]
    if claimant_id:
        conditions.append("claimant_id = ?")
        params.append(claimant_id)

    return fetch_one(
        f"SELECT case_number, status, title FROM cases WHERE {' AND '.join(conditions)} LIMIT 1",
        tuple(params),
    )


# ============================================================
# Case Export Data
# ============================================================

def get_case_for_export(case_id: int) -> Optional[dict]:
    """Get case data formatted for PDF/CSV export."""
    case = get_case_by_id(case_id)
    if not case:
        return None

    # Flatten for export
    export = {
        'case_number': case.get('case_number'),
        'title': case.get('title'),
        'description': case.get('description'),
        'status': case.get('status'),
        'priority': case.get('priority'),
        'applicant_name': case.get('worker_name'),
        'district': case.get('worker_district'),
        'mobile': case.get('worker_mobile'),
        'board_name': case.get('board_name'),
        'scheme_name': case.get('scheme_name'),
        'variant_name': case.get('variant_name'),
        'claimant_name': case.get('claimant_name'),
        'claimant_relationship': case.get('claimant_relationship'),
        'claimant_type': case.get('claimant_type'),
        'assigned_to': case.get('assigned_to'),
        'created_by': case.get('created_by'),
        'opened_at': case.get('opened_at'),
        'updated_at': case.get('updated_at'),
        'closed_at': case.get('closed_at'),
        'closure_reason': case.get('closure_reason'),
        'documents': case.get('documents', []),
        'tasks': case.get('tasks', []),
        'notes': case.get('notes', []),
        'activities': case.get('activities', []),
        'readiness': case.get('readiness', {}),
        'document_summary': case.get('document_summary', {}),
    }
    return export
