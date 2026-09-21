"""
SMS Service — Twilio Integration
Sends real SMS notifications to workers' mobile numbers.
Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _get_twilio_client():
    """Lazy-load Twilio client to avoid import errors if not configured."""
    try:
        from twilio.rest import Client
        account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        if not account_sid or not auth_token:
            return None
        return Client(account_sid, auth_token)
    except ImportError:
        logger.warning("Twilio library not installed. Run: pip install twilio")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {e}")
        return None


def get_twilio_phone_number() -> Optional[str]:
    """Get the configured Twilio phone number."""
    return os.environ.get("TWILIO_PHONE_NUMBER", "")


def is_sms_configured() -> bool:
    """Check if SMS is properly configured with all required env vars."""
    return bool(
        os.environ.get("TWILIO_ACCOUNT_SID")
        and os.environ.get("TWILIO_AUTH_TOKEN")
        and os.environ.get("TWILIO_PHONE_NUMBER")
    )


def send_sms(to_number: str, message: str) -> dict:
    """
    Send a single SMS message.
    
    Args:
        to_number: Recipient phone number (E.164 format like +91XXXXXXXXXX)
        message: SMS body text (max 1600 chars for Twilio)
    
    Returns:
        dict with 'success' bool, 'message_sid' or 'error'
    """
    if not is_sms_configured():
        return {
            "success": False,
            "error": "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
        }
    
    client = _get_twilio_client()
    if not client:
        return {
            "success": False,
            "error": "Failed to initialize Twilio client.",
        }
    
    from_number = get_twilio_phone_number()
    
    # Normalize Indian phone numbers
    normalized = _normalize_phone(to_number)
    if not normalized:
        return {
            "success": False,
            "error": f"Invalid phone number: {to_number}",
        }
    
    try:
        sms = client.messages.create(
            body=message[:1600],  # Twilio limit
            from_=from_number,
            to=normalized,
        )
        logger.info(f"SMS sent to {normalized}: SID={sms.sid}")
        return {
            "success": True,
            "message_sid": sms.sid,
            "status": sms.status,
            "to": normalized,
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"SMS failed to {normalized}: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "to": normalized,
        }


def send_bulk_sms(messages: list[dict]) -> dict:
    """
    Send SMS to multiple recipients.
    
    Args:
        messages: list of dicts with 'to' and 'message' keys
    
    Returns:
        dict with summary of sent/failed/skipped counts and per-message results
    """
    if not is_sms_configured():
        return {
            "success": False,
            "error": "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "results": [],
        }
    
    client = _get_twilio_client()
    if not client:
        return {
            "success": False,
            "error": "Failed to initialize Twilio client.",
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "results": [],
        }
    
    from_number = get_twilio_phone_number()
    results = []
    sent_count = 0
    failed_count = 0
    skipped_count = 0
    
    for msg in messages:
        to_number = msg.get("to", "")
        message_text = msg.get("message", "")
        worker_id = msg.get("worker_id")
        worker_name = msg.get("worker_name", "")
        
        # Skip if no phone number
        if not to_number:
            skipped_count += 1
            results.append({
                "worker_id": worker_id,
                "worker_name": worker_name,
                "success": False,
                "skipped": True,
                "reason": "No mobile number on file",
            })
            continue
        
        normalized = _normalize_phone(to_number)
        if not normalized:
            skipped_count += 1
            results.append({
                "worker_id": worker_id,
                "worker_name": worker_name,
                "success": False,
                "skipped": True,
                "reason": f"Invalid phone number: {to_number}",
            })
            continue
        
        try:
            sms = client.messages.create(
                body=message_text[:1600],
                from_=from_number,
                to=normalized,
            )
            sent_count += 1
            results.append({
                "worker_id": worker_id,
                "worker_name": worker_name,
                "success": True,
                "message_sid": sms.sid,
                "status": sms.status,
                "to": normalized,
            })
        except Exception as e:
            failed_count += 1
            results.append({
                "worker_id": worker_id,
                "worker_name": worker_name,
                "success": False,
                "error": str(e),
                "to": normalized,
            })
    
    return {
        "success": True,
        "sent": sent_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "total": len(messages),
        "results": results,
    }


def _normalize_phone(phone: str) -> Optional[str]:
    """
    Normalize Indian phone numbers to E.164 format (+91XXXXXXXXXX).
    
    Handles formats:
    - +91XXXXXXXXXX (already E.164)
    - 91XXXXXXXXXX (missing +)
    - 0XXXXXXXXXX (Indian local format with leading 0)
    - XXXXXXXXXX (10-digit without prefix)
    """
    if not phone:
        return None
    
    # Remove all non-digit characters except leading +
    cleaned = phone.strip()
    has_plus = cleaned.startswith("+")
    digits = "".join(c for c in cleaned if c.isdigit())
    
    if not digits:
        return None
    
    # Already in E.164 format
    if has_plus and len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    
    # With 91 prefix but no +
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    
    # 10-digit Indian number (remove leading 0 if present)
    if len(digits) == 10:
        return f"+91{digits}"
    
    # 11-digit with leading 0
    if len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    
    # Invalid
    return None
