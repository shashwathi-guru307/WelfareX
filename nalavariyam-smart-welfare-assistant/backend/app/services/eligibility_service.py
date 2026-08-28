"""
Phase 4 — Configurable Eligibility Analysis Engine
===================================================

A data-driven, rule-based engine that evaluates welfare scheme eligibility
for workers AND their family members independently.

Result states: ELIGIBLE, NOT_ELIGIBLE, POTENTIAL_MATCH, INSUFFICIENT_DATA
Claimant types: WORKER, SPOUSE, SON, DAUGHTER, CHILD, DEPENDENT, etc.

All rules come from the database. No hardcoded scheme logic inside components.
"""

from datetime import datetime, date
from typing import Optional
import json
import logging

from app.database import fetch_one, fetch_all

logger = logging.getLogger(__name__)

ENGINE_VERSION = "4.0.0"

ELIGIBILITY_DISCLAIMER = (
    "This eligibility assessment is an administrative decision-support tool only. "
    "The final decision is subject to official document verification and the applicable "
    "government rules and regulations of the Tamil Nadu Unorganised Workers Welfare Board."
)

# Status constants
STATUS_ELIGIBLE = "ELIGIBLE"
STATUS_NOT_ELIGIBLE = "NOT_ELIGIBLE"
STATUS_POTENTIAL = "POTENTIAL_MATCH"
STATUS_INSUFFICIENT = "INSUFFICIENT_DATA"

# Education level mapping for matching family member education to qualification variants
EDUCATION_LEVEL_MAP = {
    "No Formal Education": [],
    "Primary": ["6th-9th"],
    "Secondary": ["10th", "6th-9th"],
    "Higher Secondary": ["12th", "11th", "10th"],
    "Diploma": ["ITI/Polytechnic"],
    "Undergraduate": ["UG"],
    "Postgraduate": ["PG"],
    "PhD": ["PG"],
    "Other": [],
}

# Relationship to claimant type mapping
RELATIONSHIP_CLAIMANT_MAP = {
    "Spouse": "SPOUSE",
    "Son": "SON",
    "Daughter": "DAUGHTER",
    "Father": "DEPENDENT",
    "Mother": "DEPENDENT",
    "Brother": "DEPENDENT",
    "Sister": "DEPENDENT",
    "Other Dependent": "DEPENDENT",
}


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def calculate_age(date_of_birth: str) -> Optional[int]:
    """Calculate exact age from ISO date string using proper birthday logic."""
    if not date_of_birth:
        return None
    try:
        dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob.year
        if (today.month, today.day) < (dob.month, dob.day):
            age -= 1
        return age
    except (ValueError, TypeError):
        return None


def calculate_registration_duration(registration_date: str) -> Optional[float]:
    """Calculate registration duration in years dynamically."""
    if not registration_date:
        return None
    try:
        reg_date = datetime.strptime(registration_date, "%Y-%m-%d").date()
        today = date.today()
        delta = today - reg_date
        return round(delta.days / 365.25, 1)
    except (ValueError, TypeError):
        return None


def is_registration_active(validity_date: str) -> bool:
    """Check if registration is currently active (not expired)."""
    if not validity_date:
        return False
    try:
        valid_until = datetime.strptime(validity_date, "%Y-%m-%d").date()
        return date.today() <= valid_until
    except (ValueError, TypeError):
        return False


def get_registration_status(worker_id: int) -> dict:
    """Get the worker's latest registration status."""
    registration = fetch_one(
        "SELECT * FROM registrations WHERE worker_id = ? ORDER BY created_at DESC LIMIT 1",
        (worker_id,),
    )
    if not registration:
        return {
            "status": "NOT_REGISTERED",
            "registration": None,
            "is_active": False,
        }

    is_active = is_registration_active(registration.get("validity_date", ""))
    status_str = registration.get("status", "Unknown")

    return {
        "status": status_str,
        "registration": registration,
        "is_active": is_active,
    }


def map_relationship_to_claimant(relationship: str) -> str:
    """Map a family member relationship to a claimant type."""
    return RELATIONSHIP_CLAIMANT_MAP.get(relationship, "FAMILY_MEMBER")


def get_family_members(worker_id: int) -> list:
    """Get all family members for a worker."""
    return fetch_all(
        "SELECT * FROM family_members WHERE worker_id = ? ORDER BY date_of_birth",
        (worker_id,),
    )


def get_education_records(worker_id: int) -> list:
    """Get all education records for a worker and their family."""
    return fetch_all(
        """
        SELECT er.*, fm.name as family_member_name, fm.relationship, fm.gender as family_gender
        FROM education_records er
        LEFT JOIN family_members fm ON er.family_member_id = fm.id
        WHERE er.worker_id = ?
        """,
        (worker_id,),
    )


def get_board_specific_benefit(scheme_id: int, board_id: int, qualification_id: Optional[int] = None) -> Optional[dict]:
    """Get the board-specific benefit for a scheme."""
    if qualification_id:
        return fetch_one(
            """
            SELECT * FROM scheme_benefits
            WHERE scheme_id = ? AND board_id = ? AND qualification_id = ? AND is_available = 1
            """,
            (scheme_id, board_id, qualification_id),
        )
    else:
        return fetch_one(
            """
            SELECT * FROM scheme_benefits
            WHERE scheme_id = ? AND board_id = ? AND qualification_id IS NULL AND is_available = 1
            """,
            (scheme_id, board_id),
        )


def format_amount(amount_numeric: Optional[float], amount_unit: Optional[str] = None) -> str:
    """Format benefit amount for display."""
    if amount_numeric is None:
        return "Amount to be confirmed"
    formatted = f"\u20b9{amount_numeric:,.0f}"
    if amount_unit:
        formatted += f" ({amount_unit})"
    return formatted


# ============================================================
# RULE EVALUATION ENGINE
# ============================================================

def evaluate_operator(actual_value, operator: str, expected_value: str, value_type: str = "string") -> bool:
    """Evaluate a condition using the specified operator."""
    try:
        if value_type == "number":
            actual = float(actual_value) if actual_value is not None else None
            expected = float(expected_value)
        elif value_type == "boolean":
            actual = bool(int(actual_value)) if actual_value is not None else None
            expected = bool(int(expected_value))
        else:
            actual = str(actual_value).strip().lower() if actual_value else None
            expected = str(expected_value).strip().lower()

        if actual is None:
            return False

        if operator in ("=", "EQUALS"):
            return actual == expected
        elif operator in ("!=", "NOT_EQUALS"):
            return actual != expected
        elif operator in (">", "GREATER_THAN"):
            return actual > expected
        elif operator in (">=", "GREATER_THAN_OR_EQUAL"):
            return actual >= expected
        elif operator in ("<", "LESS_THAN"):
            return actual < expected
        elif operator in ("<=", "LESS_THAN_OR_EQUAL"):
            return actual <= expected
        elif operator in ("in", "IN"):
            allowed = [v.strip().lower() for v in expected_value.split(",")]
            return actual in allowed
        elif operator in ("not_in", "NOT_IN"):
            disallowed = [v.strip().lower() for v in expected_value.split(",")]
            return actual not in disallowed
        elif operator in ("contains", "CONTAINS"):
            return expected in actual
        else:
            return False
    except (ValueError, TypeError):
        return False


def evaluate_scheme_rule(
    rule: dict,
    worker: dict,
    family_member: Optional[dict],
    registration_info: dict,
    claimant_type: str,
    education_records: list = None,
) -> dict:
    """
    Evaluate a single scheme rule against the worker/family member context.

    Returns a dict with:
      - rule_id: int
      - rule_type: str
      - field: str
      - passed: bool
      - status: 'matched' | 'failed' | 'missing_info'
      - reason: str (human-readable)
      - is_mandatory: bool
    """
    rule_type = rule.get("rule_type", "")
    field = rule.get("field", "")
    operator = rule.get("operator", "=")
    value = rule.get("value", "")
    value_type = rule.get("value_type", "string")
    is_mandatory = bool(rule.get("is_mandatory", 1))

    result = {
        "rule_id": rule.get("id"),
        "rule_type": rule_type,
        "field": field,
        "passed": False,
        "status": "failed",
        "reason": "",
        "is_mandatory": is_mandatory,
    }

    # Determine which person's data to evaluate against
    target = family_member if family_member else worker
    target_name = family_member.get("name", "") if family_member else worker.get("full_name", "")

    # --- BOARD MATCH RULE ---
    if rule_type in ("board_jurisdiction", "board_match"):
        worker_board_id = worker.get("board_id")
        if worker_board_id is None:
            result["status"] = "missing_info"
            result["reason"] = "Worker's welfare board is not assigned."
            return result
        if str(worker_board_id) == str(value):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Welfare board matches the required board."
        else:
            result["reason"] = f"Worker's welfare board does not match the required board for this scheme."
        return result

    # --- REGISTRATION STATUS RULE ---
    if rule_type in ("registration_valid", "registration_required"):
        reg = registration_info.get("registration")
        if not reg:
            result["status"] = "missing_info"
            result["reason"] = "No registration record found."
            return result
        if registration_info.get("is_active"):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Worker registration is currently active."
        else:
            result["reason"] = f"Worker registration has expired or is not valid. Status: {registration_info.get('status', 'Unknown')}."
        return result

    # --- REGISTRATION TENURE RULE ---
    if rule_type in ("min_tenure", "registration_duration"):
        reg = registration_info.get("registration")
        if not reg or not reg.get("registration_date"):
            result["status"] = "missing_info"
            result["reason"] = "Registration date not available to calculate tenure."
            return result
        tenure = calculate_registration_duration(reg["registration_date"])
        if tenure is None:
            result["status"] = "missing_info"
            result["reason"] = "Cannot calculate registration duration from available data."
            return result
        try:
            required = float(value)
        except (ValueError, TypeError):
            result["reason"] = f"Invalid tenure requirement configured: {value}"
            return result
        if tenure >= required:
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Registration tenure ({tenure} years) meets the minimum requirement ({required} years)."
        else:
            result["reason"] = f"Registration tenure ({tenure} years) is below the minimum requirement ({required} years)."
        return result

    # --- AGE RULES ---
    if rule_type in ("min_age", "AGE_MIN"):
        dob = target.get("date_of_birth")
        age = calculate_age(dob) if dob else None
        if age is None:
            result["status"] = "missing_info"
            result["reason"] = f"Date of birth not available for {target_name} to evaluate age."
            return result
        try:
            required = int(value)
        except (ValueError, TypeError):
            result["reason"] = f"Invalid age requirement: {value}"
            return result
        if age >= required:
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Age ({age} years) meets the minimum requirement ({required} years)."
        else:
            result["reason"] = f"Age ({age} years) is below the minimum requirement ({required} years)."
        return result

    if rule_type in ("max_age", "AGE_MAX"):
        dob = target.get("date_of_birth")
        age = calculate_age(dob) if dob else None
        if age is None:
            result["status"] = "missing_info"
            result["reason"] = f"Date of birth not available for {target_name} to evaluate age."
            return result
        try:
            required = int(value)
        except (ValueError, TypeError):
            result["reason"] = f"Invalid age requirement: {value}"
            return result
        if age <= required:
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Age ({age} years) is within the maximum limit ({required} years)."
        else:
            result["reason"] = f"Age ({age} years) exceeds the maximum limit ({required} years)."
        return result

    # --- GENDER RULE ---
    if rule_type in ("gender", "GENDER"):
        actual_gender = target.get("gender", "")
        if not actual_gender:
            result["status"] = "missing_info"
            result["reason"] = f"Gender information not available for {target_name}."
            return result
        if evaluate_operator(actual_gender, operator, value, "string"):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Gender ({actual_gender}) matches the requirement ({value})."
        else:
            result["reason"] = f"Gender ({actual_gender}) does not match the requirement ({value}). This benefit may be restricted to {value} beneficiaries."
        return result

    # --- EDUCATION LEVEL RULE ---
    if rule_type in ("education_level", "EDUCATION_LEVEL"):
        edu_level = target.get("education_level", "")
        # Also check education records for more precise matching
        if education_records and family_member:
            fm_id = family_member.get("id")
            for rec in education_records:
                if rec.get("family_member_id") == fm_id:
                    edu_level = rec.get("education_level", edu_level)
                    break
        if not edu_level:
            result["status"] = "missing_info"
            result["reason"] = f"Education level not available for {target_name}."
            return result
        if evaluate_operator(edu_level, operator, value, "string"):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Education level ({edu_level}) matches the requirement."
        else:
            result["reason"] = f"Education level ({edu_level}) does not match the requirement ({value})."
        return result

    # --- CLAIMANT TYPE RULE ---
    if rule_type in ("claimant_type", "CLAIMANT_TYPE"):
        if evaluate_operator(claimant_type, operator, value, value_type):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Claimant type ({claimant_type}) matches the scheme's eligible claimant types."
        else:
            result["reason"] = f"Claimant type ({claimant_type}) is not among the eligible types for this scheme."
        return result

    # --- WORKER CATEGORY RULE ---
    if rule_type in ("worker_category", "WORKER_CATEGORY"):
        cat = worker.get("worker_category", "")
        if not cat:
            result["status"] = "missing_info"
            result["reason"] = "Worker category not assigned."
            return result
        if evaluate_operator(cat, operator, value, value_type):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Worker category ({cat}) matches the requirement."
        else:
            result["reason"] = f"Worker category ({cat}) does not match the requirement ({value})."
        return result

    # --- DISABILITY RULES ---
    if rule_type in ("has_disability", "DISABILITY_STATUS"):
        target_disability = target.get("has_disability", 0)
        try:
            required = int(value)
        except (ValueError, TypeError):
            result["reason"] = f"Invalid disability requirement: {value}"
            return result
        if target_disability == required:
            result["passed"] = True
            result["status"] = "matched"
            if required:
                result["reason"] = f"Disability status confirmed as required."
            else:
                result["reason"] = f"No disability confirmed (as required)."
        else:
            if required:
                result["reason"] = f"No disability recorded; this scheme requires a certified disability."
            else:
                result["reason"] = f"Disability recorded but this scheme is for non-disabled workers."
        return result

    if rule_type in ("DISABILITY_PERCENTAGE"):
        dp = target.get("disability_percentage")
        if dp is None:
            result["status"] = "missing_info"
            result["reason"] = f"Disability percentage not available for {target_name}."
            return result
        try:
            required = float(value)
        except (ValueError, TypeError):
            result["reason"] = f"Invalid disability percentage requirement: {value}"
            return result
        if evaluate_operator(dp, operator, str(required), "number"):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Disability percentage ({dp}%) meets the requirement."
        else:
            result["reason"] = f"Disability percentage ({dp}%) does not meet the requirement ({operator} {required}%)."
        return result

    # --- DEPENDENCY RULE ---
    if rule_type in ("DEPENDENCY_STATUS"):
        if family_member:
            is_dep = family_member.get("is_dependent")
            if is_dep is None:
                result["status"] = "missing_info"
                result["reason"] = f"Dependency status not available for {target_name}."
                return result
            try:
                required = int(value)
            except (ValueError, TypeError):
                result["reason"] = f"Invalid dependency requirement: {value}"
                return result
            if is_dep == required:
                result["passed"] = True
                result["status"] = "matched"
                result["reason"] = f"Dependency status matches the requirement."
            else:
                result["reason"] = f"Dependency status ({'dependent' if is_dep else 'not dependent'}) does not match the requirement."
        else:
            result["reason"] = "Dependency check requires a family member context."
        return result

    # --- MARITAL STATUS RULE ---
    if rule_type in ("MARITAL_STATUS"):
        marital = target.get("marital_status", "")
        if not marital:
            result["status"] = "missing_info"
            result["reason"] = f"Marital status not available for {target_name}."
            return result
        if evaluate_operator(marital, operator, value, "string"):
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Marital status ({marital}) matches the requirement."
        else:
            result["reason"] = f"Marital status ({marital}) does not match the requirement ({value})."
        return result

    # --- STUDENT STATUS RULE ---
    if rule_type in ("STUDENT_STATUS"):
        studying = target.get("is_currently_studying", 0) if family_member else 0
        if family_member:
            # Also check education records
            if education_records:
                fm_id = family_member.get("id")
                for rec in education_records:
                    if rec.get("family_member_id") == fm_id:
                        studying = rec.get("is_currently_studying", studying)
                        break
        try:
            required = int(value)
        except (ValueError, TypeError):
            result["reason"] = f"Invalid student status requirement: {value}"
            return result
        if studying == required:
            result["passed"] = True
            result["status"] = "matched"
            if required:
                result["reason"] = f"Currently studying as required."
            else:
                result["reason"] = f"Not currently studying (as required)."
        else:
            result["reason"] = f"Student status does not match the requirement."
        return result

    # --- ACCOMMODATION TYPE RULE ---
    if rule_type in ("accommodation_type", "ACCOMMODATION_TYPE"):
        if family_member:
            course_class = family_member.get("course_or_class", "") or ""
            institution = family_member.get("institution_name", "") or ""
            # Check if 'hostel' or 'hostelling' appears in any field
            is_hostel = "hostel" in course_class.lower() or "hostel" in institution.lower()
        else:
            is_hostel = False

        expected_hostel = "hostel" in value.lower()
        if is_hostel == expected_hostel:
            result["passed"] = True
            result["status"] = "matched"
            result["reason"] = f"Accommodation type matches the requirement ({value})."
        else:
            if expected_hostel:
                result["status"] = "missing_info"
                result["reason"] = f"Hostel accommodation status not confirmed. Official verification required."
            else:
                result["passed"] = True
                result["status"] = "matched"
                result["reason"] = f"Non-hostel accommodation matches the requirement."
        return result

    # --- CHILD COUNT / MAX USAGE RULE ---
    if rule_type in ("max_children", "CHILD_COUNT"):
        # When field is 'max_usage', this is about claim frequency, not child count
        if field in ("max_usage", "max_children"):
            # This checks how many times a benefit has been claimed
            # Since we don't track claim history in a separate table, return INSUFFICIENT_DATA
            # The max_usage from the scheme definition limits total claims
            try:
                max_claims = int(value)
            except (ValueError, TypeError):
                result["reason"] = f"Invalid max usage requirement: {value}"
                return result
            # Check existing applications
            worker_id = worker.get("id")
            scheme_id_for_check = rule.get("scheme_id")
            existing_apps = fetch_all(
                "SELECT COUNT(*) as cnt FROM scheme_applications WHERE worker_id = ? AND scheme_id = ? AND status IN ('Approved', 'Pending', 'Under Review')",
                (worker_id, scheme_id_for_check),
            )
            app_count = existing_apps[0]["cnt"] if existing_apps else 0
            if app_count < max_claims:
                result["passed"] = True
                result["status"] = "matched"
                result["reason"] = f"Claim usage ({app_count}/{max_claims} claims used) is within the maximum allowed."
            else:
                result["reason"] = f"Maximum claim limit reached ({app_count}/{max_claims} claims used)."
        else:
            # Generic child count check
            worker_id_val = worker.get("id")
            children = fetch_all(
                "SELECT COUNT(*) as cnt FROM family_members WHERE worker_id = ? AND relationship IN ('Son', 'Daughter')",
                (worker_id_val,),
            )
            count = children[0]["cnt"] if children else 0
            try:
                required = int(value)
            except (ValueError, TypeError):
                result["reason"] = f"Invalid child count requirement: {value}"
                return result
            if operator in ("<=", "LESS_THAN_OR_EQUAL") and count <= required:
                result["passed"] = True
                result["status"] = "matched"
                result["reason"] = f"Number of children ({count}) is within the limit ({required})."
            elif operator in (">=", "GREATER_THAN_OR_EQUAL") and count >= required:
                result["passed"] = True
                result["status"] = "matched"
                result["reason"] = f"Number of children ({count}) meets the requirement ({required})."
            else:
                result["reason"] = f"Number of children ({count}) does not meet the configured requirement ({operator} {required})."
        return result

    # --- CUSTOM RULE ---
    if rule_type in ("custom", "CUSTOM"):
        result["passed"] = True
        result["status"] = "matched"
        result["reason"] = "Custom rule — requires manual review."
        return result

    # --- DEFAULT / UNKNOWN RULE TYPE ---
    result["status"] = "missing_info"
    result["reason"] = f"Rule type '{rule_type}' is not yet implemented in the evaluation engine."
    return result


# ============================================================
# SCHEME ELIGIBILITY EVALUATION
# ============================================================

def evaluate_claimant_for_scheme(
    worker: dict,
    family_member: Optional[dict],
    scheme: dict,
    registration_info: dict,
    education_records: list = None,
) -> dict:
    """
    Evaluate a single claimant (worker or family member) against a single scheme.

    Returns a detailed eligibility result dict.
    """
    # Determine claimant info
    if family_member:
        claimant_id = family_member.get("id")
        claimant_name = family_member.get("name", "Unknown")
        claimant_type_raw = map_relationship_to_claimant(family_member.get("relationship", ""))
        claimant_type_display = family_member.get("relationship", "Family Member")
    else:
        claimant_id = worker.get("id")
        claimant_name = worker.get("full_name", "Unknown")
        claimant_type_raw = "WORKER"
        claimant_type_display = "Worker"

    scheme_id = scheme.get("id")
    scheme_name = scheme.get("name", "Unknown Scheme")
    board_id = scheme.get("board_id")
    scheme_claimant_type = scheme.get("claimant_type", "WORKER")
    category_name = scheme.get("category_name", "")
    qualification_text = scheme.get("qualification_text", "")

    # Build the result skeleton
    result = {
        "scheme_id": scheme_id,
        "scheme_name": scheme_name,
        "scheme_code": scheme.get("scheme_code", ""),
        "category_name": category_name,
        "claimant_id": claimant_id,
        "claimant_name": claimant_name,
        "claimant_type": claimant_type_display,
        "claimant_relationship": family_member.get("relationship", "") if family_member else "",
        "board_id": board_id,
        "board_name": scheme.get("board_name", ""),
        "variant_id": None,
        "variant_name": qualification_text,
        "status": STATUS_POTENTIAL,
        "benefit_amount": None,
        "benefit_amount_display": "Amount to be confirmed",
        "benefit_unit": None,
        "matched_rules": [],
        "failed_rules": [],
        "missing_information": [],
        "explanation": "",
        "verification_required": True,
        "source_info": scheme.get("eligibility_summary", ""),
        "disclaimer": ELIGIBILITY_DISCLAIMER,
    }

    # --- STEP 1: Check if this claimant type is valid for this scheme ---
    claimant_allowed = False
    claimant_lower = claimant_type_raw.lower()
    scheme_type_lower = (scheme_claimant_type or "WORKER").lower()

    # Parse the scheme's claimant_type which may be compound (e.g. WORKER_OR_CHILD)
    scheme_claimant_types = []
    if "_or_" in scheme_type_lower:
        scheme_claimant_types = [t.strip() for t in scheme_type_lower.split("_or_")]
    else:
        scheme_claimant_types = [scheme_type_lower]

    # Check if the claimant type matches
    for allowed_type in scheme_claimant_types:
        if allowed_type == "any":
            claimant_allowed = True
            break
        if allowed_type == "child" and claimant_lower in ("son", "daughter", "child"):
            claimant_allowed = True
            break
        if allowed_type == "worker" and claimant_lower == "worker":
            claimant_allowed = True
            break
        if allowed_type == "female_worker" and claimant_lower == "worker":
            # Need to also check gender
            if worker.get("gender", "").lower() == "female":
                claimant_allowed = True
            break
        if allowed_type in ("family_member", "dependent", "spouse", "nominee"):
            if claimant_lower in ("spouse", "son", "daughter", "family_member", "dependent", "nominee"):
                claimant_allowed = True
                break
            if claimant_lower == "worker" and allowed_type == "worker":
                claimant_allowed = True
                break
        if allowed_type == claimant_lower:
            claimant_allowed = True
            break

    if not claimant_allowed:
        result["status"] = STATUS_NOT_ELIGIBLE
        result["explanation"] = (
            f"This scheme ({scheme_name}) is configured for {scheme_claimant_type} claimants. "
            f"{claimant_name} ({claimant_type_display}) does not match the eligible claimant type."
        )
        result["failed_rules"].append({
            "rule_type": "CLAIMANT_TYPE",
            "field": "claimant_type",
            "passed": False,
            "reason": f"Claimant type ({claimant_type_display}) is not eligible for this scheme.",
            "is_mandatory": True,
        })
        return result

    # --- STEP 2: Check board-specific benefit availability ---
    if board_id:
        benefit = get_board_specific_benefit(scheme_id, board_id)
        if not benefit or not benefit.get("is_available"):
            result["status"] = STATUS_NOT_ELIGIBLE
            result["explanation"] = (
                f"This scheme benefit is not available for the worker's registered welfare board."
            )
            result["failed_rules"].append({
                "rule_type": "BOARD_BENEFIT",
                "field": "board_id",
                "passed": False,
                "reason": f"No board-specific benefit configured for this welfare board.",
                "is_mandatory": True,
            })
            return result
        result["benefit_amount"] = benefit.get("amount_numeric")
        result["benefit_amount_display"] = benefit.get("amount", format_amount(benefit.get("amount_numeric")))
        result["benefit_unit"] = benefit.get("amount_unit")
    else:
        # Scheme applicable to all boards — try to find any benefit
        all_benefits = fetch_all(
            "SELECT * FROM scheme_benefits WHERE scheme_id = ? AND is_available = 1 LIMIT 1",
            (scheme_id,),
        )
        if all_benefits:
            result["benefit_amount"] = all_benefits[0].get("amount_numeric")
            result["benefit_amount_display"] = all_benefits[0].get("amount", format_amount(all_benefits[0].get("amount_numeric")))
            result["benefit_unit"] = all_benefits[0].get("amount_unit")

    # --- STEP 3: Load and evaluate scheme rules ---
    rules = fetch_all(
        """
        SELECT * FROM scheme_rules
        WHERE scheme_id = ? AND is_active = 1
        ORDER BY priority DESC, id ASC
        """,
        (scheme_id,),
    )

    # Also load qualification-level rules if applicable
    qualifications = fetch_all(
        "SELECT * FROM scheme_qualifications WHERE scheme_id = ? AND is_active = 1 ORDER BY sort_order",
        (scheme_id,),
    )

    # --- STEP 4: For Education Assistance, evaluate qualification variants ---
    if scheme.get("scheme_code") == "EDU_ASSIST" and qualifications:
        return _evaluate_education_assistance(
            worker, family_member, scheme, qualifications, registration_info, education_records, result
        )

    # --- STEP 5: For Pension, evaluate qualification variants ---
    if scheme.get("scheme_code") == "PENSION" and qualifications:
        return _evaluate_pension(
            worker, family_member, scheme, qualifications, registration_info, result
        )

    # --- STEP 6: Generic rule evaluation ---
    for rule in rules:
        rule_result = evaluate_scheme_rule(
            rule, worker, family_member, registration_info, claimant_type_raw, education_records
        )
        if rule_result["passed"]:
            result["matched_rules"].append(rule_result)
        elif rule_result["status"] == "missing_info":
            result["missing_information"].append(rule_result)
        else:
            result["failed_rules"].append(rule_result)

    # --- STEP 7: Determine final status ---
    result = _determine_final_status(result)
    return result


def _evaluate_education_assistance(
    worker, family_member, scheme, qualifications, registration_info, education_records, result
):
    """Evaluate Education Assistance against qualification variants."""
    if not family_member:
        result["status"] = STATUS_NOT_ELIGIBLE
        result["explanation"] = "Education Assistance applies to children of registered workers."
        result["failed_rules"].append({
            "rule_type": "CLAIMANT_TYPE",
            "field": "claimant_type",
            "passed": False,
            "reason": "Education Assistance applies to children of registered workers.",
            "is_mandatory": True,
        })
        return result

    # Check if family member is a child
    relationship = family_member.get("relationship", "")
    if relationship not in ("Son", "Daughter"):
        result["status"] = STATUS_NOT_ELIGIBLE
        result["explanation"] = "Education Assistance applies to sons and daughters of registered workers."
        result["failed_rules"].append({
            "rule_type": "RELATIONSHIP",
            "field": "relationship",
            "passed": False,
            "reason": f"Family member relationship ({relationship}) is not eligible for Education Assistance.",
            "is_mandatory": True,
        })
        return result

    # Check registration
    if not registration_info.get("is_active"):
        result["status"] = STATUS_INSUFFICIENT
        result["explanation"] = "Education Assistance requires an active worker registration."
        result["missing_information"].append({
            "rule_type": "REGISTRATION_STATUS",
            "field": "registration",
            "passed": False,
            "reason": "Worker registration is not active or not found.",
            "is_mandatory": True,
            "status": "missing_info",
        })
        return result

    result["matched_rules"].append({
        "rule_type": "REGISTRATION_STATUS",
        "field": "registration",
        "passed": True,
        "reason": "Worker registration is active.",
        "is_mandatory": True,
        "status": "matched",
    })

    # Get family member's education level
    fm_edu_level = family_member.get("education_level", "")
    fm_id = family_member.get("id")
    fm_academic_year = family_member.get("academic_year")
    fm_is_studying = family_member.get("is_currently_studying", 0)
    fm_course = family_member.get("course_or_class", "")
    fm_year_of_study = None

    # Also check education records for more detail
    if education_records:
        for rec in education_records:
            if rec.get("family_member_id") == fm_id:
                fm_edu_level = rec.get("education_level", fm_edu_level)
                if rec.get("year_of_study"):
                    fm_academic_year = rec.get("year_of_study")
                    fm_year_of_study = rec.get("year_of_study")
                if rec.get("is_currently_studying") is not None:
                    fm_is_studying = rec.get("is_currently_studying")
                if rec.get("course"):
                    fm_course = rec.get("course")
                break

    fm_gender = family_member.get("gender", "")
    fm_age = calculate_age(family_member.get("date_of_birth"))

    if not fm_edu_level:
        result["status"] = STATUS_INSUFFICIENT
        result["missing_information"].append({
            "rule_type": "EDUCATION_LEVEL",
            "field": "education_level",
            "passed": False,
            "reason": f"Education level not available for {family_member.get('name', 'family member')}.",
            "is_mandatory": True,
            "status": "missing_info",
        })
        result["explanation"] = (
            f"Cannot evaluate Education Assistance variants without knowing the education level "
            f"of {family_member.get('name', 'the family member')}."
        )
        return result

    # Determine precise education level from year_of_study when available
    # year_of_study can be: '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG 1st Year', etc.
    precise_level = None
    is_pass = False  # Whether the student has passed (not currently studying)
    if fm_year_of_study:
        yos_lower = fm_year_of_study.lower().strip()
        # Extract standard number if present
        import re
        std_match = re.search(r'(\d+)(?:th|st|nd|rd)?\s*(?:std|standard)?', yos_lower)
        if std_match:
            std_num = int(std_match.group(1))
            if std_num <= 9:
                precise_level = "6th-9th"
            elif std_num == 10:
                precise_level = "10th"
            elif std_num == 11:
                precise_level = "11th"
            elif std_num == 12:
                precise_level = "12th"
        if "ug" in yos_lower or "undergrad" in yos_lower:
            precise_level = "UG"
        if "pg" in yos_lower or "postgrad" in yos_lower:
            precise_level = "PG"
        if "iti" in yos_lower or "polytechnic" in yos_lower:
            precise_level = "ITI/Polytechnic"
        if "professional" in yos_lower and "pg" in yos_lower:
            precise_level = "Professional PG"
        elif "professional" in yos_lower:
            precise_level = "Professional Degree"

    # If not currently studying, treat as "Pass" variant
    if not fm_is_studying:
        is_pass = True

    # Match against qualification variants
    # Build a priority score to prefer the most specific match
    best_match = None
    best_score = -1

    for qual in qualifications:
        qual_edu_level = qual.get("education_level", "")
        qual_edu_type = qual.get("education_type", "")

        if not qual_edu_level:
            continue

        # Check education level match
        edu_match = False
        score = 0
        fm_level_lower = fm_edu_level.lower().strip()
        qual_level_lower = qual_edu_level.lower().strip()

        # Prefer precise level matching from year_of_study
        if precise_level and qual_level_lower == precise_level.lower():
            edu_match = True
            score = 100  # Highest priority for exact match
            # Prefer Pass variants for non-studying students
            if is_pass and qual_edu_type == "Pass":
                score = 120
            elif not is_pass and qual_edu_type == "Regular":
                score = 110
        # Direct level matching
        elif fm_level_lower == qual_level_lower:
            edu_match = True
            score = 80
        # Map level names
        elif fm_level_lower == "secondary" and qual_level_lower in ("10th", "11th", "6th-9th"):
            edu_match = True
            score = 50 if qual_level_lower != "6th-9th" else 30
        elif fm_level_lower == "higher secondary" and qual_level_lower in ("12th", "11th", "10th"):
            edu_match = True
            score = 60 if qual_level_lower == "12th" else 40 if qual_level_lower == "11th" else 20
        elif fm_level_lower == "diploma" and qual_level_lower == "iti/polytechnic":
            edu_match = True
            score = 80
        # Range matching
        elif qual_level_lower == "6th-9th" and fm_level_lower in ("primary", "secondary"):
            edu_match = True
            score = 20
        elif qual_level_lower == "10th" and fm_level_lower in ("secondary",):
            edu_match = True
            score = 40
        elif qual_level_lower == "11th" and fm_level_lower == "higher secondary":
            edu_match = True
            score = 40
        elif qual_level_lower == "12th" and fm_level_lower == "higher secondary":
            edu_match = True
            score = 60
        elif qual_level_lower == "ug" and fm_level_lower in ("undergraduate",):
            edu_match = True
            score = 80
        elif qual_level_lower == "pg" and fm_level_lower in ("postgraduate", "phd"):
            edu_match = True
            score = 80
        elif qual_level_lower == "professional degree" and fm_level_lower in ("undergraduate",):
            edu_match = True
            score = 80
        elif qual_level_lower == "professional pg" and fm_level_lower in ("postgraduate",):
            edu_match = True
            score = 80
        elif qual_level_lower == "iti/polytechnic" and fm_level_lower in ("diploma",):
            edu_match = True
            score = 80

        if not edu_match:
            continue

        # Check gender restriction
        if qual_edu_type == "Female Children":
            if fm_gender.lower() != "female":
                continue
            score += 10  # Slight boost for matching gender-restricted variant

        # If we get here and this is a better match, update
        if score > best_score:
            best_match = qual
            best_score = score

    if best_match:
        result["variant_id"] = best_match.get("id")
        result["variant_name"] = best_match.get("qualification_text", "")
        result["matched_rules"].append({
            "rule_type": "EDUCATION_LEVEL",
            "field": "education_level",
            "passed": True,
            "reason": f"Education level matches the variant: {best_match.get('qualification_text', '')}.",
            "is_mandatory": True,
            "status": "matched",
        })

        # Check gender for female-only variants
        if best_match.get("education_type") == "Female Children":
            result["matched_rules"].append({
                "rule_type": "GENDER",
                "field": "gender",
                "passed": True,
                "reason": f"Gender ({fm_gender}) matches the female children requirement.",
                "is_mandatory": True,
                "status": "matched",
            })

        # Get board-specific benefit for this qualification variant
        board_id = scheme.get("board_id") or worker.get("board_id")
        if board_id:
            benefit = get_board_specific_benefit(scheme.get("id"), board_id, best_match.get("id"))
            if benefit:
                result["benefit_amount"] = benefit.get("amount_numeric")
                result["benefit_amount_display"] = benefit.get("amount", format_amount(benefit.get("amount_numeric")))
                result["benefit_unit"] = benefit.get("amount_unit")
            else:
                # No benefit for this board for this variant
                result["status"] = STATUS_NOT_ELIGIBLE
                result["explanation"] = f"This education variant is not available for the worker's welfare board."
                result["failed_rules"].append({
                    "rule_type": "BOARD_BENEFIT",
                    "field": "board_id",
                    "passed": False,
                    "reason": "No board-specific benefit configured for this education variant.",
                    "is_mandatory": True,
                    "status": "failed",
                })
                return result

        # Check studying status — if not confirmed, add to missing info
        if not fm_is_studying:
            result["missing_information"].append({
                "rule_type": "STUDENT_STATUS",
                "field": "is_currently_studying",
                "passed": False,
                "reason": f"Currently studying status not confirmed for {family_member.get('name', 'the family member')}.",
                "is_mandatory": False,
                "status": "missing_info",
            })

        result["status"] = STATUS_POTENTIAL
        result["explanation"] = (
            f"Family member ({family_member.get('name', 'Unknown')}) is a {relationship.lower()} "
            f"and the recorded education level matches the scheme variant: {best_match.get('qualification_text', '')}. "
            f"Official documentation and academic year verification required."
        )
    else:
        # No matching variant found
        result["status"] = STATUS_INSUFFICIENT
        result["explanation"] = (
            f"No Education Assistance variant could be matched for {family_member.get('name', 'Unknown')} "
            f"with education level '{fm_edu_level}'. This may be outside the supported education levels "
            f"for this scheme, or more information may be needed."
        )
        result["missing_information"].append({
            "rule_type": "EDUCATION_VARIANT_MATCH",
            "field": "education_level",
            "passed": False,
            "reason": f"No matching education variant found for level '{fm_edu_level}'.",
            "is_mandatory": True,
            "status": "missing_info",
        })

    return result


def _evaluate_pension(worker, family_member, scheme, qualifications, registration_info, result):
    """Evaluate Pension scheme with qualification variants (Monthly Pension / Family Pension)."""
    if family_member:
        # Family Pension variant
        pension_type = "FAMILY_PENSION"
        family_qual = None
        for q in qualifications:
            if q.get("claimant_type") == "FAMILY_MEMBER" and "family" in (q.get("qualification_text") or "").lower():
                family_qual = q
                break

        if not family_qual:
            result["status"] = STATUS_NOT_ELIGIBLE
            result["explanation"] = "No Family Pension variant is configured for this scheme."
            return result

        result["variant_id"] = family_qual.get("id")
        result["variant_name"] = family_qual.get("qualification_text", "")

        # Check registration
        if not registration_info.get("is_active"):
            result["status"] = STATUS_INSUFFICIENT
            result["missing_information"].append({
                "rule_type": "REGISTRATION_STATUS",
                "field": "registration",
                "passed": False,
                "reason": "Worker registration status needs verification for family pension eligibility.",
                "is_mandatory": True,
                "status": "missing_info",
            })
            result["explanation"] = (
                f"Family Pension evaluation for {family_member.get('name', 'Unknown')} requires "
                f"verification of the worker's registration status."
            )
            return result

        # Get benefit for family pension
        board_id = scheme.get("board_id") or worker.get("board_id")
        if board_id:
            benefit = get_board_specific_benefit(scheme.get("id"), board_id, family_qual.get("id"))
            if benefit and benefit.get("is_available"):
                result["benefit_amount"] = benefit.get("amount_numeric")
                result["benefit_amount_display"] = benefit.get("amount", format_amount(benefit.get("amount_numeric")))
                result["benefit_unit"] = benefit.get("amount_unit")
            else:
                result["status"] = STATUS_NOT_ELIGIBLE
                result["explanation"] = "Family Pension is not available for the worker's welfare board."
                result["failed_rules"].append({
                    "rule_type": "BOARD_BENEFIT",
                    "field": "board_id",
                    "passed": False,
                    "reason": "Family Pension benefit not available for this welfare board.",
                    "is_mandatory": True,
                    "status": "failed",
                })
                return result

        result["status"] = STATUS_POTENTIAL
        result["explanation"] = (
            f"Family Pension may be applicable for {family_member.get('name', 'Unknown')} "
            f"({family_member.get('relationship', 'family member')}). "
            f"Official verification of worker's registration and family relationship required."
        )
        result["matched_rules"].append({
            "rule_type": "CLAIMANT_TYPE",
            "field": "claimant_type",
            "passed": True,
            "reason": "Family member is an eligible claimant for Family Pension.",
            "is_mandatory": True,
            "status": "matched",
        })
        result["verification_required"] = True
        return result

    else:
        # Monthly Pension for worker
        pension_type = "MONTHLY_PENSION"
        worker_qual = None
        for q in qualifications:
            if q.get("claimant_type") == "WORKER" and "monthly" in (q.get("qualification_text") or "").lower():
                worker_qual = q
                break

        if not worker_qual:
            result["status"] = STATUS_INSUFFICIENT
            result["explanation"] = "Monthly Pension variant configuration needs verification."
            return result

        result["variant_id"] = worker_qual.get("id")
        result["variant_name"] = worker_qual.get("qualification_text", "")

        # Check registration
        if not registration_info.get("is_active"):
            result["status"] = STATUS_INSUFFICIENT
            result["missing_information"].append({
                "rule_type": "REGISTRATION_STATUS",
                "field": "registration",
                "passed": False,
                "reason": "Worker registration is not active. Pension requires active registration.",
                "is_mandatory": True,
                "status": "missing_info",
            })
            result["explanation"] = "Monthly Pension requires an active worker registration."
            return result

        result["matched_rules"].append({
            "rule_type": "REGISTRATION_STATUS",
            "field": "registration",
            "passed": True,
            "reason": "Worker registration is active.",
            "is_mandatory": True,
            "status": "matched",
        })

        # Get benefit
        board_id = scheme.get("board_id") or worker.get("board_id")
        if board_id:
            benefit = get_board_specific_benefit(scheme.get("id"), board_id, worker_qual.get("id"))
            if benefit and benefit.get("is_available"):
                result["benefit_amount"] = benefit.get("amount_numeric")
                result["benefit_amount_display"] = benefit.get("amount", format_amount(benefit.get("amount_numeric")))
                result["benefit_unit"] = benefit.get("amount_unit")
            else:
                result["status"] = STATUS_NOT_ELIGIBLE
                result["explanation"] = "Monthly Pension benefit not available for this welfare board."
                return result

        # Check age (pension typically requires retirement age)
        age = calculate_age(worker.get("date_of_birth"))
        if age is not None:
            if age >= 60:
                result["matched_rules"].append({
                    "rule_type": "AGE",
                    "field": "age",
                    "passed": True,
                    "reason": f"Worker age ({age} years) is at or above pension eligibility age.",
                    "is_mandatory": False,
                    "status": "matched",
                })
            else:
                result["missing_information"].append({
                    "rule_type": "AGE_REQUIREMENT",
                    "field": "age",
                    "passed": False,
                    "reason": f"Worker age ({age} years) may be below pension eligibility age. Official verification required.",
                    "is_mandatory": False,
                    "status": "missing_info",
                })
        else:
            result["missing_information"].append({
                "rule_type": "AGE_REQUIREMENT",
                "field": "age",
                "passed": False,
                "reason": "Worker age could not be calculated.",
                "is_mandatory": False,
                "status": "missing_info",
            })

        result["status"] = STATUS_POTENTIAL
        result["explanation"] = (
            f"Monthly Pension may be applicable for {worker.get('full_name', 'the worker')}. "
            f"Requires verification of retirement status and registration duration."
        )
        result["verification_required"] = True
        return result


def _determine_final_status(result: dict) -> dict:
    """Determine the final eligibility status based on matched/failed/missing rules."""
    has_mandatory_failure = any(
        r.get("is_mandatory") and not r.get("passed")
        for r in result.get("failed_rules", [])
    )
    has_missing_mandatory = any(
        r.get("is_mandatory") and not r.get("passed")
        for r in result.get("missing_information", [])
    )
    has_matched = len(result.get("matched_rules", [])) > 0

    if has_mandatory_failure:
        result["status"] = STATUS_NOT_ELIGIBLE
        failed_reasons = [r.get("reason", "") for r in result["failed_rules"] if r.get("is_mandatory")]
        result["explanation"] = "Not eligible based on available information. " + " ".join(failed_reasons)
    elif has_missing_mandatory:
        result["status"] = STATUS_INSUFFICIENT
        missing_items = [r.get("field", "unknown") for r in result["missing_information"] if r.get("is_mandatory")]
        result["explanation"] = (
            f"Cannot make a reliable determination. Missing required information: {', '.join(missing_items)}. "
            f"Please update the applicant/family member records."
        )
    elif has_matched and not has_mandatory_failure:
        result["status"] = STATUS_POTENTIAL
        if not result.get("explanation"):
            result["explanation"] = (
                "Preliminary analysis indicates this scheme may be applicable. "
                "Official document verification is required for final determination."
            )
    else:
        result["status"] = STATUS_POTENTIAL
        if not result.get("explanation"):
            result["explanation"] = "Scheme evaluation completed. Manual review recommended."

    return result


# ============================================================
# COMPLETE APPLICANT ANALYSIS
# ============================================================

def analyze_applicant(worker_id: int) -> dict:
    """
    Complete eligibility analysis for a worker and all family members.

    Returns a structured analysis with:
    - Worker profile info
    - Summary counts
    - Worker eligibility results
    - Family member eligibility results
    - Audit information
    """
    # --- 1. Load worker ---
    worker = fetch_one(
        "SELECT * FROM workers WHERE id = ? AND is_active = 1",
        (worker_id,),
    )
    if not worker:
        return {
            "success": False,
            "error": "Worker not found or inactive.",
            "worker_id": worker_id,
        }

    # --- 2. Load welfare board ---
    board = None
    if worker.get("board_id"):
        board = fetch_one(
            "SELECT * FROM welfare_boards WHERE id = ?",
            (worker["board_id"],),
        )

    # --- 3. Load registration information ---
    registration_info = get_registration_status(worker_id)

    # --- 4. Load family members ---
    family_members = get_family_members(worker_id)

    # --- 5. Load education records ---
    education_records = get_education_records(worker_id)

    # --- 6. Load relevant schemes with categories ---
    # Get schemes that are either: global (no board), or match worker's board
    worker_board_id = worker.get("board_id")
    schemes = fetch_all(
        """
        SELECT ws.*, sc.name as category_name, wb.name as board_name
        FROM welfare_schemes ws
        LEFT JOIN scheme_categories sc ON ws.category_id = sc.id
        LEFT JOIN welfare_boards wb ON ws.board_id = wb.id
        WHERE ws.is_active = 1
        ORDER BY sc.display_order, ws.name
        """
    )

    # Filter to schemes relevant to this worker's board
    relevant_schemes = []
    for scheme in schemes:
        scheme_board_id = scheme.get("board_id")
        # Scheme is relevant if:
        # - It has no specific board (global), OR
        # - It matches the worker's board, OR
        # - We include all for evaluation (the board rule will filter)
        relevant_schemes.append(scheme)

    # --- 7. Evaluate worker for each scheme ---
    worker_results = []
    for scheme in relevant_schemes:
        result = evaluate_claimant_for_scheme(
            worker=worker,
            family_member=None,
            scheme=scheme,
            registration_info=registration_info,
            education_records=education_records,
        )
        worker_results.append(result)

    # --- 8. Evaluate each family member ---
    family_results = []
    family_members_evaluated = 0

    for fm in family_members:
        fm_results = []
        for scheme in relevant_schemes:
            result = evaluate_claimant_for_scheme(
                worker=worker,
                family_member=fm,
                scheme=scheme,
                registration_info=registration_info,
                education_records=education_records,
            )
            fm_results.append(result)
        family_results.append({
            "family_member": {
                "id": fm.get("id"),
                "name": fm.get("name"),
                "relationship": fm.get("relationship"),
                "date_of_birth": fm.get("date_of_birth"),
                "age": calculate_age(fm.get("date_of_birth")),
                "gender": fm.get("gender"),
                "education_level": fm.get("education_level"),
                "is_dependent": fm.get("is_dependent"),
                "is_currently_studying": fm.get("is_currently_studying"),
            },
            "results": fm_results,
        })
        family_members_evaluated += 1

    # --- 9. Calculate summary ---
    all_results = worker_results + [r for fr in family_results for r in fr["results"]]
    total_schemes = len(relevant_schemes)

    potential_count = sum(1 for r in all_results if r["status"] == STATUS_POTENTIAL)
    eligible_count = sum(1 for r in all_results if r["status"] == STATUS_ELIGIBLE)
    not_eligible_count = sum(1 for r in all_results if r["status"] == STATUS_NOT_ELIGIBLE)
    insufficient_count = sum(1 for r in all_results if r["status"] == STATUS_INSUFFICIENT)

    worker_potential = sum(1 for r in worker_results if r["status"] in (STATUS_POTENTIAL, STATUS_ELIGIBLE))
    family_potential = sum(
        1 for fr in family_results
        for r in fr["results"]
        if r["status"] in (STATUS_POTENTIAL, STATUS_ELIGIBLE)
    )

    # --- 10. Build analysis ---
    analysis_date = datetime.now().isoformat()

    analysis = {
        "success": True,
        "worker_id": worker_id,
        "worker_name": worker.get("full_name", ""),
        "worker": {
            "id": worker.get("id"),
            "full_name": worker.get("full_name"),
            "gender": worker.get("gender"),
            "date_of_birth": worker.get("date_of_birth"),
            "age": calculate_age(worker.get("date_of_birth")),
            "board_name": board.get("name") if board else None,
            "board_id": worker.get("board_id"),
            "occupation": worker.get("occupation"),
            "worker_category": worker.get("worker_category"),
            "registration_status": registration_info.get("status"),
            "registration_active": registration_info.get("is_active"),
            "registration_number": (registration_info.get("registration") or {}).get("registration_number"),
            "registration_date": (registration_info.get("registration") or {}).get("registration_date"),
            "has_disability": worker.get("has_disability", 0),
        },
        "family_members_count": family_members_evaluated,
        "summary": {
            "total_schemes_evaluated": total_schemes,
            "potential_benefits": potential_count,
            "eligible_matches": eligible_count,
            "not_eligible": not_eligible_count,
            "insufficient_data": insufficient_count,
            "worker_potential_benefits": worker_potential,
            "family_potential_benefits": family_potential,
        },
        "worker_results": worker_results,
        "family_results": family_results,
        "disclaimer": ELIGIBILITY_DISCLAIMER,
        "engine_version": ENGINE_VERSION,
        "analysis_date": analysis_date,
    }

    # --- 11. Audit log ---
    try:
        from app.database import execute as db_execute
        # Store a sanitized audit record (no sensitive data)
        audit_result = {
            "worker_id": worker_id,
            "analysis_date": analysis_date,
            "engine_version": ENGINE_VERSION,
            "total_schemes": total_schemes,
            "eligible_count": eligible_count,
            "potential_count": potential_count,
            "not_eligible": not_eligible_count,
            "insufficient": insufficient_count,
            "family_members_evaluated": family_members_evaluated,
        }
        db_execute(
            """INSERT INTO eligibility_audit_log
               (worker_id, analysis_date, engine_version, total_schemes,
                eligible_count, potential_count, not_eligible, insufficient,
                family_members_evaluated, result_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                worker_id,
                analysis_date,
                ENGINE_VERSION,
                total_schemes,
                eligible_count,
                potential_count,
                not_eligible_count,
                insufficient_count,
                family_members_evaluated,
                json.dumps(audit_result, default=str),
            ),
        )
    except Exception as e:
        logger.warning(f"Failed to write audit log: {e}")

    return analysis


def evaluate_worker_for_scheme(worker_id: int, scheme_id: int) -> dict:
    """Evaluate a worker's eligibility for a specific welfare scheme (backward-compatible)."""
    worker = fetch_one(
        "SELECT * FROM workers WHERE id = ? AND is_active = 1",
        (worker_id,),
    )
    if not worker:
        return {
            "worker_id": worker_id,
            "scheme_id": scheme_id,
            "status": "Error",
            "reasons": ["Worker not found or inactive."],
            "rule_results": [],
            "disclaimer": ELIGIBILITY_DISCLAIMER,
        }

    scheme = fetch_one(
        "SELECT * FROM welfare_schemes WHERE id = ? AND is_active = 1",
        (scheme_id,),
    )
    if not scheme:
        return {
            "worker_id": worker_id,
            "scheme_id": scheme_id,
            "status": "Error",
            "reasons": ["Scheme not found or inactive."],
            "rule_results": [],
            "disclaimer": ELIGIBILITY_DISCLAIMER,
        }

    registration_info = get_registration_status(worker_id)
    result = evaluate_claimant_for_scheme(
        worker=worker,
        family_member=None,
        scheme=scheme,
        registration_info=registration_info,
    )

    # Map to old format for backward compatibility
    all_rule_results = result["matched_rules"] + result["failed_rules"] + result["missing_information"]
    return {
        "worker_id": worker_id,
        "scheme_id": scheme_id,
        "scheme_name": result["scheme_name"],
        "worker_name": worker["full_name"],
        "status": _map_status_for_legacy(result["status"]),
        "reasons": [result["explanation"]] if result["explanation"] else [],
        "rule_results": all_rule_results,
        "total_rules": len(all_rule_results),
        "passed_rules": len(result["matched_rules"]),
        "mandatory_rules": sum(1 for r in all_rule_results if r.get("is_mandatory")),
        "mandatory_passed": sum(1 for r in result["matched_rules"] if r.get("is_mandatory")),
        "disclaimer": ELIGIBILITY_DISCLAIMER,
    }


def _map_status_for_legacy(status: str) -> str:
    """Map new status to legacy status strings for backward compatibility."""
    mapping = {
        STATUS_ELIGIBLE: "Potentially Applicable",
        STATUS_POTENTIAL: "Potentially Applicable",
        STATUS_NOT_ELIGIBLE: "No Current Match",
        STATUS_INSUFFICIENT: "Review Recommended",
    }
    return mapping.get(status, "Review Recommended")
