"""
Case Management API Routes — Phase 7
Comprehensive endpoints for case management, documents, tasks, and notes.
"""

import os
import uuid
from flask import Blueprint, request, jsonify, send_file
from app.routes.auth import login_required, admin_required
from app.services.case_service import (
    create_case, get_case_by_id, list_cases, update_case,
    change_case_status, reopen_case, complete_case,
    add_case_document, verify_document, reject_document, update_document_status,
    create_case_task, update_case_task, get_work_queue_tasks,
    add_case_note, get_case_statistics, get_worker_cases,
    check_worker_has_active_case, get_case_for_export,
    CASE_STATUSES, VALID_TRANSITIONS, TASK_TYPES, CLOSURE_REASONS, DOC_STATUSES,
)

cases_bp = Blueprint("cases", __name__)

UPLOAD_DIR = os.environ.get(
    'DOCUMENT_STORAGE_PATH',
    os.path.join(os.path.dirname(__file__), '..', '..', '..', 'uploads', 'case_documents'),
)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}


# ============================================================
# Case Management
# ============================================================

@cases_bp.route("/api/cases", methods=["GET"])
@login_required
def get_cases():
    """List cases with filtering, search, and pagination."""
    try:
        user_id = getattr(request, 'user', {}).get('user_id')
        is_admin = getattr(request, 'user', {}).get('role') == 'ADMIN'
        filter_user_id = None if is_admin else user_id

        result = list_cases(
            status=request.args.get('status'),
            priority=request.args.get('priority'),
            board_id=int(request.args['board_id']) if 'board_id' in request.args else None,
            scheme_id=int(request.args['scheme_id']) if 'scheme_id' in request.args else None,
            assigned_to=request.args.get('assigned_to'),
            worker_id=int(request.args['worker_id']) if 'worker_id' in request.args else None,
            search=request.args.get('search'),
            date_from=request.args.get('date_from'),
            date_to=request.args.get('date_to'),
            page=int(request.args.get('page', 1)),
            per_page=int(request.args.get('per_page', 20)),
            user_id=filter_user_id,
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases", methods=["POST"])
def create_new_case():
    """Create a new case."""
    try:
        data = request.get_json() or {}
        if not data.get('worker_id'):
            return jsonify({"success": False, "error": "Worker ID is required."}), 400
        if not data.get('title'):
            return jsonify({"success": False, "error": "Case title is required."}), 400

        result = create_case(
            worker_id=data['worker_id'],
            title=data['title'],
            scheme_id=data.get('scheme_id'),
            scheme_variant_id=data.get('scheme_variant_id'),
            claimant_id=data.get('claimant_id'),
            claimant_type=data.get('claimant_type', 'WORKER'),
            description=data.get('description'),
            priority=data.get('priority', 'MEDIUM'),
            assigned_to=data.get('assigned_to'),
            created_by=data.get('created_by', 'Staff'),
            document_checklist=data.get('document_checklist'),
        )

        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400

        return jsonify({"success": True, "data": result}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>", methods=["GET"])
def get_case(case_id):
    """Get case details with all related data."""
    try:
        case = get_case_by_id(case_id)
        if not case:
            return jsonify({"success": False, "error": "Case not found."}), 404
        return jsonify({"success": True, "data": case})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>", methods=["PUT"])
def update_existing_case(case_id):
    """Update case fields."""
    try:
        data = request.get_json() or {}
        result = update_case(case_id, data)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Status Management
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/status", methods=["POST"])
def change_status(case_id):
    """Change case status with validation."""
    try:
        data = request.get_json() or {}
        new_status = data.get('status')
        if not new_status:
            return jsonify({"success": False, "error": "Status is required."}), 400

        # Closure reason required when closing
        if new_status == 'CLOSED' and not data.get('closure_reason'):
            return jsonify({"success": False, "error": "Closure reason is required when closing a case."}), 400

        result = change_case_status(
            case_id,
            new_status,
            reason=data.get('reason'),
            closure_reason=data.get('closure_reason'),
        )
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>/reopen", methods=["POST"])
def reopen(case_id):
    """Reopen a closed/rejected case."""
    try:
        data = request.get_json() or {}
        reason = data.get('reason')
        if not reason:
            return jsonify({"success": False, "error": "Reopen reason is required."}), 400

        result = reopen_case(case_id, reason)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>/complete", methods=["POST"])
def complete(case_id):
    """Mark case as completed."""
    try:
        result = complete_case(case_id)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Documents
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/documents", methods=["GET"])
def get_documents(case_id):
    """Get all documents for a case."""
    try:
        from app.services.case_service import get_case_documents
        docs = get_case_documents(case_id)
        return jsonify({"success": True, "data": docs})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>/documents", methods=["POST"])
def add_document(case_id):
    """Add a document to the case checklist."""
    try:
        data = request.get_json() or {}
        if not data.get('document_type') or not data.get('document_name'):
            return jsonify({"success": False, "error": "Document type and name are required."}), 400

        result = add_case_document(
            case_id=case_id,
            document_type=data['document_type'],
            document_name=data['document_name'],
            required=data.get('required', True),
            file_name=data.get('file_name'),
            file_path=data.get('file_path'),
            file_size=data.get('file_size'),
        )
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/documents/<int:doc_id>/verify", methods=["POST"])
def verify_doc(doc_id):
    """Verify a document."""
    try:
        data = request.get_json() or {}
        verified_by = data.get('verified_by', 'Staff')
        result = verify_document(doc_id, verified_by, data.get('remarks'))
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/documents/<int:doc_id>/reject", methods=["POST"])
def reject_doc(doc_id):
    """Reject a document (requires reason)."""
    try:
        data = request.get_json() or {}
        reason = data.get('reason')
        if not reason or not reason.strip():
            return jsonify({"success": False, "error": "Rejection reason is required."}), 400

        result = reject_document(doc_id, data.get('rejected_by', 'Staff'), reason)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/documents/<int:doc_id>/status", methods=["PUT"])
def update_doc_status(doc_id):
    """Update document status."""
    try:
        data = request.get_json() or {}
        status = data.get('status')
        if not status:
            return jsonify({"success": False, "error": "Status is required."}), 400
        result = update_document_status(doc_id, status)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Document Upload (File)
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/documents/upload", methods=["POST"])
def upload_document(case_id):
    """Upload a document file for a case."""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided."}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({"success": False, "error": "No file selected."}), 400

        # Validate extension
        ext = os.path.splitext(file.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({
                "success": False,
                "error": f"File type '{ext}' not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        # Read and check size
        file_data = file.read()
        if len(file_data) > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "error": f"File size exceeds maximum ({MAX_FILE_SIZE // (1024*1024)}MB)."
            }), 400

        # Save file
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, 'wb') as f:
            f.write(file_data)

        # Create document record
        doc_type = request.form.get('document_type', 'OTHER')
        doc_name = request.form.get('document_name', file.filename)
        required = request.form.get('required', 'true').lower() == 'true'

        result = add_case_document(
            case_id=case_id,
            document_type=doc_type,
            document_name=doc_name,
            required=required,
            file_name=file.filename,
            file_path=unique_name,
            file_size=len(file_data),
        )

        return jsonify({"success": True, "data": result}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Tasks
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/tasks", methods=["GET"])
def get_tasks(case_id):
    """Get all tasks for a case."""
    try:
        from app.services.case_service import get_case_tasks
        tasks = get_case_tasks(case_id)
        return jsonify({"success": True, "data": tasks})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>/tasks", methods=["POST"])
def add_task(case_id):
    """Create a new task for a case."""
    try:
        data = request.get_json() or {}
        if not data.get('task_type') or not data.get('title'):
            return jsonify({"success": False, "error": "Task type and title are required."}), 400

        result = create_case_task(
            case_id=case_id,
            task_type=data['task_type'],
            title=data['title'],
            description=data.get('description'),
            priority=data.get('priority', 'MEDIUM'),
            assigned_to=data.get('assigned_to'),
            due_date=data.get('due_date'),
        )
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    """Update a task."""
    try:
        data = request.get_json() or {}
        result = update_case_task(task_id, data)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/tasks/<int:task_id>/complete", methods=["POST"])
def complete_task(task_id):
    """Mark a task as completed."""
    try:
        result = update_case_task(task_id, {"status": "COMPLETED"})
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/tasks/<int:task_id>/cancel", methods=["POST"])
def cancel_task(task_id):
    """Cancel a task."""
    try:
        result = update_case_task(task_id, {"status": "CANCELLED"})
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/work-queue", methods=["GET"])
def work_queue():
    """Get work queue with overdue, due today, and pending tasks."""
    try:
        result = get_work_queue_tasks()
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Notes
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/notes", methods=["GET"])
def get_notes(case_id):
    """Get all notes for a case."""
    try:
        from app.services.case_service import get_case_notes
        notes = get_case_notes(case_id)
        return jsonify({"success": True, "data": notes})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/<int:case_id>/notes", methods=["POST"])
def add_note(case_id):
    """Add an internal note to a case."""
    try:
        data = request.get_json() or {}
        content = data.get('content')
        if not content or not content.strip():
            return jsonify({"success": False, "error": "Note content is required."}), 400

        result = add_case_note(
            case_id=case_id,
            author=data.get('author', 'Staff'),
            content=content,
            is_internal=data.get('is_internal', True),
        )
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"success": False, "error": result['error']}), 400
        return jsonify({"success": True, "data": result}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Statistics & Metadata
# ============================================================

@cases_bp.route("/api/cases/statistics", methods=["GET"])
def statistics():
    """Get case management statistics."""
    try:
        stats = get_case_statistics()
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/metadata", methods=["GET"])
def metadata():
    """Get case management metadata (statuses, priorities, etc.)."""
    return jsonify({
        "success": True,
        "data": {
            "statuses": CASE_STATUSES,
            "valid_transitions": VALID_TRANSITIONS,
            "task_types": TASK_TYPES,
            "closure_reasons": CLOSURE_REASONS,
            "document_statuses": DOC_STATUSES,
            "priority_levels": ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        }
    })


# ============================================================
# Worker Integration
# ============================================================

@cases_bp.route("/api/workers/<int:worker_id>/cases", methods=["GET"])
def worker_cases(worker_id):
    """Get all cases for a worker (applicant integration)."""
    try:
        cases = get_worker_cases(worker_id)
        return jsonify({"success": True, "data": cases})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/check-duplicate", methods=["POST"])
def check_duplicate():
    """Check if an active case already exists."""
    try:
        data = request.get_json() or {}
        if not data.get('worker_id'):
            return jsonify({"success": False, "error": "Worker ID is required."}), 400

        existing = check_worker_has_active_case(
            worker_id=data['worker_id'],
            scheme_id=data.get('scheme_id'),
            claimant_id=data.get('claimant_id'),
        )
        if existing:
            return jsonify({
                "success": True,
                "data": {
                    "duplicate": True,
                    "case_number": existing['case_number'],
                    "status": existing['status'],
                    "title": existing['title'],
                }
            })
        return jsonify({"success": True, "data": {"duplicate": False}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Export
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/export", methods=["GET"])
def export_case(case_id):
    """Export case data for PDF/CSV."""
    try:
        case_data = get_case_for_export(case_id)
        if not case_data:
            return jsonify({"success": False, "error": "Case not found."}), 404
        return jsonify({"success": True, "data": case_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@cases_bp.route("/api/cases/export/csv", methods=["GET"])
def export_cases_csv():
    """Export cases as CSV."""
    try:
        import csv
        import io
        result = list_cases(
            status=request.args.get('status'),
            priority=request.args.get('priority'),
            page=1,
            per_page=10000,
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Case Number', 'Applicant', 'Board', 'Scheme', 'Claimant',
            'Status', 'Priority', 'Assigned To', 'Created', 'Updated'
        ])
        for c in result['cases']:
            writer.writerow([
                c.get('case_number', ''),
                c.get('worker_name', ''),
                c.get('board_name', ''),
                c.get('scheme_name', ''),
                c.get('claimant_name', ''),
                c.get('status', ''),
                c.get('priority', ''),
                c.get('assigned_to', ''),
                c.get('opened_at', ''),
                c.get('updated_at', ''),
            ])

        from flask import Response
        csv_content = output.getvalue()
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=cases_export.csv'}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Authenticated Document Access
# ============================================================

@cases_bp.route("/api/cases/<int:case_id>/documents/<int:doc_id>/file", methods=["GET"])
def serve_document(case_id, doc_id):
    """
    Serve a document file with authentication.
    Verifies the document belongs to the specified case.
    """
    try:
        from app.database import fetch_one

        # Fetch document record
        doc = fetch_one(
            "SELECT * FROM case_documents WHERE id = ? AND case_id = ?",
            (doc_id, case_id),
        )
        if not doc:
            return jsonify({"success": False, "error": "Document not found."}), 404

        if not doc.get('file_path'):
            return jsonify({"success": False, "error": "No file uploaded for this document."}), 404

        # Build the full path
        full_path = os.path.join(UPLOAD_DIR, doc['file_path'])

        # Security: ensure the resolved path is within UPLOAD_DIR
        real_upload = os.path.realpath(UPLOAD_DIR)
        real_path = os.path.realpath(full_path)
        if not real_path.startswith(real_upload):
            return jsonify({"success": False, "error": "Invalid file path."}), 403

        if not os.path.exists(real_path):
            return jsonify({"success": False, "error": "File not found on server."}), 404

        # Determine MIME type
        ext = os.path.splitext(doc.get('file_name', ''))[1].lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        mime = mime_types.get(ext, 'application/octet-stream')

        return send_file(
            real_path,
            mimetype=mime,
            as_attachment=True,
            download_name=doc.get('file_name', f'document{ext}'),
        )
    except Exception as e:
        return jsonify({"success": False, "error": "Failed to serve document."}), 500
