"""
Input validation utilities for backend API data (Phase 2).
Validates all incoming data regardless of frontend validation.
"""

import re
from datetime import datetime, date
from typing import Any, Optional


def validate_required_fields(data: dict, required_fields: list[str]) -> list[str]:
    """Validate that all required fields are present and non-empty."""
    errors = []
    for field in required_fields:
        if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field].strip()):
            errors.append(f"'{field}' is required.")
    return errors


def validate_date(value: str, field_name: str) -> list[str]:
    """Validate a date string in ISO format (YYYY-MM-DD)."""
    errors = []
    if not value:
        return errors
    try:
        dt = datetime.strptime(value, "%Y-%m-%d")
        # Warn if date is in the future (but don't block for DOB)
        # We don't block future dates here as some fields legitimately need future dates
    except ValueError:
        errors.append(f"'{field_name}' must be a valid date in YYYY-MM-DD format.")
    return errors


def validate_date_not_future(value: str, field_name: str) -> list[str]:
    """Validate that a date is not in the future."""
    errors = []
    if not value:
        return errors
    try:
        dt = datetime.strptime(value, "%Y-%m-%d").date()
        if dt > date.today():
            errors.append(f"'{field_name}' cannot be a future date.")
    except ValueError:
        errors.append(f"'{field_name}' must be a valid date in YYYY-MM-DD format.")
    return errors


def validate_date_sequence(start_field: str, start_value: str, end_field: str, end_value: str) -> list[str]:
    """Validate that end date is after start date."""
    errors = []
    if start_value and end_value:
        try:
            start = datetime.strptime(start_value, "%Y-%m-%d").date()
            end = datetime.strptime(end_value, "%Y-%m-%d").date()
            if end < start:
                errors.append(f"'{end_field}' must be on or after '{start_field}'.")
        except ValueError:
            pass  # Individual date validation will catch format issues
    return errors


def validate_mobile_number(value: str, field_name: str = "mobile_number") -> list[str]:
    """Validate Indian mobile number format."""
    errors = []
    if not value:
        return errors
    cleaned = re.sub(r"[\s\-]", "", value)
    if not re.match(r"^(\+?91)?\d{10}$", cleaned):
        errors.append(f"'{field_name}' must be a valid 10-digit Indian mobile number.")
    return errors


def validate_pincode(value: str, field_name: str = "pincode") -> list[str]:
    """Validate Indian pincode format (6 digits)."""
    errors = []
    if not value:
        return errors
    cleaned = re.sub(r"[\s\-]", "", value)
    if not re.match(r"^\d{6}$", cleaned):
        errors.append(f"'{field_name}' must be a valid 6-digit pincode.")
    return errors


def validate_gender(value: str) -> list[str]:
    """Validate gender field."""
    valid_genders = {"Male", "Female", "Other", "Transgender"}
    if value and value not in valid_genders:
        return [f"'gender' must be one of: {', '.join(sorted(valid_genders))}."]
    return []


def validate_status(value: str, valid_statuses: set[str], field_name: str = "status") -> list[str]:
    """Validate a status field against allowed values."""
    if value and value not in valid_statuses:
        return [f"'{field_name}' must be one of: {', '.join(sorted(valid_statuses))}."]
    return []


def validate_integer(value: Any, field_name: str, min_val: Optional[int] = None, max_val: Optional[int] = None) -> list[str]:
    """Validate that a value is an integer within optional bounds."""
    errors = []
    try:
        int_val = int(value)
        if min_val is not None and int_val < min_val:
            errors.append(f"'{field_name}' must be at least {min_val}.")
        if max_val is not None and int_val > max_val:
            errors.append(f"'{field_name}' must be at most {max_val}.")
    except (TypeError, ValueError):
        errors.append(f"'{field_name}' must be a valid integer.")
    return errors


def validate_registration_number(value: str, field_name: str = "registration_number") -> list[str]:
    """Validate registration number format (e.g., TN-XXX-YYYY-NNNNN)."""
    errors = []
    if not value:
        return errors
    # Allow flexible format but must be at least 5 characters
    if len(value.strip()) < 5:
        errors.append(f"'{field_name}' must be at least 5 characters long.")
    if not re.match(r'^[A-Z0-9\-]+$', value.strip().upper()):
        errors.append(f"'{field_name}' should contain only letters, numbers, and hyphens.")
    return errors
